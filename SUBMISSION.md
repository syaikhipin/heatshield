# HeatShield — Technical documentation, assumptions and limitations

Challenge: Future Health Digital Innovation Challenge, Challenge
Statement 7 — Climate-Resilient Worker Health. Tagline of the
challenge: "From signals to solutions."

## Problem

Outdoor workers in the Gulf (construction, delivery, agriculture,
municipal services) face extreme summer heat. Heat illness is
preventable, but protection depends on a supervisor translating a
weather forecast into work/rest/hydration decisions — a step that is
manual, inconsistent, and usually based on air temperature alone,
which understates risk because it ignores humidity, sun and wind.

## Solution and architecture

Browser-only prototype, no backend:

```
Open-Meteo forecast API (free, no key)
  hourly: air temp, relative humidity, wind, shortwave radiation
        |
        v
heat.js (auditable engine, unit-tested)
  wet-bulb   : Stull (2011) approximation
  globe temp : transparent estimate from solar radiation + wind
  WBGT       : ISO 7243 outdoor weighting 0.7/0.2/0.1
  work/rest  : OSHA/ACGIH continuous-work WBGT limits per workload
               and acclimatisation, with a stated HeatShield rule
               mapping exceedance to 45/15, 30/30, 15/45, STOP
        |
        v
Supervisor dashboard (risk now, 48 h chart, tomorrow's shift schedule)
Worker alert (plain language, English/Arabic)
Compliance log (on-device only) -> one-rule early-alert adaptation
```

## Standards and sources

- Stull, R. (2011). Wet-Bulb Temperature from Relative Humidity and
  Air Temperature. J. Applied Meteorology and Climatology 50(11).
  Valid −20…50 °C, RH 5–99%; engine tests check published worked
  examples (25 °C/40% → ≈16.4 °C; 20 °C/50% → ≈13.7 °C).
- ISO 7243 outdoor WBGT weighting: 0.7·Twb + 0.2·Tg + 0.1·Ta.
- Continuous-work WBGT limits per workload/acclimatisation: OSHA heat
  hazard guidance summarising ACGIH TLV / NIOSH criteria (light 30/28,
  moderate 28/25, heavy 26/23, very heavy 25/21 °C, acclimatised /
  unacclimatised).
- Hydration guidance follows OSHA employer guidance (up to ~1 L/h in
  the highest tiers, electrolytes for long shifts — stated in UI copy
  as supervisor responsibility).

## Assumptions (explicit)

1. Forecast values represent site conditions. Microclimates (rooftops,
   enclosed yards, radiant surfaces) can be hotter.
2. Globe temperature is ESTIMATED from solar radiation and wind with a
   simple, published-in-code heuristic (full sun ≈ +18 °C over air,
   wind cooling capped at 4 °C). It is not a black-globe measurement.
3. Workload categories and acclimatisation are supervisor-selected
   buckets, not individual physiological assessment. No personal or
   health data is collected; the only stored data is an on-device
   crew-level rest-compliance log.
4. The exceedance→work/rest mapping (+2 °C bands) is HeatShield's own
   operational rule derived from the continuous-work limits; it is
   labelled as such and is more conservative than continuous work, by
   design.

## Limitations and safety boundaries

- **Planning tool, not a measurement device.** An on-site WBGT
  instrument reading always overrides HeatShield. Uncertainty in the
  estimated WBGT is roughly ±2 °C, dominated by the globe-temperature
  estimate and forecast error.
- **Not medical advice and not a diagnosis.** HeatShield communicates
  environmental risk and standard protective actions only. It does not
  assess any individual's fitness or symptoms.
- **Human oversight:** schedules and alerts are advisory to a named
  supervisor, who can and should tighten (never loosen) them.
  Emergency symptoms follow site emergency procedure, stated in the UI.
- **Equity:** unacclimatised (new/returning, often migrant) workers get
  strictly more protective thresholds; alerts are bilingual EN/AR at
  scaffold stage, with Urdu/Hindi/Bengali on the roadmap.

## Evaluation

1. Engine correctness: unit tests vs published Stull values (done,
   `test_heat.mjs`).
2. **Backtest (done 16 Nov 2026, full report in `BACKTEST.md`,
   script `backtest.mjs`):** all of July 2026, hourly, 5 sites —
   3,720 site-hours of ERA5 reanalysis run through the product's
   own engine. Peak WBGT 34.3–36.3 °C by site (humid coast highest,
   dry inland Al Ain lowest — air temperature alone ranks the risk
   backwards). 45% of shift hours (06:00–18:00) were RED or STOP
   for a moderate acclimatised crew; 81% were STOP for heavy work
   by unacclimatised crews; every 12:00–15:00 hour (465/465) was
   STOP-tier for heavy unacclimatised work — the statutory midday
   break is necessary but not sufficient.
3. **Forecast skill (same backtest):** archived ECMWF IFS forecasts
   vs ERA5 for the same hours — WBGT mean absolute error
   **0.45 °C**, bias **−0.26 °C** (forecasts slightly
   under-predict; the unsafe direction, hence the conservative
   tier bands and instrument-override rule); work/rest tier exact
   in 81.7% of hours, within one tier in 99.8%. Forecast error is
   the smaller part of the ±2 °C planning uncertainty above; the
   globe-temperature estimate is the larger part and is not
   measured by this comparison (both weather products are ECMWF;
   ground-instrument validation is future work).
4. Usability: supervisor task test (produce tomorrow's schedule for a
   heavy unacclimatised crew) — time and correctness. (Not yet run.)
5. Intended pilot metrics (post-challenge): rest compliance rate,
   alert-to-rest latency, heat-illness incidents, equity across crew
   categories.

## Commercial / deployment path

Per-site SaaS for construction and facilities contractors in the Gulf;
the engine is dependency-free and auditable, which is the procurement
requirement in safety tooling. Runs on any static host today; a
WhatsApp Business API sender and on-site WBGT sensor ingestion are the
first paid-tier integrations.
