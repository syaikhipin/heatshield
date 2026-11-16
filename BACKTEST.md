# HeatShield — July 2026 backtest (real data)

Run 16 Nov 2026 with `backtest.mjs` (raw API responses cached in
`backtest_data/`, machine-readable results in `backtest-results.json`).
This replaces the simulated jury week with real weather for the
exposure and forecast-skill claims. The simulated demo remains in the
product, labelled as dummy data, to show crew/compliance behaviour.

## Method

- **Period:** 1–31 July 2026, hourly, Asia/Dubai local time —
  744 hours × 5 sites = **3,720 site-hours**.
- **Sites:** the five in the product — Abu Dhabi Corniche, Abu Dhabi
  Mussafah industrial, Al Ain, Dubai Jebel Ali, Sharjah industrial.
- **"Actuals":** Open-Meteo Archive API (ERA5 reanalysis): air
  temperature, relative humidity, wind, shortwave radiation.
- **"Forecasts":** Open-Meteo Historical Forecast API, archived
  ECMWF IFS forecasts (`models=ecmwf_ifs025` pinned — the API's
  default silently returns ERA5-identical values for some grid
  cells; verified during this run, so the default was not used).
  Lead times in the archive are not uniform; treat this as
  short-lead archived forecasts.
- **Engine:** both series are pushed through the product's own
  `heat.js` (Stull 2011 wet-bulb → ISO 7243 WBGT → OSHA/ACGIH
  work/rest tiers). No separate backtest model.
- **Honesty note:** ERA5 and IFS are both ECMWF products. This
  measures *forecast skill against reanalysis*, not error against a
  ground WBGT instrument — that still requires on-site sensors
  (roadmap). The globe-temperature heuristic is common to both
  series, so its error does not appear here either.

## Exposure — what July 2026 actually looked like (ERA5 through the engine)

Peak WBGT by site: Abu Dhabi Corniche **36.2 °C** (19 Jul, 13:00),
Dubai Jebel Ali **36.3 °C**, Sharjah **36.0 °C**, Mussafah **35.9 °C**,
Al Ain **34.3 °C** — the inland site is hottest by air temperature
but *lowest* in WBGT, because humidity dominates the index. Air
temperature alone would have ranked the risk backwards.

Daily WBGT peak fell between 12:00 and 14:00 on **133 of 155
site-days (86%)**.

Shift hours (06:00–18:00, 1,860 site-hours):

| Crew profile | GREEN | AMBER | ORANGE | RED | STOP (BLACK) |
|---|---|---|---|---|---|
| Moderate, acclimatised | 245 | 291 | 480 | 600 | 244 |
| Heavy, unacclimatised | 13 | 27 | 119 | 202 | 1,499 |

- **45%** of shift hours (844/1,860) were RED or STOP even for a
  moderate acclimatised crew.
- **81%** of shift hours (1,499/1,860) were STOP for heavy work by
  unacclimatised (new/returning) crews.
- **Every** 12:00–15:00 hour in July 2026 — **465 of 465** across
  the five sites — was STOP-tier for heavy unacclimatised work. The
  UAE statutory midday break (12:30–15:00) is necessary but nowhere
  near sufficient: the STOP window for the most at-risk crews
  extends across most of the working day, which is exactly the gap
  an hour-by-hour, per-crew schedule fills.

## Forecast skill — archived IFS forecasts vs ERA5, same hours

| Site | WBGT MAE (°C) | WBGT bias (°C) | Air-temp MAE (°C) | Tier exact | Tier within one |
|---|---|---|---|---|---|
| Abu Dhabi — Corniche | 0.50 | −0.34 | 0.59 | 79.3% | 100% |
| Abu Dhabi — Mussafah | 0.25 | −0.06 | 0.34 | 90.6% | 100% |
| Al Ain | 0.25 | −0.06 | 0.37 | 90.9% | 100% |
| Dubai — Jebel Ali | 0.65 | −0.53 | 1.19 | 73.0% | 99.5% |
| Sharjah industrial | 0.62 | −0.32 | 1.56 | 74.9% | 99.7% |
| **Pooled (3,720 h)** | **0.45** | **−0.26** | **0.81** | **81.7%** | **99.8%** |

(Tier = work/rest tier for a moderate acclimatised crew.)

Reading this honestly:

- A forecast-driven schedule would have named the **exact tier in
  ~4 of 5 hours**, and was **never off by more than one tier in
  99.8%** of hours — good enough to plan tomorrow's shift, which is
  the product's actual job.
- Forecasts **under-predict** WBGT slightly (bias −0.26 °C, worst
  −0.53 °C at coastal Jebel Ali). The error is in the unsafe
  direction, which is why HeatShield keeps conservative +2 °C tier
  bands and the rule that an on-site instrument always overrides.
- Forecast error is the *smaller* part of the ±2 °C planning
  uncertainty stated in SUBMISSION.md; the globe-temperature
  estimate remains the larger, unmeasured-here part.
