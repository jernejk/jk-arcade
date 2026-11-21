import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { startServer, launchBrowser, root } from './harness.js';

const out = path.resolve(root, '..', 'shots', 'leadlight.webp');
const { browser, skip } = await launchBrowser();
if (skip) {
  console.error(skip);
  process.exit(1);
}
const server = await startServer();
const page = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${server.address().port}/#window-20`);
await page.waitForFunction(() => window.__leadlight);
await page.evaluate(() => localStorage.setItem('leadlight-v1', JSON.stringify({ tipSeen: true })));
const solution = await page.evaluate(() => window.__leadlight.level.solution);
for (const k of solution.slice(0, 10)) {
  const p = await page.evaluate((key) => window.__leadlight.pixelOf(key), k);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(140);
}
await page.waitForTimeout(500);
const next = await page.evaluate((key) => window.__leadlight.pixelOf(key), solution[10]);
await page.mouse.click(next.x, next.y);
await page.waitForTimeout(170);
const png = path.join(mkdtempSync(path.join(tmpdir(), 'leadlight-')), 'shot.png');
await page.screenshot({ path: png });
await browser.close();
server.close();
execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', out]);
console.log(`wrote ${out}`);
