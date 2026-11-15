// Capture HeatShield dashboard states with Playwright (cached Chromium headless shell).
//
// NOTE (egress): this VM's Chromium cannot open a CONNECT tunnel through the
// egress proxy (ERR_TUNNEL_CONNECTION_FAILED for every external https page,
// verified with two Chromium builds). So the dashboard is served from the
// identical local source in ~/workspace/heatshield/ (same code as the live
// GitHub Pages deployment) and the Open-Meteo request is fulfilled with a
// REAL forecast payload fetched seconds earlier via Node (which can use the
// proxy). All numbers on screen are therefore real live forecast values.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const ROOT = '/home/hatch/workspace/heatshield';
const OUT = new URL('./captures/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

// --- fetch the real forecast the page would request (default site: Abu Dhabi Corniche)
const apiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=24.4539&longitude=54.3773&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation&forecast_days=3&timezone=Asia%2FDubai';
const forecast = await (await fetch(apiUrl)).json();
fs.writeFileSync(OUT + 'forecast-used.json', JSON.stringify({ fetchedAt: new Date().toISOString(), apiUrl, forecast }, null, 2));
console.log('forecast fetched, hours:', forecast.hourly.time.length);

// --- tiny static server for the dashboard source
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.md':'text/plain' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(8937, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0,300)));
await page.route('**api.open-meteo.com**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(forecast) }));

await page.goto('http://127.0.0.1:8937/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => document.getElementById('status')?.textContent.includes('Live forecast loaded'), null, { timeout: 15000 });
await page.waitForTimeout(1000);

async function shot(name, opts={}) { await page.screenshot({ path: OUT + name, fullPage: !!opts.fullPage }); console.log('shot', name); }
async function clip(name, el) {
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({ path: OUT + name });
  const box = await el.boundingBox();
  console.log('clip', name, box ? Math.round(box.width) : '?', box ? Math.round(box.height) : '?');
}

// (a) Live
await shot('01-live-full.png', { fullPage: true });
await page.screenshot({ path: OUT + '01-live-viewport.png' });
let nowCard = await page.$('#nowCard'); if (nowCard) await clip('01-live-nowcard.png', nowCard);
console.log('LIVE nowBody:', await page.$eval('#nowBody', e => e.innerText));
console.log('LIVE status:', await page.$eval('#status', e => e.innerText));

// (b) Simulate peak-summer
await page.click('#simulate');
await page.waitForTimeout(900);
await shot('02-sim-full.png', { fullPage: true });
await page.screenshot({ path: OUT + '02-sim-viewport.png' });
console.log('SIM nowBody:', await page.$eval('#nowBody', e => e.innerText));
console.log('SIM alert:', await page.$eval('#alertBody', e => e.innerText));
const sched = await page.$('#schedTable'); if (sched) await clip('02-sim-schedule.png', sched);
const chart = await page.$('#chart'); if (chart) await clip('02-sim-chart.png', chart);
const schedText = await page.$eval('#schedTable tbody', e => e.innerText);
console.log('SCHEDULE:\n' + schedText);
fs.writeFileSync(OUT + 'captured-text.txt', [
  'LIVE nowBody: ' + await page.$eval('#nowBody', e => e.innerText), '',
].join('\n'));

// (c) Arabic toggle (still in sim state)
await page.click('#langToggle');
await page.waitForTimeout(500);
console.log('AR alert:', await page.$eval('#alertBody', e => e.innerText));
let cards = await page.$$('.grid .card');
if (cards[1]) await clip('03-arabic-alert.png', cards[1]);
await shot('03-arabic-full.png', { fullPage: true });
await page.click('#langToggle');
await page.waitForTimeout(400);

// (d) Compliance: 2 ack + 5 missed = 7 events, 28.6% (<70%, >=4 events) -> earlyShift ON
for (let i=0;i<2;i++){ await page.click('#ackBtn'); await page.waitForTimeout(220); }
for (let i=0;i<5;i++){ await page.click('#missBtn'); await page.waitForTimeout(220); }
await page.waitForTimeout(500);
console.log('COMPLIANCE:', await page.$eval('#complianceBody', e => e.innerText));
console.log('COMPLIANCE nowBody:', await page.$eval('#nowBody', e => e.innerText));
cards = await page.$$('.grid .card');
if (cards[1]) await clip('04-compliance-alert.png', cards[1]);
nowCard = await page.$('#nowCard'); if (nowCard) await clip('04-compliance-nowcard.png', nowCard);
await shot('04-compliance-full.png', { fullPage: true });

await browser.close();
server.close();
console.log('DONE');
