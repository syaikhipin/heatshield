# HeatShield — Climate-Resilient Worker Health

**Future Health Digital Innovation Challenge · Challenge 7: Climate-Resilient Worker Health**
Prototype due 20 Nov 2026. Team: Julio (Nur Arifin Akbar) — scaffold v0.1, 15 Nov 2026.

## For the jury

- **Live product:** https://syaikhipin.github.io/heatshield/ (no login, no install — try the "Simulate peak-summer day" button and the "Jury demo — simulated week" section at the bottom)
- **Demo video (1:56, voiceover):** embedded on the live page, and as a release asset: https://github.com/syaikhipin/heatshield/releases/tag/v0.1
- **Technical documentation, assumptions & limitations:** [SUBMISSION.md](SUBMISSION.md)

Live heat-risk early warning for outdoor workers in the Gulf: it turns a
public weather forecast into an auditable WBGT risk tier, a work/rest/
hydration schedule, and a bilingual worker alert — before heat illness,
not after it.

## Run it

```bash
cd heatshield
python3 -m http.server 8000   # or any static server
# open http://localhost:8000
node test_heat.mjs            # engine tests (no dependencies)
```

No API key, no backend, no account. Forecast data: Open-Meteo (free,
no key). Everything else runs in the browser.

## What it does

1. **Supervisor dashboard** — pick a site (Abu Dhabi Corniche, Mussafah,
   Al Ain, Jebel Ali, Sharjah), workload and crew acclimatisation.
   Shows current WBGT estimate + tier, a 48-hour WBGT chart against the
   continuous-work limit, and tomorrow's 06:00–18:00 shift schedule
   (work/rest per hour, water per worker, action per tier).
2. **Worker alert** — one plain-language message, English / Arabic
   toggle, sized for WhatsApp-style delivery.
3. **Compliance adaptation ("System One")** — supervisors log whether
   each scheduled rest was actually taken (stored only on-device).
   If a crew's recent compliance drops below 70%, alerts fire one tier
   earlier for that crew. One transparent rule, inputs and effect shown
   in the UI — no black box.
4. **Peak-summer simulation button** — November in Abu Dhabi is mild
   (live peak WBGT ≈ 25 °C when scaffolded), so a clearly-labelled
   synthetic 44 °C day demonstrates the amber→black tiers judges need
   to see.

## Files

| File | Purpose |
|---|---|
| `heat.js` | Heat-risk engine: Stull wet-bulb, ISO 7243 WBGT, OSHA-derived work/rest. Pure JS, unit-tested, reusable from Node. |
| `app.js` | Dashboard logic, Open-Meteo client, chart, schedule, EN/AR alerts, compliance log. |
| `index.html` / `styles.css` | UI |
| `test_heat.mjs` | Engine tests against published Stull reference values |
| `SUBMISSION.md` | Hackathon documentation: assumptions, limitations, safety, evaluation plan |

## Roadmap to submission (by 20 Nov)

- [ ] Backtest: pull a July 2026 week from the Open-Meteo archive API,
      report hours per tier per site (evaluation evidence).
- [ ] Deploy as a static site (GitHub Pages `gh-pages`, Julio's usual route).
- [ ] 3-minute demo video: live mild day → summer simulation → schedule
      change → Arabic alert → compliance adaptation triggering.
- [ ] Optional: Urdu / Hindi / Bengali alert strings (large Gulf workforce share).
