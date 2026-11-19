#!/usr/bin/env python3
"""Fill the official Future Health template PPTX with HeatShield content.
Keeps every template slide, title and design element; adds body content only.
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

SRC = "/home/hatch/workspace/heatshield/deck/template/future-health-template.pptx"
OUT = "/home/hatch/workspace/heatshield/deck/heatshield-template-deck.pptx"
INK = RGBColor(0x11, 0x18, 0x27)
ACCENT = RGBColor(0xB9, 0x1C, 0x1C)

prs = Presentation(SRC)

def body(slide_no, lines, size=14):
    """Add a body textbox under the template title. lines: list of (text, bold, size_override)."""
    slide = prs.slides[slide_no - 1]
    box = slide.shapes.add_textbox(Inches(0.5), Inches(1.6), Inches(9.0), Inches(3.5))
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(lines):
        text, bold = item[0], (item[1] if len(item) > 1 else False)
        sz = item[2] if len(item) > 2 else size
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = text
        p.space_after = Pt(6)
        for r in p.runs:
            r.font.size = Pt(sz)
            r.font.bold = bold
            r.font.color.rgb = ACCENT if bold and text.startswith("—") is False and len(item) > 3 else INK
    return slide

def B(t): return (t, True)
def T(t): return (t, False)
def M(t): return (t, False, 12)  # smaller mono-ish line

# --- Slide 1: fill the Team Name / Team Size / Problem Statement box ---
s1 = prs.slides[0]
for sh in s1.shapes:
    if sh.has_text_frame and "Team Name" in sh.text_frame.text:
        tf = sh.text_frame
        tf.word_wrap = True
        tf.text = "Team Name: Kabut Asap"
        p = tf.add_paragraph(); p.text = "Team Size: 1"
        p = tf.add_paragraph(); p.text = ("Problem Statement: Outdoor workers in the Gulf face extreme summer heat, but protection "
            "depends on supervisors manually translating a weather forecast into work, rest and hydration decisions — usually from air "
            "temperature alone, which understates the risk. HeatShield (Challenge 7: Climate-Resilient Worker Health) turns a live forecast "
            "into an auditable WBGT risk tier, a per-crew work/rest/hydration schedule, and bilingual worker alerts — before heat illness, not after it.")
        for para in tf.paragraphs:
            for r in para.runs:
                r.font.size = Pt(15)

# --- Slide 2: team members table ---
s2 = prs.slides[1]
for sh in s2.shapes:
    if sh.has_table:
        tbl = sh.table
        row = ["1", "Nur Arifin Akbar", "Indonesia (based in Italy)", "Solo founder: product, engineering, research", "University of Palermo — PhD researcher", "Confirmed — adult (18+)"]
        for c, val in enumerate(row):
            if c < len(tbl.columns):
                cell = tbl.cell(1, c)
                cell.text = val
                for para in cell.text_frame.paragraphs:
                    for r in para.runs:
                        r.font.size = Pt(10)

# --- Slide 3: Team Capability Summary (max 1,000 chars) ---
cap = ("Solo team. Nur Arifin Akbar is a PhD researcher at the University of Palermo and a Marie Skłodowska-Curie (EnTrust) fellow, "
       "with a KDD 2026 paper on memory-systems benchmarking and the Digital Skills Cup 2025 dual-track win (IT Security and IT Developers) "
       "representing Italy. He works full-stack across research and production software: for this challenge he designed and built the complete "
       "HeatShield system alone — the auditable WBGT engine (Stull 2011, ISO 7243, OSHA/ACGIH), a real-data backtest over 3,720 site-hours, the live "
       "web product, and a narrated demo video — then shipped a v2 with real-time weather inputs, the HeatSafe Companion, a Smart Break Planner and a "
       "Safe-Shift Simulator within days of reviewer feedback. The capability being demonstrated is exactly the pilot's need: one accountable builder "
       "who can take a safety product from published science to a deployed, evidence-backed prototype and iterate it fast with domain feedback.")
assert len(cap) <= 1000, len(cap)
body(3, [T(cap)], size=14)

# --- Slide 4: Architecture / workflow diagram ---
body(4, [
    B("LIVE INPUTS  →  ENGINE  →  DECISIONS  →  PROOF"),
    M("Open-Meteo LIVE forecast API (temp, humidity, wind, solar — free, no key)  +  place search / geolocation / coordinates  +  manual on-site sensor reading"),
    T("        ↓"),
    M("heat.js — auditable, unit-tested engine:  Stull (2011) wet-bulb  →  ISO 7243 WBGT (0.7/0.2/0.1)  →  OSHA/ACGIH work/rest limits by workload × acclimatisation"),
    T("        ↓"),
    M("Supervisor dashboard (risk now, 48h chart, shift schedule, EN/AR alerts)  •  HeatSafe Companion (consent-first, on-device)  •  Smart Break Planner  •  Safe-Shift Simulator"),
    T("        ↓"),
    M("Rest-compliance log (this device only) → one transparent rule: crews missing ≥30% of rests get alerts one tier earlier. No backend, no account, no personal health data leaves the device."),
], size=13)

# --- Slide 5: Target users and intended outcome ---
body(5, [
    B("Target users"),
    T("• Outdoor workers in the Gulf — construction, delivery, agriculture, municipal services — including new/returning migrant workers at highest risk."),
    T("• Site supervisors who must turn a forecast into a defensible work/rest/water decision every day."),
    T("• Employers and regulators who need auditable, standards-based heat protection aligned with the UAE statutory midday break."),
    B("Intended outcome"),
    T("Heat illness prevented, not treated: the right crew gets the right schedule before the shift starts, in their language, matched to their acclimatisation — and rests are provably taken."),
])

# --- Slide 6: How will success be measured? ---
body(6, [
    B("Already measured (prototype stage)"),
    T("• Forecast skill: July 2026 backtest, 3,720 site-hours — forecast WBGT MAE 0.45 °C; tier exact 81.7%, within one tier 99.8%."),
    T("• Engine correctness: unit tests against published Stull (2011) worked examples."),
    B("Pilot success metrics"),
    T("• Rest-compliance rate and alert-to-rest latency per crew (logged in-product)."),
    T("• Heat-illness incidents and near-misses vs the site's previous season."),
    T("• Equity: protection outcomes for unacclimatised vs acclimatised crews."),
    T("• Supervisor task test: time and correctness to produce tomorrow's schedule."),
])

# --- Slide 7: Evidence supporting the approach ---
body(7, [
    T("• Stull, R. (2011). Wet-Bulb Temperature from Relative Humidity and Air Temperature. J. Applied Meteorology and Climatology 50(11) — the engine's wet-bulb formula, unit-tested against its worked examples."),
    T("• ISO 7243 — outdoor WBGT weighting (0.7 wet-bulb / 0.2 globe / 0.1 air) used for the risk estimate."),
    T("• OSHA heat hazard guidance summarising ACGIH TLV / NIOSH criteria — continuous-work WBGT limits per workload and acclimatisation, the basis of the work/rest tiers."),
    T("• Own backtest (BACKTEST.md, reproducible script in repo): all of July 2026, 5 Gulf sites, ERA5 vs archived ECMWF IFS forecasts through the product's own engine — 45% of shift hours were RED/STOP for a moderate acclimatised crew; 81% were STOP for heavy work by unacclimatised crews; every midday hour (465/465) was STOP for that group — the statutory midday break is necessary but not sufficient."),
    T("• Honest bias: forecasts under-predict WBGT slightly (−0.26 °C), hence conservative tier bands and the instrument-override rule."),
])

# --- Slide 8: Data sources and legal right to use them ---
body(8, [
    M("Source | Type | Owner | Sensitivity | Permission / right to use | Personal data?"),
    T("• Open-Meteo forecast & geocoding APIs — live weather — Open-Meteo (public API, free for non-commercial/research use, attribution given in-product) — non-sensitive — public terms — NO personal data."),
    T("• ERA5 reanalysis + archived ECMWF IFS forecasts (via Open-Meteo archive) — backtest only — Copernicus/ECMWF, open data — non-sensitive — open licence — NO."),
    T("• Rest-compliance log + HeatSafe Companion check-ins — crew-level counts and optional self-reported symptoms — the user, on their own device — potentially sensitive — stored ONLY with explicit in-product consent, on-device (localStorage), never transmitted, deletable in one click — YES, only with consent and only on-device."),
    T("No other data is collected. No accounts, no tracking, no server."),
], size=12)

# --- Slide 9: Risks and safeguards ---
body(9, [
    T("• Privacy: no backend and no accounts; worker health check-ins are consent-gated, on-device only, and deletable — data minimisation by architecture, not policy."),
    T("• Estimation risk: WBGT is a planning estimate (±2 °C, dominated by the globe-temperature estimate). Safeguard: an on-site WBGT instrument always overrides HeatShield, stated in the UI."),
    T("• Bias & equity: unacclimatised (often migrant) workers get strictly stricter thresholds by design; no individual profiling or scoring of workers."),
    T("• Explainability: one published formula chain and one transparent adaptation rule — inputs and effects shown to the supervisor; no black box."),
    T("• Misuse / medical boundary: environmental-risk guidance only — not a diagnosis or medical advice; emergency symptoms trigger a STOP + emergency-procedure message."),
    T("• Human oversight & failure modes: supervisors may tighten, never loosen, a schedule; if the forecast API is unreachable, manual sensor input keeps the engine usable."),
], size=12)

# --- Slide 10: Hardware requirements ---
body(10, [
    T("No hardware is required. HeatShield is a browser-only web product: it runs on any phone or computer a supervisor or worker already has — no wearable, sensor purchase, install or account."),
    B("Optional (not required)"),
    T("• An on-site WBGT instrument or basic weather sensor improves ground truth; its reading can be typed into the Manual / on-site sensor input and always overrides the forecast estimate."),
    T("• Sourcing & safety: any such instrument is the site's own standard safety equipment; HeatShield introduces no new hardware, no electrical or wearable safety considerations."),
])

# --- Slide 11: Login / guest access ---
body(11, [
    B("No login is required — full guest access."),
    T("Open https://syaikhipin.github.io/heatshield/ and every feature is available immediately: live forecast for any location, supervisor dashboard, HeatSafe Companion, Smart Break Planner and Safe-Shift Simulator. There are no accounts, credentials or paywalls in the prototype."),
    T("Demo video (1:56, narrated): embedded at the top of the live page. Code & documentation: https://github.com/syaikhipin/heatshield"),
])

# --- Slide 12: Path to pilot and scale ---
body(12, [
    B("Pilot (0–6 months)"),
    T("• One Gulf construction / facilities contractor, 2–3 sites: supervisors use the live planner daily; workers opt into the Companion; success measured on slide 6 metrics."),
    T("• Integrations: WhatsApp Business API alert delivery (alerts are already written for it, EN/AR; Urdu/Hindi/Bengali next); on-site WBGT sensor ingestion for ground-truth validation."),
    B("Scale (6–18 months)"),
    T("• Per-site SaaS for Gulf contractors (indicative €300/site/month); the auditable, dependency-free engine is the procurement-friendly core for safety tooling."),
    T("• Regulatory path: HeatShield is a planning/advisory tool, not a medical device — it supports, and never replaces, statutory duties (e.g. UAE midday break) and site safety officers."),
    T("• Sustainability: near-zero running cost (static hosting, free forecast tier) keeps pricing viable for labour-supply firms, not just tier-1 contractors."),
], size=12)

# --- Slide 13: Pre-existing IP and third-party materials ---
body(13, [
    T("• HeatShield code (engine, product, backtest, video): original work by Nur Arifin Akbar for this challenge, in https://github.com/syaikhipin/heatshield."),
    T("• Scientific methods are published standards, cited, not owned: Stull (2011) formula, ISO 7243 weighting, OSHA/ACGIH limit tables."),
    T("• Weather data: Open-Meteo (free public API, attribution in-product) and Copernicus/ECMWF open archive data for the backtest."),
    T("• No proprietary datasets, no third-party code libraries in the product (dependency-free vanilla JS), no restricted materials. Any future open-source release licence will be stated in the repository."),
], size=12)

# --- Slide 14: Conflict of interest declaration ---
body(14, [
    T("None declared."),
    T("The author has no relationships with the challenge organizers, partners or judges, no financial interest in any vendor named in this submission, and received no third-party funding for this prototype. Open-Meteo, Copernicus/ECMWF and the cited standards bodies are unaffiliated public data/method sources."),
])

# --- Slide 15: Additional slide — v2, built from reviewer feedback ---
body(15, [
    B("What changed after reviewer feedback (19 Nov 2026)"),
    T("• “Mostly simulated dummy data” → real-time weather is now the front door: any-location search, geolocation, coordinates and manual sensor input, with a LIVE badge (place, coordinates, fetch time). The simulated week is archived, collapsed, at the bottom."),
    T("• New modules, named as suggested: HeatSafe Companion (consent-first cooling alerts), Smart Break Planner (safer schedules + crew water totals), Safe-Shift Simulator (what-if start times on the live forecast)."),
    T("• Interactivity & mobile: sticky section nav, tap-to-inspect chart, instant sliders, break countdown, auto-refresh every 10 min, full responsive layout."),
    T("• Live now: https://syaikhipin.github.io/heatshield/ — verified end-to-end in a browser click-through on 19 Nov 2026."),
])

prs.save(OUT)
print("saved", OUT)
