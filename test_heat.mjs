import assert from "node:assert";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const H = require("./heat.js");

// Stull (2011) reference values (published worked examples)
assert.ok(Math.abs(H.wetBulbStull(25, 40) - 16.38) < 0.3, `25C/40% -> ${H.wetBulbStull(25, 40)}`);
assert.ok(Math.abs(H.wetBulbStull(20, 50) - 13.70) < 0.3, `20C/50% -> ${H.wetBulbStull(20, 50)}`);
// Saturation: wet bulb approaches air temperature at RH=99%
assert.ok(Math.abs(H.wetBulbStull(35, 99) - 35) < 1.5);

// WBGT sanity: hot humid sunny Abu Dhabi afternoon must exceed a mild morning
const mild = H.wbgtOutdoor(30, 45, 200, 12);
const brutal = H.wbgtOutdoor(44, 55, 950, 6);
assert.ok(brutal.wbgt > mild.wbgt + 5, `${mild.wbgt} vs ${brutal.wbgt}`);
assert.ok(brutal.tg > 44, "globe temp must exceed air temp in full sun");

// Work/rest monotonicity + stop tier
const tiers = [24, 27, 29, 31, 33, 36].map((w) => H.workRest(w, "moderate", true).workMin);
assert.ok(tiers.every((v, i) => i === 0 || v <= tiers[i - 1]), `non-monotonic: ${tiers}`);
assert.equal(H.workRest(40, "heavy", false).tier, "black");
assert.equal(H.workRest(20, "light", true).tier, "green");
// Unacclimatised workers always get >= protection of acclimatised
for (const w of [22, 26, 28, 30, 32]) {
  assert.ok(H.workRest(w, "moderate", false).workMin <= H.workRest(w, "moderate", true).workMin);
}

// Shift schedule covers 06:00-17:00 only
const sched = H.buildShiftSchedule(
  Array.from({ length: 24 }, (_, hour) => ({ hour, wbgt: 29, workload: "moderate", acclimatised: true }))
);
assert.equal(sched.length, 12);
assert.equal(sched[0].hour, 6);

console.log("All HeatShield engine tests passed.");
console.log("Example — Abu Dhabi 44C, 55% RH, full sun:", JSON.stringify(H.wbgtOutdoor(44, 55, 950, 6)));
