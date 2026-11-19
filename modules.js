// HeatShield v2 modules — HeatSafe Companion, Smart Break Planner, Safe-Shift Simulator.
// All three run on the LIVE forecast loaded by app.js (window.HeatShieldApp).
// Companion data: consent-gated, localStorage on this device only, deletable.
const $$ = (id) => document.getElementById(id);
const COMP_KEY = "heatsafe_companion_v1";

function liveHoursForTomorrow() {
  const data = window.HeatShieldApp ? window.HeatShieldApp.getData() : [];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return data.filter((d) => d.time.getDate() === tomorrow.getDate());
}
function assessWith(wbgt, workload, accl) { return HeatEngine.workRest(wbgt, workload, accl); }

// ---------- HeatSafe Companion ----------
function companionAlert() {
  const consent = $$("cConsent").checked;
  const days = parseInt($$("cDays").value || "0", 10);
  const water = parseFloat($$("cWater").value || "0");
  const breakIn = parseInt($$("cBreak").value || "0", 10);
  const syms = [...document.querySelectorAll(".cSym:checked")].map((x) => x.value);
  const data = window.HeatShieldApp.getData();
  if (!data.length) { $$("companionBody").textContent = "Load a live forecast first — your companion alert is calculated from live WBGT."; return; }
  const idx = Math.max(0, data.findIndex((d) => d.time > new Date()) - 1);
  const cur = data[idx];
  const accl = days >= 7;
  const { workload } = window.HeatShieldApp.currentSettings();
  const a = assessWith(cur.wbgt, workload, accl);
  let html;
  if (syms.includes("redflag")) {
    html = `<span class="tier t-black">STOP NOW</span><p><b>Emergency sign reported.</b> Stop work, move to shade/cool, tell your supervisor immediately and follow the site emergency procedure — call emergency services if symptoms continue. Do not wait for a scheduled break.</p>`;
  } else if (syms.length >= 2 || a.tier === "red" || a.tier === "black") {
    html = `<span class="tier t-${a.tier}">${a.tier.toUpperCase()}</span><p><b>Cool down now.</b> Live WBGT ${cur.wbgt.toFixed(1)}°C. Take your shade rest now (${a.restMin} min), drink water, and tell your buddy and supervisor how you feel${syms.length ? ` — you reported: ${syms.join(", ")}` : ""}. Do not start a new heavy task this hour.</p>`;
  } else {
    html = `<span class="tier t-${a.tier}">${a.tier.toUpperCase()}</span><p>Live WBGT ${cur.wbgt.toFixed(1)}°C for your crew type (${accl ? "acclimatised" : "new/returning — stricter limits applied"}). Next break in <b>${breakIn} min</b> — work ${a.workMin} / rest ${a.restMin} per hour. Drink about <b>${a.waterLph} L per hour</b>; you've logged ${water} L today. Watch your buddy.</p>`;
  }
  if (!accl) html += `<p class="muted">You are in your first week — HeatShield applies the stricter unacclimatised thresholds to you by design.</p>`;
  $$("companionBody").innerHTML = html;
  if (consent) {
    const prev = JSON.parse(localStorage.getItem(COMP_KEY) || "[]");
    prev.push({ t: new Date().toISOString(), days, water, breakIn, syms, wbgt: +cur.wbgt.toFixed(1), tier: a.tier });
    localStorage.setItem(COMP_KEY, JSON.stringify(prev.slice(-50)));
    $$("companionBody").innerHTML += `<p class="muted">Saved on this device only (consent given). ${prev.length + 0} check-in(s) stored — “Delete my data” removes them all.</p>`;
  } else {
    $$("companionBody").innerHTML += `<p class="muted">Not saved — you did not give consent, so this check-in was calculated and discarded.</p>`;
  }
}

// ---------- Smart Break Planner ----------
function planBreaks() {
  const hours = liveHoursForTomorrow();
  if (!hours.length) { $$("plannerBody").textContent = "No live forecast loaded yet."; return; }
  const start = parseInt($$("pStart").value, 10), end = parseInt($$("pEnd").value, 10);
  const crew = Math.max(1, parseInt($$("pCrew").value || "1", 10));
  const { workload, accl } = window.HeatShieldApp.currentSettings();
  const rows = hours.filter((d) => d.time.getHours() >= start && d.time.getHours() < end)
    .map((d) => ({ d, a: assessWith(d.wbgt, workload, accl) }));
  if (!rows.length) { $$("plannerBody").textContent = "No forecast hours in that shift window for tomorrow."; return; }
  const totalWater = rows.reduce((s, r) => s + r.a.waterLph, 0) * crew;
  const workMin = rows.reduce((s, r) => s + r.a.workMin, 0), restMin = rows.reduce((s, r) => s + r.a.restMin, 0);
  const coolest = [...rows].sort((x, y) => x.d.wbgt - y.d.wbgt).slice(0, 3).map((r) => String(r.d.time.getHours()).padStart(2, "0") + ":00");
  const stopH = rows.filter((r) => r.a.tier === "black").length;
  $$("plannerBody").innerHTML =
    `<div class="kpis"><div class="kpi"><div class="big">${totalWater.toFixed(0)} L</div><div class="muted">water needed for the whole crew (${crew} workers)</div></div>` +
    `<div class="kpi"><div class="big">${workMin} min</div><div class="muted">productive work in shift</div></div>` +
    `<div class="kpi"><div class="big">${restMin} min</div><div class="muted">shade rest in shift</div></div>` +
    `<div class="kpi"><div class="big">${stopH}</div><div class="muted">STOP hours in shift</div></div></div>` +
    `<p><b>Move heavy tasks to the coolest hours:</b> ${coolest.join(", ")} (lowest live-forecast WBGT). Keep the statutory midday break and tighten — never loosen — this plan on site.</p>` +
    `<div class="tablewrap"><table><thead><tr><th>Hour</th><th>WBGT °C</th><th>Tier</th><th>Work / Rest</th><th>Water / worker</th><th>Guidance</th></tr></thead><tbody>` +
    rows.map((r) => `<tr><td>${String(r.d.time.getHours()).padStart(2, "0")}:00</td><td>${r.d.wbgt.toFixed(1)}</td><td><span class="tier t-${r.a.tier}">${r.a.tier}</span></td><td>${r.a.workMin} / ${r.a.restMin}</td><td>${r.a.waterLph} L/h</td><td>${r.a.action}</td></tr>`).join("") +
    `</tbody></table></div>`;
}

// ---------- Safe-Shift Simulator (on live forecast) ----------
function simulateShift(startHour, len, delta) {
  const data = window.HeatShieldApp.getData();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const { workload, accl } = window.HeatShieldApp.currentSettings();
  const rows = data.filter((d) => d.time.getDate() === tomorrow.getDate() && d.time.getHours() >= startHour && d.time.getHours() < startHour + len)
    .map((d) => {
      const r = delta ? HeatEngine.wbgtOutdoor(d.temp + delta, d.rh, d.solar, d.wind) : { wbgt: d.wbgt };
      return { wbgt: r.wbgt, a: assessWith(r.wbgt, workload, accl) };
    });
  return {
    hours: rows.length,
    stop: rows.filter((r) => r.a.tier === "black").length,
    redPlus: rows.filter((r) => r.a.tier === "red" || r.a.tier === "black").length,
    workMin: rows.reduce((s, r) => s + r.a.workMin, 0),
    water: rows.reduce((s, r) => s + r.a.waterLph, 0),
    peak: rows.length ? Math.max(...rows.map((r) => r.wbgt)) : 0,
  };
}
function compareShifts() {
  if (!window.HeatShieldApp.getData().length) { $$("simBody").textContent = "No live forecast loaded yet."; return; }
  const len = parseInt($$("sLen").value, 10), delta = parseFloat($$("sDelta").value);
  const A = simulateShift(parseInt($$("sStartA").value, 10), len, delta);
  const B = simulateShift(parseInt($$("sStartB").value, 10), len, delta);
  const safer = A.stop !== B.stop ? (A.stop < B.stop ? "A" : "B") : A.workMin !== B.workMin ? (A.workMin > B.workMin ? "A" : "B") : "tie";
  const row = (label, x) => `<tr><td><b>${label}</b></td><td>${x.stop}</td><td>${x.redPlus}</td><td>${x.workMin} min</td><td>${x.water.toFixed(1)} L</td><td>${x.peak.toFixed(1)}°C</td></tr>`;
  $$("simBody").innerHTML =
    `<p>Tomorrow, live forecast${delta ? ` + ${delta.toFixed(1)}°C hotter` : ""}, ${len}h shifts: <b>${safer === "tie" ? "both options are equivalent on STOP hours and productive minutes" : `Option ${safer} is safer / more productive`}</b> on the measures below.</p>` +
    `<div class="tablewrap"><table><thead><tr><th>Option</th><th>STOP hours</th><th>RED+ hours</th><th>Productive work</th><th>Water / worker</th><th>Peak WBGT</th></tr></thead><tbody>` +
    row(`A — start ${$$("sStartA").value}:00`, A) + row(`B — start ${$$("sStartB").value}:00`, B) +
    `</tbody></table></div><p class="muted">Simulation layered on real forecast values — change the location above and the comparison changes with the live weather.</p>`;
}

// ---------- Interactivity: instant recompute, sliders, countdown, nav ----------
function manualAssess() { const b = $$("manualBtn"); if (b) b.click(); }
[["mTemp", "mTempR"], ["mRh", "mRhR"], ["mWind", "mWindR"], ["mSolar", "mSolarR"]].forEach(([num, range]) => {
  const n = $$(num), r = $$(range);
  if (!n || !r) return;
  r.addEventListener("input", () => { n.value = r.value; manualAssess(); });
  n.addEventListener("input", () => { r.value = n.value; manualAssess(); });
});
["pStart", "pEnd", "pCrew"].forEach((id) => { const el = $$(id); if (el) el.addEventListener("change", planBreaks); });
["sStartA", "sStartB", "sLen", "sDelta"].forEach((id) => { const el = $$(id); if (el) el.addEventListener("change", compareShifts); });
let timerInt = null;
$$("cTimerBtn").onclick = () => {
  if (timerInt) { clearInterval(timerInt); timerInt = null; $$("timerBody").textContent = "Countdown stopped."; return; }
  let secs = Math.max(0, parseInt($$("cBreak").value || "30", 10)) * 60;
  $$("timerBody").innerHTML = `⏱️ Break in <b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}</b> — keep drinking water. Tap again to stop.`;
  timerInt = setInterval(() => {
    secs -= 1;
    if (secs <= 0) { clearInterval(timerInt); timerInt = null; $$("timerBody").innerHTML = `<span class="tier t-amber">BREAK TIME</span> Move to shade now, rest and drink — your next work block starts after your scheduled rest.`; return; }
    $$("timerBody").innerHTML = `⏱️ Break in <b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}</b> — keep drinking water. Tap again to stop.`;
  }, 1000);
};
// Sticky nav: highlight the section in view.
const navTabs = [...document.querySelectorAll("#tabNav .tab")];
const obs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) navTabs.forEach((t) => t.classList.toggle("active", t.getAttribute("href") === "#" + en.target.id));
  });
}, { rootMargin: "-30% 0px -60% 0px" });
["liveCard", "nowCard", "companionCard", "plannerCard", "simCard"].forEach((id) => { const el = $$(id); if (el) obs.observe(el); });

$$("cCheckBtn").onclick = companionAlert;
$$("cDeleteBtn").onclick = () => { localStorage.removeItem(COMP_KEY); $$("companionBody").textContent = "All companion check-ins deleted from this device."; };
$$("planBtn").onclick = planBreaks;
$$("simBtn").onclick = compareShifts;
$$("sDelta").oninput = () => { $$("sDeltaVal").textContent = "+" + parseFloat($$("sDelta").value).toFixed(1) + "°C"; };

window.HeatModules = { onLiveData: () => { /* planner/simulator read live data on demand */ } };
