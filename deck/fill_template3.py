#!/usr/bin/env python3
"""Visual-first fill of the official Future Health template.
Same 16 template slides/titles/design; body = flowcharts, cards, KPI tiles,
tables and images instead of text walls."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
import qrcode

SRC = "/home/hatch/workspace/heatshield/deck/template/future-health-template.pptx"
OUT = "/home/hatch/workspace/heatshield/deck/heatshield-template-deck.pptx"
QR = "/tmp/heatshield-qr.png"
qrcode.make("https://syaikhipin.github.io/heatshield/").save(QR)

NAVY = RGBColor(0x0F, 0x17, 0x2A); RED = RGBColor(0xB9, 0x1C, 0x1C)
GREEN = RGBColor(0x16, 0x65, 0x2D); GREENL = RGBColor(0xDC, 0xFC, 0xE7)
AMBER = RGBColor(0xD9, 0x77, 0x06); GREY = RGBColor(0xF3, 0xF4, 0xF6)
GREY2 = RGBColor(0xE5, 0xE7, 0xEB); INK = RGBColor(0x11, 0x18, 0x27)
MUT = RGBColor(0x6B, 0x72, 0x80); WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BLUE = RGBColor(0x1D, 0x4E, 0xD8); BLUEL = RGBColor(0xDB, 0xEA, 0xFE)
REDL = RGBColor(0xFE, 0xF2, 0xF2); BEIGE = RGBColor(0xEF, 0xEA, 0xE4)

prs = Presentation(SRC)

def headline(n, text):
    s_ = prs.slides[n - 1]
    b = s_.shapes.add_textbox(Inches(0.5), Inches(1.40), Inches(9.0), Inches(0.5))
    tf = b.text_frame; tf.word_wrap = True
    tf.paragraphs[0].text = text
    for r in tf.paragraphs[0].runs:
        r.font.size = Pt(19); r.font.bold = True; r.font.color.rgb = NAVY

TOP = 2.0

def slide(n): return prs.slides[n - 1]

def shape(s, kind, x, y, w, h, fill=None, line=None):
    sh = s.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None: sh.fill.background()
    else: sh.fill.solid(); sh.fill.fore_color.rgb = fill
    if line is None: sh.line.fill.background()
    else: sh.line.color.rgb = line; sh.line.width = Pt(1)
    sh.text_frame.word_wrap = True
    return sh

def txt(sh, text, size=12, bold=False, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.MIDDLE):
    tf = sh.text_frame; tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = Inches(0.08); tf.margin_right = Inches(0.08)
    tf.margin_top = Inches(0.03); tf.margin_bottom = Inches(0.03)
    lines = text.split("\n")
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = ln; p.alignment = align
        for r in p.runs:
            r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = color
    return sh

def card(s, x, y, w, h, fill=WHITE, line=GREY2):
    return shape(s, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h, fill, line)

def kpi(s, x, y, w, h, big, small, color=RED, fill=GREY):
    c = card(s, x, y, w, h, fill, None)
    tf = c.text_frame; tf.word_wrap = True
    tf.margin_left = Inches(0.08); tf.margin_right = Inches(0.08)
    p = tf.paragraphs[0]; p.text = big; p.alignment = PP_ALIGN.CENTER
    for r in p.runs: r.font.size = Pt(24); r.font.bold = True; r.font.color.rgb = color
    p2 = tf.add_paragraph(); p2.text = small; p2.alignment = PP_ALIGN.CENTER
    for r in p2.runs: r.font.size = Pt(10.5); r.font.color.rgb = MUT
    return c

def arrow_r(s, x, y, w=0.42, h=0.3, color=NAVY):
    return shape(s, MSO_SHAPE.RIGHT_ARROW, x, y, w, h, color, None)

def arrow_d(s, x, y, w=0.3, h=0.32, color=NAVY):
    return shape(s, MSO_SHAPE.DOWN_ARROW, x, y, w, h, color, None)

def note(s, text, y=4.78, size=11):
    b = s.shapes.add_textbox(Inches(0.5), Inches(y), Inches(9.0), Inches(0.35))
    tf = b.text_frame; tf.word_wrap = True
    tf.paragraphs[0].text = text
    for r in tf.paragraphs[0].runs: r.font.size = Pt(size); r.font.color.rgb = MUT; r.font.italic = True

# ---------- 1 Cover ----------
s = slide(1)
s.shapes.add_picture(QR, Inches(8.55), Inches(4.02), Inches(1.0), Inches(1.0))
_cap = s.shapes.add_textbox(Inches(8.35), Inches(5.04), Inches(1.4), Inches(0.3))
_cap.text_frame.paragraphs[0].text = "Try it live"
_cap.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
for _r in _cap.text_frame.paragraphs[0].runs: _r.font.size = Pt(9); _r.font.bold = True
for sh in s.shapes:
    if sh.has_text_frame and "Team Name" in sh.text_frame.text:
        sh.width = Inches(7.9)
        tf = sh.text_frame; tf.word_wrap = True
        tf.text = "Team Name: Kabut Asap"
        p = tf.add_paragraph(); p.text = "Team Size: 1"
        p = tf.add_paragraph(); p.text = ("Problem Statement: Gulf outdoor workers face extreme heat, but protection still depends on a supervisor "
            "manually turning a forecast into work / rest / water decisions — usually from air temperature alone, which understates the risk.")
        p = tf.add_paragraph(); p.text = "HeatShield — live forecast → auditable WBGT decision → safer shifts. Challenge 7: Climate-Resilient Worker Health."
        for para in tf.paragraphs:
            for r in para.runs: r.font.size = Pt(14)

# ---------- 2 Team members (template table) ----------
s = slide(2)
headline(2, "One accountable person, every discipline the pilot needs")
for sh in s.shapes:
    if sh.has_table:
        row = ["1", "Nur Arifin Akbar", "Indonesia (based in Italy)", "Solo founder: product, engineering, research", "University of Palermo — PhD researcher", "Confirmed — adult (18+)"]
        for c, val in enumerate(row):
            if c < len(sh.table.columns):
                cell = sh.table.cell(1, c); cell.text = val
                for para in cell.text_frame.paragraphs:
                    for r in para.runs: r.font.size = Pt(10)

# ---------- 3 Capability: tiles + 2 lines ----------
s = slide(3)
headline(3, "Research depth, production pace")
kpi(s, 0.5, TOP, 2.1, 1.25, "1", "solo builder — research, code, video, deployment", NAVY)
kpi(s, 2.75, TOP, 2.1, 1.25, "KDD 2026", "published paper, memory-systems benchmarking", NAVY)
kpi(s, 5.0, TOP, 2.1, 1.25, "2× winner", "Digital Skills Cup 2025 — IT Security & Developers, for Italy", NAVY)
kpi(s, 7.25, TOP, 2.25, 1.25, "MSCA fellow", "Marie Skłodowska-Curie (EnTrust), Univ. of Palermo", NAVY)
c = card(s, 0.5, 3.35, 9.0, 1.25, GREY, None)
txt(c, "Built HeatShield alone, end to end: auditable WBGT engine → real-data backtest (3,720 site-hours) → live product → narrated demo video.\n"
       "The v2 product adds real-time weather for any place on Earth, the HeatSafe Companion, a Smart Break Planner and a Safe-Shift Simulator. One accountable builder, pilot-ready pace.", 12.5)

# ---------- 4 Architecture FLOWCHART ----------
s = slide(4)
headline(4, "A public forecast in, a provable rest out — no server in between")
# inputs column
ins = [("🌍 Live forecast", "Open-Meteo API\ntemp · humidity · wind · solar"), ("🔎 Any place", "search · geolocation\ncoordinates"), ("🌡️ On-site sensor", "manual reading\ntyped in by supervisor")]
for i, (t1, t2) in enumerate(ins):
    c = card(s, 0.5, TOP + i * 0.92, 2.2, 0.82, BLUEL, None)
    txt(c, f"{t1}\n{t2}", 11, bold=False)
    arrow_r(s, 2.78, TOP + i * 0.92 + 0.26)
# engine
e = card(s, 3.3, TOP + 0.35, 2.2, 1.85, NAVY, None)
txt(e, "⚙️ heat.js ENGINE\n\nStull wet-bulb →\nISO 7243 WBGT →\nOSHA / ACGIH tiers\n\nunit-tested · auditable", 11.5, color=WHITE)
for yy in (TOP + 0.75, TOP + 1.6):
    arrow_r(s, 5.58, yy)
# modules 2x2
mods = [("📊 Supervisor dashboard", "risk now · 48h chart · schedule"), ("🧑‍🏭 HeatSafe Companion", "consent-first · on-device"), ("🗓️ Smart Break Planner", "safer shifts · crew water"), ("🧪 Safe-Shift Simulator", "what-if on live forecast")]
for i, (t1, t2) in enumerate(mods):
    x = 6.1 + (i % 2) * 1.78; y = TOP + (i // 2) * 0.92
    c = card(s, x, y, 1.68, 0.82, GREENL, None)
    txt(c, f"{t1}\n{t2}", 9.5)
# proof bar
arrow_d(s, 4.85, TOP + 2.3)
p = card(s, 0.5, TOP + 2.66, 9.0, 0.55, BEIGE, None)
txt(p, "✅ PROOF: rest-compliance log (this device only) → crews missing ≥30% of rests get alerts one tier earlier.  No backend · no account · no health data leaves the device.", 11, align=PP_ALIGN.CENTER)

# ---------- 5 Target users: 3 cards + outcome ----------
s = slide(5)
headline(5, "Protection that arrives before, during and after the shift")
users = [("🧑‍🏭", "WORKERS", "Construction · delivery\nagriculture · municipal\n\nNew migrant workers\nprotected most — strictest\nthresholds by design", BLUEL),
         ("🧑‍💼", "SUPERVISORS", "A defensible schedule\nin seconds, per crew\n\nEN / AR worker alerts\nready for WhatsApp", GREENL),
         ("🏢", "EMPLOYERS &\nREGULATORS", "Auditable decisions\naligned with the UAE\nstatutory midday break\n\nProof rests happened", REDL)]
for i, (ic, t1, t2, fill) in enumerate(users):
    c = card(s, 0.5 + i * 3.08, TOP, 2.92, 1.95, fill, None)
    txt(c, f"{ic}  {t1}\n\n{t2}", 12)
o = card(s, 0.5, 4.0, 9.0, 0.65, NAVY, None)
txt(o, "🎯 OUTCOME: heat illness prevented, not treated — the right crew gets the right schedule before the shift starts.", 13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

# ---------- 6 Success: KPI tiles + pilot chips ----------
s = slide(6)
headline(6, "Success is a number we already publish")
kpi(s, 0.5, TOP, 2.1, 1.25, "0.45 °C", "forecast WBGT error (MAE), July 2026 backtest", RED)
kpi(s, 2.75, TOP, 2.1, 1.25, "81.7%", "of hours: tier exactly right vs reanalysis", RED)
kpi(s, 5.0, TOP, 2.1, 1.25, "99.8%", "of hours within one tier", RED)
kpi(s, 7.25, TOP, 2.25, 1.25, "465 / 465", "midday hours at STOP for heavy, unacclimatised work", RED)
b = s.shapes.add_textbox(Inches(0.5), Inches(3.3), Inches(9.0), Inches(0.35))
b.text_frame.paragraphs[0].text = "Pilot success will be measured on:"
for r in b.text_frame.paragraphs[0].runs: r.font.size = Pt(13); r.font.bold = True
pilots = ["Rest compliance ↑", "Alert → rest latency ↓", "Heat incidents ↓", "Equity across crews", "Supervisor task time ↓"]
for i, t in enumerate(pilots):
    c = card(s, 0.5 + i * 1.84, 3.75, 1.72, 0.8, GREENL, None)
    txt(c, t, 10.5, bold=True, color=GREEN, align=PP_ALIGN.CENTER)

# ---------- 7 Evidence: source cards + backtest panel ----------
s = slide(7)
headline(7, "Published science first — then our own receipts")
srcs = [("Stull (2011)", "wet-bulb formula\nJ. Appl. Meteorol. Climatol.\nunit-tested vs worked examples"),
        ("ISO 7243", "outdoor WBGT weighting\n0.7 wet-bulb / 0.2 globe / 0.1 air"),
        ("OSHA · ACGIH · NIOSH", "continuous-work WBGT limits\nby workload × acclimatisation")]
for i, (t1, t2) in enumerate(srcs):
    c = card(s, 0.5, TOP + i * 0.9, 3.6, 0.8, GREY, None)
    txt(c, f"{t1}\n{t2}", 10.5)
p = card(s, 4.4, TOP, 5.1, 2.68, NAVY, None)
txt(p, "🔬 OUR BACKTEST — July 2026, 5 Gulf sites, 3,720 site-hours\n\n"
       "45% of shift hours RED / STOP (moderate, acclimatised)\n"
       "81% STOP for heavy work by new crews\n"
       "Forecast bias −0.26 °C → conservative bands +\n"
       "instrument-override rule\n\n"
       "Full method + reproducible script: BACKTEST.md in the repo", 12, color=WHITE)

# ---------- 8 Data sources: real table ----------
s = slide(8)
headline(8, "Every source named, every right stated")
tbl_shape = s.shapes.add_table(5, 4, Inches(0.5), Inches(TOP), Inches(9.0), Inches(2.6))
tbl = tbl_shape.table
widths = [2.6, 2.2, 1.5, 2.7]
for i, w in enumerate(widths): tbl.columns[i].width = Inches(w)
rows = [("Source", "Type", "Personal data?", "Legal right to use"),
        ("Open-Meteo forecast + geocoding", "Live weather API", "NO", "Public API, free use, attribution in-product"),
        ("ERA5 + ECMWF IFS archive", "Backtest data", "NO", "Copernicus / ECMWF open data"),
        ("Companion check-ins + rest log", "On-device only", "YES — consent-gated", "Worker's own device, never transmitted, 1-click delete"),
        ("— nothing else —", "No accounts, no tracking, no server", "—", "—")]
for ri, row in enumerate(rows):
    for ci, val in enumerate(row):
        cell = tbl.cell(ri, ci); cell.text = val
        for para in cell.text_frame.paragraphs:
            for r in para.runs:
                r.font.size = Pt(11 if ri == 0 else 10.5); r.font.bold = (ri == 0)
                r.font.color.rgb = WHITE if ri == 0 else INK
        cell.fill.solid(); cell.fill.fore_color.rgb = NAVY if ri == 0 else (GREY if ri % 2 else WHITE)
note(s, "Sensitivity: weather data is non-sensitive. The only sensitive data class (self-reported symptoms) never leaves the worker's phone.")

# ---------- 9 Risks: risk → safeguard table ----------
s = slide(9)
headline(9, "Every risk has a safeguard you can point to")
tbl_shape = s.shapes.add_table(6, 2, Inches(0.5), Inches(TOP), Inches(9.0), Inches(3.1))
tbl = tbl_shape.table
tbl.columns[0].width = Inches(3.4); tbl.columns[1].width = Inches(5.6)
rows = [("Risk", "Safeguard"),
        ("Privacy of worker health data", "Consent-gated, on-device only, deletable — minimisation by architecture"),
        ("WBGT is an estimate (±2 °C)", "On-site instrument always overrides — stated in the UI"),
        ("Bias against new / migrant workers", "Strictest thresholds for unacclimatised crews; no individual profiling"),
        ("Black-box decisions", "Published formulas + one transparent adaptation rule, shown in-product"),
        ("Misuse as medical advice", "Guidance only, no diagnosis; red-flag symptoms → STOP + emergency procedure")]
for ri, row in enumerate(rows):
    for ci, val in enumerate(row):
        cell = tbl.cell(ri, ci); cell.text = val
        for para in cell.text_frame.paragraphs:
            for r in para.runs:
                r.font.size = Pt(11 if ri == 0 else 10.5); r.font.bold = (ri == 0)
                r.font.color.rgb = WHITE if ri == 0 else INK
        cell.fill.solid(); cell.fill.fore_color.rgb = RED if ri == 0 else (REDL if ci == 0 and ri > 0 else (GREY if ri % 2 else WHITE))

# ---------- 10 Hardware: big zero ----------
s = slide(10)
headline(10, "It runs on the phones already in their pockets")
z = card(s, 0.5, TOP, 3.2, 2.35, GREENL, None)
txt(z, "0", 54, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
z2 = s.shapes.add_textbox(Inches(0.5), Inches(TOP + 1.3), Inches(3.2), Inches(0.6))
z2.text_frame.paragraphs[0].text = "hardware required"
z2.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
for r in z2.text_frame.paragraphs[0].runs: r.font.size = Pt(16); r.font.bold = True; r.font.color.rgb = GREEN
c = card(s, 4.0, TOP, 5.5, 1.2, WHITE)
txt(c, "📱 Runs in the browser on phones and computers sites already have.\nNo wearable · no sensor purchase · no install · no account.", 12.5)
c = card(s, 4.0, TOP + 1.35, 5.5, 1.5, GREY, None)
txt(c, "OPTIONAL — a site's own WBGT instrument improves ground truth.\nIts reading goes into the manual sensor input and always overrides the forecast.\nStandard safety equipment; no new sourcing or safety issues.", 12)

# ---------- 11 Guest access: dark panel + QR ----------
s = slide(11)
headline(11, "Open it. Everything works. No login.")
p = card(s, 0.5, TOP, 6.6, 2.65, NAVY, None)
txt(p, "✅ NO LOGIN — FULL GUEST ACCESS\n\nhttps://syaikhipin.github.io/heatshield/\n\nEvery feature open instantly: live forecast,\ndashboard, Companion, Planner, Simulator.\n🎬 Narrated demo video (1:56) embedded on the page.", 13, color=WHITE)
s.shapes.add_picture(QR, Inches(7.5), Inches(TOP + 0.15), Inches(1.7), Inches(1.7))
cap = s.shapes.add_textbox(Inches(7.3), Inches(TOP + 1.9), Inches(2.1), Inches(0.4))
cap.text_frame.paragraphs[0].text = "Scan to try it live"
cap.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
for r in cap.text_frame.paragraphs[0].runs: r.font.size = Pt(11); r.font.bold = True

# ---------- 12 Roadmap: chevrons ----------
s = slide(12)
headline(12, "A pilot a contractor can start next season")
phases = [("PILOT · 0–6 months", "1 contractor · 2–3 Gulf sites\nsupervisors plan daily, workers\nopt into the Companion", NAVY),
          ("INTEGRATE · 3–9 months", "WhatsApp alert delivery (EN/AR,\nthen Urdu/Hindi/Bengali)\n+ on-site WBGT sensor ingestion", BLUE),
          ("SCALE · 6–18 months", "Per-site SaaS ≈ €300/site/mo\nadvisory tool — supports, never\nreplaces, statutory safety duties", GREEN)]
for i, (t1, t2, col) in enumerate(phases):
    ch = shape(s, MSO_SHAPE.CHEVRON, 0.5 + i * 3.05, TOP, 2.95, 0.75, col, None)
    txt(ch, t1, 12.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    c = card(s, 0.5 + i * 3.05, TOP + 0.95, 2.95, 1.7, GREY, None)
    txt(c, t2, 11)
note(s, "Near-zero running cost (static hosting + free forecast tier) keeps pricing viable for labour-supply firms, not just tier-1 contractors.", 4.45)

# ---------- 13 IP: 4 cards ----------
s = slide(13)
headline(13, "Ours, published, or open — nothing hidden")
ips = [("🧑‍💻 Own code", "Engine, product, backtest\nand video — original work\nby the author for this\nchallenge (GitHub repo)"),
       ("📐 Published standards", "Stull (2011) · ISO 7243\nOSHA / ACGIH limits\ncited methods, not owned"),
       ("🌍 Open data", "Open-Meteo public API\nCopernicus / ECMWF\nopen archive — attributed"),
       ("🚫 Zero lock-in", "Dependency-free vanilla JS\nno proprietary datasets\nno restricted materials")]
for i, (t1, t2) in enumerate(ips):
    c = card(s, 0.5 + i * 2.31, TOP, 2.19, 2.2, GREY if i % 2 == 0 else BLUEL, None)
    txt(c, f"{t1}\n\n{t2}", 11)

# ---------- 14 COI: big none ----------
s = slide(14)
headline(14, "Declared as openly as everything else in this deck")
c = card(s, 0.5, TOP, 9.0, 1.35, GREENL, None)
txt(c, "✅  NONE DECLARED", 26, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
b = s.shapes.add_textbox(Inches(0.5), Inches(3.6), Inches(9.0), Inches(1.2))
tf = b.text_frame; tf.word_wrap = True
tf.paragraphs[0].text = "No relationships with the organizers, partners or judges · no financial interest in any vendor named · no third-party funding for this prototype."
for r in tf.paragraphs[0].runs: r.font.size = Pt(13); r.font.color.rgb = INK
p = tf.add_paragraph(); p.text = "Open-Meteo, Copernicus/ECMWF and the standards bodies cited are unaffiliated public sources."
for r in p.runs: r.font.size = Pt(13); r.font.color.rgb = INK

# ---------- 15 Additional: HeatShield in action (screenshots) ----------
s = slide(15)
headline(15, "HeatShield in action")
CAP = "/home/hatch/workspace/heatshield/video/captures/"
pic = s.shapes.add_picture(CAP + "01-live-viewport.png", Inches(0.5), Inches(TOP), Inches(5.0))
pic.line.color.rgb = GREY2; pic.line.width = Pt(1)
b = s.shapes.add_textbox(Inches(0.5), Inches(TOP + 2.87), Inches(5.55), Inches(0.55))
b.text_frame.paragraphs[0].text = "LIVE DASHBOARD — real forecast, real tier, real schedule (Abu Dhabi)"
for r in b.text_frame.paragraphs[0].runs: r.font.size = Pt(10.5); r.font.bold = True; r.font.color.rgb = NAVY
_p = b.text_frame.add_paragraph(); _p.text = "Live: syaikhipin.github.io/heatshield  ·  Code: github.com/syaikhipin/heatshield"
for r in _p.runs: r.font.size = Pt(10.5); r.font.bold = True; r.font.color.rgb = RED
stack = [("02-sim-schedule.png", "PEAK-SUMMER SCHEDULE — STOP at midday, same engine"),
         ("03-arabic-alert.png", "WORKER ALERT IN ARABIC — one plain sentence")]
for i, (fn, cap) in enumerate(stack):
    y = TOP + i * 1.62
    pic = s.shapes.add_picture(CAP + fn, Inches(6.35), Inches(y), Inches(3.15))
    pic.line.color.rgb = GREY2; pic.line.width = Pt(1)
    b = s.shapes.add_textbox(Inches(6.35), Inches(y + 0.85), Inches(3.15), Inches(0.55))
    b.text_frame.word_wrap = True
    b.text_frame.paragraphs[0].text = cap
    for r in b.text_frame.paragraphs[0].runs: r.font.size = Pt(10); r.font.bold = True; r.font.color.rgb = NAVY
prs.save(OUT)
print("saved", OUT)
