/**
 * HeatShield heat-risk engine.
 *
 * Standards basis (see SUBMISSION.md for full citations):
 *  - Wet-bulb temperature: Stull (2011) empirical approximation,
 *    J. Applied Meteorology and Climatology 50(11):2267-2269.
 *    Valid for T in [-20, 50] C and RH in [5, 99] %.
 *  - Outdoor WBGT (ISO 7243): WBGT = 0.7*Twb + 0.2*Tg + 0.1*Ta
 *  - Continuous-work WBGT limits (OSHA heat hazard guidance, summarising
 *    ACGIH TLV / NIOSH criteria), converted from F:
 *      workload      acclimatised   unacclimatised
 *      light             30.0 C         28.0 C
 *      moderate          28.0 C         25.0 C
 *      heavy             26.0 C         23.0 C
 *      very_heavy        25.0 C         21.0 C
 *
 * IMPORTANT: Tg (globe temperature) here is an ESTIMATE from solar
 * radiation and wind, not a black-globe measurement. HeatShield is a
 * planning / early-warning tool. An on-site WBGT instrument reading
 * always overrides this estimate. See SUBMISSION.md "Limitations".
 */

function wetBulbStull(tempC, rhPct) {
  const T = tempC;
  const RH = Math.min(99, Math.max(5, rhPct));
  return (
    T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
    Math.atan(T + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035
  );
}

/**
 * Globe-temperature estimate. Transparent heuristic, deliberately simple
 * and labelled as an estimate everywhere it is shown:
 * full midday sun (~1000 W/m2) can raise a black globe ~15 C above air
 * temperature; wind cools the globe. Clamped to [+0, +18] C above air.
 */
function globeTempEstimate(tempC, solarWm2, windKmh) {
  const solarGain = Math.min(18, Math.max(0, (solarWm2 || 0) / 1000) * 18);
  const windCooling = Math.min(4, Math.max(0, (windKmh || 0) / 3.6) * 0.5);
  return tempC + Math.max(0, solarGain - windCooling);
}

function wbgtOutdoor(tempC, rhPct, solarWm2, windKmh) {
  const twb = wetBulbStull(tempC, rhPct);
  const tg = globeTempEstimate(tempC, solarWm2, windKmh);
  const wbgt = 0.7 * twb + 0.2 * tg + 0.1 * tempC;
  return { wbgt, twb, tg };
}

const CONTINUOUS_LIMIT_C = {
  light:      { accl: 30.0, unaccl: 28.0 },
  moderate:   { accl: 28.0, unaccl: 25.0 },
  heavy:      { accl: 26.0, unaccl: 23.0 },
  very_heavy: { accl: 25.0, unaccl: 21.0 },
};

/**
 * HeatShield operational work/rest rule, derived from the continuous-work
 * limits above (this derivation is ours and is stated as such):
 *   wbgt <= limit          continuous work, normal hydration
 *   limit < wbgt <= +2     45 min work / 15 min rest per hour
 *   +2   < wbgt <= +4      30 / 30
 *   +4   < wbgt <= +6      15 / 45
 *   wbgt > limit + 6       STOP outdoor work in this category
 */
function workRest(wbgt, workload, acclimatised) {
  const lim = CONTINUOUS_LIMIT_C[workload][acclimatised ? "accl" : "unaccl"];
  const over = wbgt - lim;
  if (over <= 0)
    return { tier: "green", workMin: 60, restMin: 0, waterLph: 0.5, action: "Normal work. Routine hydration and buddy checks." };
  if (over <= 2)
    return { tier: "amber", workMin: 45, restMin: 15, waterLph: 0.75, action: "45/15 work-rest. Shade rest, supervisor check each cycle." };
  if (over <= 4)
    return { tier: "orange", workMin: 30, restMin: 30, waterLph: 1.0, action: "30/30 work-rest. Only acclimatised workers on heavy tasks." };
  if (over <= 6)
    return { tier: "red", workMin: 15, restMin: 45, waterLph: 1.0, action: "15/45 work-rest. Reschedule heavy tasks, active supervision." };
  return { tier: "black", workMin: 0, restMin: 60, waterLph: 1.0, action: "STOP outdoor work in this category until WBGT falls." };
}

/** Generate an 06:00-18:00 shift schedule from hourly WBGT forecasts. */
function buildShiftSchedule(hourly) {
  // hourly: [{hour, wbgt, workload, acclimatised}]
  return hourly
    .filter((h) => h.hour >= 6 && h.hour < 18)
    .map((h) => ({ hour: h.hour, wbgt: h.wbgt, ...workRest(h.wbgt, h.workload, h.acclimatised) }));
}

const api = { wetBulbStull, globeTempEstimate, wbgtOutdoor, workRest, buildShiftSchedule, CONTINUOUS_LIMIT_C };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof window !== "undefined") window.HeatEngine = api;
