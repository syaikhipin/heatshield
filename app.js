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

async function loadForecast() {
  const [lat, lon] = $("site").value.split(",");
  $("status").textContent = "Fetching live forecast from Open-Meteo…";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation&forecast_days=3&timezone=Asia%2FDubai`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo " + res.status);
  const j = await res.json();
  const h = j.hourly;
  hourlyData = h.time.map((t, i) => {
    const r = HeatEngine.wbgtOutdoor(h.temperature_2m[i], h.relative_humidity_2m[i], h.shortwave_radiation[i], h.wind_speed_10m[i]);
    return { time: new Date(t), temp: h.temperature_2m[i], rh: h.relative_humidity_2m[i], wind: h.wind_speed_10m[i], solar: h.shortwave_radiation[i], ...r };
  });
  $("status").textContent = `Live forecast loaded (${hourlyData.length} hours, Open-Meteo, Asia/Dubai).`;
  render();
}

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
  $("status").textContent = "SIMULATION: synthetic peak-summer day (44°C peak) — not live weather.";
  render();
}
$("simulate").onclick = simulateSummerDay;
$("refresh").onclick = () => loadForecast().catch((e) => { $("status").textContent = "Failed: " + e.message; });
$("site").onchange = () => loadForecast().catch(() => {});
$("workload").onchange = render; $("accl").onchange = render;
$("langToggle").onclick = () => { lang = lang === "en" ? "ar" : "en"; render(); };
$("ackBtn").onclick = () => logCompliance(true);
$("missBtn").onclick = () => logCompliance(false);
loadForecast().catch((e) => { $("status").textContent = "Failed: " + e.message; });
