import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launchBrowser } from '../scripts/harness.js';

let server;
let browser;
let skip = false;

before(async () => {
  const launched = await launchBrowser();
  if (launched.skip) {
    skip = launched.skip;
    return;
  }
  browser = launched.browser;
  server = await startServer();
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(hash, viewport = { width: 390, height: 844 }) {
  const page = await browser.newPage({ viewport, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => {
    if (new URL(r.url()).hostname !== '127.0.0.1') errors.push(`off-machine request ${r.url()}`);
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/${hash}`);
  await page.waitForFunction(() => window.__leadlight);
  return { page, errors };
}

const tapKey = async (page, k) => {
  const p = await page.evaluate((key) => window.__leadlight.pixelOf(key), k);
  await page.mouse.click(p.x, p.y);
};

test('home loads with no errors and no sideways scroll on a small phone', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('', { width: 360, height: 640 });
  await page.waitForSelector('#home:not([hidden])');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 360);
  await page.click('#windows-btn');
  await page.waitForSelector('#levels:not([hidden])');
  assert.equal(await page.locator('#level-grid button').count(), 24);
  assert.deepEqual(errors, []);
  await page.close();
});

test('tapping panes clears a window and shows the result', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-3');
  const solution = await page.evaluate(() => window.__leadlight.level.solution);
  const last = solution[solution.length - 1];
  await tapKey(page, last);
  const afterBump = await page.evaluate(() => ({ cracks: window.__leadlight.game.cracks, left: window.__leadlight.game.tiles.size }));
  assert.equal(afterBump.cracks, 1);
  assert.equal(afterBump.left, solution.length);
  for (const k of solution) await tapKey(page, k);
  await page.waitForSelector('#result:not([hidden])', { timeout: 5000 });
  assert.match(await page.textContent('#result-title'), /Window clear/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('leadlight-v1')));
  assert.equal(saved.best[3], 2);
  assert.deepEqual(errors, []);
  await page.close();
});

test('keyboard undo, hint and restart work', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-5');
  const first = await page.evaluate(() => window.__leadlight.level.solution[0]);
  await tapKey(page, first);
  await page.keyboard.press('u');
  assert.equal(await page.evaluate((k) => window.__leadlight.game.tiles.has(k), first), true);
  await page.keyboard.press('h');
  assert.equal(await page.evaluate(() => window.__leadlight.game.hintsUsed), 1);
  await page.keyboard.press('r');
  assert.equal(await page.evaluate(() => window.__leadlight.game.hintsUsed), 0);
  await page.keyboard.press('Escape');
  await page.waitForSelector('#home:not([hidden])');
  assert.deepEqual(errors, []);
  await page.close();
});
