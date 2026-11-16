/**
 * HeatShield July-2026 backtest.
 *
 * Data (Open-Meteo, no key):
 *  - "Actuals":  Archive API (ERA5 reanalysis)          archive-api.open-meteo.com
 *  - "Forecast": Historical Forecast API (archived       historical-forecast-api.open-meteo.com
 *                ECMWF IFS forecasts, models=ecmwf_ifs025 pinned —
 *                the API default silently returns ERA5-identical
 *                values for some grid cells, verified 2026-11-16)
 * Both series are run through the SAME engine as the live product
 * (heat.js: Stull wet-bulb -> ISO 7243 WBGT -> work/rest tiers).
 *
 * Period: 1-31 July 2026, hourly, timezone Asia/Dubai (local site time).
 * Raw API responses are cached under backtest_data/ for reproducibility.
 *
 * Run: node backtest.mjs
 */
import { createRequire } from "node:module";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const Heat = require("./heat.js");

const SITES = [
  { name: "Abu Dhabi — Corniche / city", lat: 24.4539, lon: 54.3773 },
  { name: "Abu Dhabi — Mussafah industrial", lat: 24.2992, lon: 54.6973 },
  { name: "Al Ain", lat: 24.2075, lon: 55.7447 },
  { name: "Dubai — Jebel Ali", lat: 25.2048, lon: 55.2708 },
  { name: "Sharjah industrial", lat: 25.3463, lon: 55.4209 },
];
const START = "2026-07-01", END = "2026-07-31";
const VARS = "temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation";
const DATA_DIR = new URL("./backtest_data/", import.meta.url);
mkdirSync(DATA_DIR, { recursive: true });

async function fetchJson(url, cacheFile) {
  const path = new URL(cacheFile, DATA_DIR);
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const json = await res.json();
  writeFileSync(path, JSON.stringify(json));
  return json;
}

function toSeries(json) {
  const h = json.hourly;
  return h.time.map((t, i) => {
    const r = Heat.wbgtOutdoor(h.temperature_2m[i], h.relative_humidity_2m[i], h.shortwave_radiation[i], h.wind_speed_10m[i]);
    return {
      time: t, hour: Number(t.slice(11, 13)),
      temp: h.temperature_2m[i], rh: h.relative_humidity_2m[i],
      wind: h.wind_speed_10m[i], solar: h.shortwave_radiation[i],
      wbgt: r.wbgt,
    };
  });
}

const TIERS = ["green", "amber", "orange", "red", "black"];
const tierOf = (wbgt, workload, accl) => Heat.workRest(wbgt, workload, accl).tier;
const emptyTierCounts = () => Object.fromEntries(TIERS.map((t) => [t, 0]));

function summariseSite(site, actual, forecast) {
  const n = Math.min(actual.length, forecast.length);
  let mae = 0, bias = 0, tempMae = 0;
  const tiersModAccl = emptyTierCounts();       // actuals, all hours
  const tiersModAcclShift = emptyTierCounts();  // actuals, 06:00-18:00 only
  const tiersHeavyUnacclShift = emptyTierCounts();
  let exactAgree = 0, withinOne = 0, compared = 0;
  let middayStopHeavyUnaccl = 0, middayHours = 0; // 12:00-15:00 window (statutory break 12:30-15:00)
  let peak = -Infinity, peakTime = null;
  const peakHourHist = {};
  // daily peaks for peak-timing stat
  const byDay = {};
  for (let i = 0; i < n; i++) {
    const a = actual[i], f = forecast[i];
    if (a.wbgt > peak) { peak = a.wbgt; peakTime = a.time; }
    const day = a.time.slice(0, 10);
    if (!byDay[day] || a.wbgt > byDay[day].wbgt) byDay[day] = a;
    const tA = tierOf(a.wbgt, "moderate", true);
    tiersModAccl[tA]++;
    if (a.hour >= 6 && a.hour < 18) {
      tiersModAcclShift[tA]++;
      tiersHeavyUnacclShift[tierOf(a.wbgt, "heavy", false)]++;
    }
    if (a.hour >= 12 && a.hour < 15) {
      middayHours++;
      if (tierOf(a.wbgt, "heavy", false) === "black") middayStopHeavyUnaccl++;
    }
    if (f && f.time === a.time && Number.isFinite(f.wbgt)) {
      mae += Math.abs(f.wbgt - a.wbgt);
      bias += f.wbgt - a.wbgt;
      tempMae += Math.abs(f.temp - a.temp);
      const tF = tierOf(f.wbgt, "moderate", true);
      const d = Math.abs(TIERS.indexOf(tF) - TIERS.indexOf(tA));
      if (d === 0) exactAgree++;
      if (d <= 1) withinOne++;
      compared++;
    }
  }
  for (const d of Object.values(byDay)) peakHourHist[d.hour] = (peakHourHist[d.hour] || 0) + 1;
  return {
    site: site.name, hours: n,
    peakWbgt: +peak.toFixed(1), peakTime,
    tiersModAccl, tiersModAcclShift, tiersHeavyUnacclShift,
    middayStopHeavyUnaccl, middayHours,
    wbgtMae: +(mae / compared).toFixed(2), wbgtBias: +(bias / compared).toFixed(2),
    tempMae: +(tempMae / compared).toFixed(2),
    tierExactPct: +(100 * exactAgree / compared).toFixed(1),
    tierWithinOnePct: +(100 * withinOne / compared).toFixed(1),
    compared, peakHourHist,
  };
}

const results = [];
for (const site of SITES) {
  const slug = site.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const base = `latitude=${site.lat}&longitude=${site.lon}&start_date=${START}&end_date=${END}&hourly=${VARS}&timezone=Asia%2FDubai`;
  const arch = await fetchJson(`https://archive-api.open-meteo.com/v1/archive?${base}`, `${slug}-archive.json`);
  const fcst = await fetchJson(`https://historical-forecast-api.open-meteo.com/v1/forecast?${base}&models=ecmwf_ifs025`, `${slug}-forecast-ifs.json`);
  results.push(summariseSite(site, toSeries(arch), toSeries(fcst)));
  console.error(`done: ${site.name}`);
}

// Pooled forecast-skill numbers (weighted by compared hours)
const pooled = { compared: 0, mae: 0, bias: 0, tempMae: 0, exact: 0, withinOne: 0 };
for (const r of results) {
  pooled.compared += r.compared;
  pooled.mae += r.wbgtMae * r.compared;
  pooled.bias += r.wbgtBias * r.compared;
  pooled.tempMae += r.tempMae * r.compared;
  pooled.exact += (r.tierExactPct / 100) * r.compared;
  pooled.withinOne += (r.tierWithinOnePct / 100) * r.compared;
}
const pooledSummary = {
  hoursCompared: pooled.compared,
  wbgtMae: +(pooled.mae / pooled.compared).toFixed(2),
  wbgtBias: +(pooled.bias / pooled.compared).toFixed(2),
  tempMae: +(pooled.tempMae / pooled.compared).toFixed(2),
  tierExactPct: +(100 * pooled.exact / pooled.compared).toFixed(1),
  tierWithinOnePct: +(100 * pooled.withinOne / pooled.compared).toFixed(1),
};

const out = { period: `${START}..${END}`, timezone: "Asia/Dubai", sites: results, pooled: pooledSummary };
writeFileSync(new URL("./backtest-results.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
