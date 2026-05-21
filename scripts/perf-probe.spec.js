const { test } = require('@playwright/test');
const { chromium } = require('playwright');

test('measure in-game performance', async () => {
  test.setTimeout(90000);
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
  page.on('console', msg => console.log(`BROWSER_${msg.type().toUpperCase()} ${msg.text()}`));
  page.on('pageerror', err => console.log(`BROWSER_PAGEERROR ${err.message}`));

  await page.goto(process.env.PERF_URL || 'http://127.0.0.1:3001/Terra-Divina/', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(1000);

  await page.evaluate(() => document.querySelector('#btn-new-world')?.click());
  await page.waitForFunction(() => !document.getElementById('setup-screen')?.classList.contains('hidden'), null, { timeout: 10000 });
  await page.evaluate(() => document.querySelector('#btn-start-game')?.click());
  await page.waitForFunction(() => document.getElementById('main-menu')?.classList.contains('hidden'), null, { timeout: 10000 });
  await page.locator('#tool-dock').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#perf-monitor').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => !document.querySelector('#perf-monitor')?.textContent?.includes('Profiling startet'), null, { timeout: 10000 });
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    window.__perfProbe = {
      frames: [],
      startedAt: performance.now(),
      lastAt: performance.now(),
      running: true,
    };
    const tick = (now) => {
      const probe = window.__perfProbe;
      if (!probe?.running) return;
      probe.frames.push(now - probe.lastAt);
      probe.lastAt = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.waitForTimeout(7000);

  const result = await page.evaluate(() => {
    const probe = window.__perfProbe;
    probe.running = false;
    const frames = probe.frames.slice(2);
    const sorted = [...frames].sort((a, b) => a - b);
    const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
    const avg = frames.reduce((sum, value) => sum + value, 0) / Math.max(1, frames.length);
    const over18 = frames.filter(value => value > 18).length;
    const over25 = frames.filter(value => value > 25).length;
    const over33 = frames.filter(value => value > 33).length;

    return {
      browserFrames: frames.length,
      rafFps: 1000 / avg,
      frameAvgMs: avg,
      frameP95Ms: percentile(0.95),
      frameP99Ms: percentile(0.99),
      frameMaxMs: Math.max(...frames),
      framesOver18Ms: over18,
      framesOver25Ms: over25,
      framesOver33Ms: over33,
      overlayText: document.querySelector('#perf-monitor')?.innerText ?? '',
    };
  });

  console.log('PERF_RESULT ' + JSON.stringify(result));
  await browser.close();
});
