// HeatShield dashboard — live Open-Meteo forecast -> WBGT engine -> actions.
// No API key, no backend, no personal data. Compliance log stays in
// localStorage on this device only.
const $ = (id) => document.getElementById(id);
let hourlyData = []; // {time:Date, temp, rh, wind, solar, wbgt, twb, tg}
let lang = "en";

// --- System One (compliance adaptation) ---------------------------------
// A deliberately tiny, auditable decision rule — not a black box:
// if a crew's logged rest compliance over the last 14 events is < 70%,
// alerts for that crew fire one tier earlier (threshold shifted -1.5 C).
// The rule, its inputs and its effect are all shown to the supervisor.
function compliance() {
  const log = JSON.parse(localStorage.getItem("heatshield_compliance") || "[]");
  const recent = log.slice(-14);
  const rate = recent.length ? recent.filter((e) => e.ok).length / recent.length : null;
  return { log, rate, earlyShift: rate !== null && recent.length >= 4 && rate < 0.7 };
}
function logCompliance(ok) {
  const { log } = compliance();
  log.push({ t: new Date().toISOString(), ok });
  localStorage.setItem("heatshield_compliance", JSON.stringify(log.slice(-100)));
  render();
}

let livePlace = "Abu Dhabi — Corniche / city";
async function loadForecast(latIn, lonIn, label) {
  let lat, lon;
  if (latIn !== undefined && lonIn !== undefined) { lat = latIn; lon = lonIn; if (label) livePlace = label; }
  else { [lat, lon] = $("site").value.split(","); livePlace = $("site").selectedOptions[0].textContent; }
  $("status").textContent = "Fetching LIVE forecast from Open-Meteo…";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation&forecast_days=3&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo " + res.status);
  const j = await res.json();
  const h = j.hourly;
  hourlyData = h.time.map((t, i) => {
    const r = HeatEngine.wbgtOutdoor(h.temperature_2m[i], h.relative_humidity_2m[i], h.shortwave_radiation[i], h.wind_speed_10m[i]);
    return { time: new Date(t + (j.timezone_abbreviation ? "" : "")), temp: h.temperature_2m[i], rh: h.relative_humidity_2m[i], wind: h.wind_speed_10m[i], solar: h.shortwave_radiation[i], ...r };
  });
  const fetched = new Date();
  $("status").textContent = `LIVE forecast loaded (${hourlyData.length} hours) for ${livePlace}.`;
  const badge = $("liveBadge"); if (badge) badge.textContent = `● LIVE — ${livePlace} · fetched ${fetched.toLocaleTimeString()} · real-time Open-Meteo data`;
  const meta = $("liveMeta"); if (meta) meta.innerHTML = `Source: <b>Open-Meteo live forecast API</b> (no key) · Location: <b>${livePlace}</b> (${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}) · Timezone: ${j.timezone} · Fetched: ${fetched.toLocaleString()} · ${hourlyData.length} hourly values (temp, humidity, wind, solar) run through the WBGT engine below.`;
  render();
  if (window.HeatModules) window.HeatModules.onLiveData();
}
window.HeatShieldApp = { getData: () => hourlyData, getPlace: () => livePlace, loadForecast, assessCurrent: () => hourlyData.length ? assess(hourlyData[Math.max(0, hourlyData.findIndex((d) => d.time > new Date()) - 1)]) : null, currentSettings };

function currentSettings() {
  return { workload: $("workload").value, accl: $("accl").value === "true" };
}
function assess(d) {
  const { workload, accl } = currentSettings();
  const { earlyShift } = compliance();
  return HeatEngine.workRest(d.wbgt + (earlyShift ? 1.5 : 0), workload, accl);
}

function render() {
  if (!hourlyData.length) return;
  const now = new Date();
  const idx = Math.max(0, hourlyData.findIndex((d) => d.time > now) - 1);
  const cur = hourlyData[idx];
  const a = assess(cur);
  const c = compliance();

  $("nowBody").innerHTML =
    `<span class="big">${cur.wbgt.toFixed(1)}°C</span> WBGT est. &nbsp;<span class="tier t-${a.tier}">${a.tier.toUpperCase()}</span>` +
    `<p>Air ${cur.temp.toFixed(1)}°C · Humidity ${cur.rh}% · Wet-bulb ${cur.twb.toFixed(1)}°C · Globe est. ${cur.tg.toFixed(1)}°C · Wind ${cur.wind} km/h · Solar ${cur.solar} W/m²</p>` +
    `<p><b>${a.workMin} min work / ${a.restMin} min rest</b> per hour · Water ${a.waterLph} L/h per worker</p><p>${a.action}</p>` +
    (c.earlyShift ? `<p>⚠️ Compliance adaptation active: this crew missed ≥30% of recent rests, so alerts fire one tier earlier.</p>` : "");

  const msgs = {
    en: a.tier === "black" ? `🛑 STOP outdoor work now. WBGT ${cur.wbgt.toFixed(1)}°C. Move to shade, drink water, supervisor to confirm all workers are resting.` :
        `Heat alert: WBGT ${cur.wbgt.toFixed(1)}°C. Work ${a.workMin} minutes, rest ${a.restMin} minutes in shade each hour. Drink ${a.waterLph} litres of water per hour. Watch your buddy.`,
    ar: a.tier === "black" ? `🛑 أوقف العمل في الخارج الآن. مؤشر الحرارة ${cur.wbgt.toFixed(1)}°. انتقل إلى الظل، اشرب الماء، وعلى المشرف التأكد من راحة جميع العمال.` :
        `تنبيه حراري: مؤشر الحرارة ${cur.wbgt.toFixed(1)}°. اعمل ${a.workMin} دقيقة واسترح ${a.restMin} دقيقة في الظل كل ساعة. اشرب ${a.waterLph} لتر ماء في الساعة. راقب زميلك.`,
  };
  $("alertBody").innerHTML = `<span dir="${lang === "ar" ? "rtl" : "ltr"}">${msgs[lang]}</span>`;

  $("complianceBody").textContent = c.rate === null ? "No compliance events logged yet on this device." :
    `Rest compliance (last ${Math.min(14, c.log.length)} events): ${(c.rate * 100).toFixed(0)}%${c.earlyShift ? " — early-alert adaptation ON" : ""}`;

  drawChart(hourlyData.slice(0, 48));
  buildSchedule();
}

function drawChart(data) {
  const cv = $("chart"), ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  const max = Math.max(38, ...data.map((d) => d.wbgt)) + 2, min = 15;
  const X = (i) => (i / (data.length - 1)) * (cv.width - 50) + 40;
  const Y = (v) => cv.height - 30 - ((v - min) / (max - min)) * (cv.height - 50);
  const { workload, accl } = currentSettings();
  const lim = HeatEngine.CONTINUOUS_LIMIT_C[workload][accl ? "accl" : "unaccl"];
  ctx.strokeStyle = "#dc2626"; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(40, Y(lim)); ctx.lineTo(cv.width - 10, Y(lim)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#dc2626"; ctx.fillText(`continuous-work limit ${lim}°C`, 44, Y(lim) - 6);
  ctx.strokeStyle = "#111827"; ctx.lineWidth = 2; ctx.beginPath();
  data.forEach((d, i) => i ? ctx.lineTo(X(i), Y(d.wbgt)) : ctx.moveTo(X(i), Y(d.wbgt)));
  ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = "#374151";
  data.forEach((d, i) => { if (i % 6 === 0) ctx.fillText(`${String(d.time.getHours()).padStart(2, "0")}:00`, X(i) - 12, cv.height - 10); });
  ctx.fillText("WBGT °C", 4, 16);
}

function buildSchedule() {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const rows = hourlyData
    .filter((d) => d.time.getDate() === tomorrow.getDate() && d.time.getHours() >= 6 && d.time.getHours() < 18)
    .map((d) => {
      const a = assess(d);
      return `<tr><td>${String(d.time.getHours()).padStart(2, "0")}:00</td><td>${d.wbgt.toFixed(1)}</td><td><span class="tier t-${a.tier}">${a.tier}</span></td><td>${a.workMin} / ${a.restMin}</td><td>${a.waterLph} L/h</td><td>${a.action}</td></tr>`;
    });
  document.querySelector("#schedTable tbody").innerHTML = rows.join("") || `<tr><td colspan="6">No data — load a forecast first.</td></tr>`;
}

// Peak-summer simulation: November demos are mild in Abu Dhabi, so judges
// need to see the system under the conditions it exists for. Synthetic
// diurnal curve peaking at 44 C / 60% RH / full sun — clearly labelled.
function simulateSummerDay() {
  hourlyData = [];
  const base = new Date(); base.setMinutes(0, 0, 0);
  for (let k = 0; k < 48; k++) {
    const t = new Date(base.getTime() + k * 3600e3);
    const hr = t.getHours();
    const diurnal = Math.sin(((hr - 6) / 24) * 2 * Math.PI); // peak ~midday
    const temp = 36 + 8 * Math.max(0, diurnal);
    const rh = 62 - 18 * Math.max(0, diurnal);
    const solar = Math.max(0, 980 * Math.sin(((hr - 6) / 12) * Math.PI)) * (hr >= 6 && hr <= 18 ? 1 : 0);
    const wind = 8 + 4 * Math.max(0, diurnal);
    const r = HeatEngine.wbgtOutdoor(temp, rh, solar, wind);
    hourlyData.push({ time: t, temp, rh, wind, solar, ...r });
  }
  $("status").textContent = "SCENARIO: synthetic peak-summer day (44°C peak) — not live weather. Reload the live forecast to return to real-time data.";
  const badge = $("liveBadge"); if (badge) badge.textContent = "● SCENARIO MODE — peak-summer simulation (press “Reload live forecast” for real-time data)";
  render();
  if (window.HeatModules) window.HeatModules.onLiveData();
}
// --- Real-time input handlers: search, coordinates, geolocation, manual ---
$("coordBtn").onclick = () => {
  const lat = parseFloat($("latIn").value), lon = parseFloat($("lonIn").value);
  if (isNaN(lat) || isNaN(lon)) { $("status").textContent = "Enter valid latitude and longitude first."; return; }
  loadForecast(lat, lon, `Custom coordinates ${lat.toFixed(4)}, ${lon.toFixed(4)}`).catch((e) => { $("status").textContent = "Failed: " + e.message; });
};
$("geoBtn").onclick = () => {
  if (!navigator.geolocation) { $("status").textContent = "Geolocation is not available in this browser."; return; }
  $("status").textContent = "Requesting your location (browser permission)…";
  navigator.geolocation.getCurrentPosition(
    (p) => loadForecast(p.coords.latitude, p.coords.longitude, "My location").catch((e) => { $("status").textContent = "Failed: " + e.message; }),
    (e) => { $("status").textContent = "Location not shared: " + e.message; },
    { timeout: 10000 }
  );
};
$("searchBtn").onclick = async () => {
  const q = $("placeSearch").value.trim();
  if (!q) return;
  $("searchResults").textContent = "Searching Open-Meteo geocoding…";
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
    const j = await r.json();
    if (!j.results || !j.results.length) { $("searchResults").textContent = `No place found for “${q}”.`; return; }
    $("searchResults").innerHTML = j.results.map((x, i) => `<button type="button" class="placeBtn" data-lat="${x.latitude}" data-lon="${x.longitude}" data-name="${x.name}, ${x.country || ""}">${x.name} — ${x.admin1 || ""} ${x.country || ""} (${x.latitude.toFixed(2)}, ${x.longitude.toFixed(2)})</button>`).join(" ");
    document.querySelectorAll(".placeBtn").forEach((b) => b.onclick = () => loadForecast(parseFloat(b.dataset.lat), parseFloat(b.dataset.lon), b.dataset.name).catch((e) => { $("status").textContent = "Failed: " + e.message; }));
  } catch (e) { $("searchResults").textContent = "Search failed: " + e.message; }
};
$("manualBtn").onclick = () => {
  const temp = parseFloat($("mTemp").value), rh = parseFloat($("mRh").value), wind = parseFloat($("mWind").value), solar = parseFloat($("mSolar").value);
  const r = HeatEngine.wbgtOutdoor(temp, rh, solar, wind);
  const { workload, accl } = currentSettings();
  const a = HeatEngine.workRest(r.wbgt, workload, accl);
  $("manualBody").innerHTML = `<span class="big">${r.wbgt.toFixed(1)}°C</span> WBGT from <b>your reading</b> (air ${temp}°C, RH ${rh}%, wind ${wind} km/h, solar ${solar} W/m²) &nbsp;<span class="tier t-${a.tier}">${a.tier.toUpperCase()}</span><p><b>${a.workMin} min work / ${a.restMin} min rest</b> per hour · Water ${a.waterLph} L/h per worker — ${a.action}</p>`;
};
$("simulate").onclick = simulateSummerDay;
function renderDemo() {
  const w = HeatDemo.generateDemoWeek(HeatEngine);
  const k = w.kpis;
  const kpi = (label, val) => `<div class="kpi"><div class="big">${val}</div><div class="muted">${label}</div></div>`;
  $("demoBody").innerHTML =
    `<div class="kpis">${kpi("worker-days protected (simulated)", k.workerDays)}${kpi("peak WBGT °C (simulated week)", k.peakWbgt.toFixed(1))}${kpi("crew-hours at RED or STOP tier", k.totalRedOrWorse)}${kpi("alerts issued (simulated)", k.alertsIssued)}${kpi("average rest compliance", (k.avgCompliance * 100).toFixed(0) + "%")}</div>` +
    `<table><thead><tr><th>Crew</th><th>Site</th><th>Workers</th><th>Workload</th><th>Crew type</th><th>STOP hours</th><th>Rest compliance</th><th>Status</th></tr></thead><tbody>` +
    w.crews.map((c) => `<tr><td><b>${c.id}</b></td><td>${c.site}</td><td>${c.workers}</td><td>${c.workload}</td><td>${c.acclimatised ? "Acclimatised" : "New / returning"}</td><td>${c.stopHours}</td><td>${(c.compliance * 100).toFixed(0)}% (${c.restsTaken}/${c.restEvents})</td><td>${c.compliance < 0.7 ? '<span class="tier t-red">Early-alert adaptation ON</span>' : '<span class="tier t-green">Normal</span>'}</td></tr>`).join("") +
    `</tbody></table>` +
    `<h3>Week timeline (simulated)</h3><ul>` + w.timeline.map((t) => `<li><b>${t.when}</b> — ${t.what}</li>`).join("") + `</ul>` +
    `<p class="muted">Reading this honestly: in a peak Gulf week the engine flags many midday hours as STOP for heavy categories. That aligns with the UAE's statutory midday break (12:30–15:00, mid-June to mid-September) — HeatShield's value is making the call hour-by-hour, per crew and workload, before the day starts, and proving rests happened.</p>`;
}
$("demoBtn").onclick = renderDemo;
$("refresh").onclick = () => loadForecast().catch((e) => { $("status").textContent = "Failed: " + e.message; });
$("site").onchange = () => loadForecast().catch(() => {});
$("workload").onchange = render; $("accl").onchange = render;
$("langToggle").onclick = () => { lang = lang === "en" ? "ar" : "en"; render(); };
$("ackBtn").onclick = () => logCompliance(true);
$("missBtn").onclick = () => logCompliance(false);
loadForecast().catch((e) => { $("status").textContent = "Failed: " + e.message; });
