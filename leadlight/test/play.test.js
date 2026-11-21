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

const PLAYED = { unlocked: 24, tipSeen: true, seen: { keystone: true, pair: true, weighted: true } };

async function open(hash, { viewport = { width: 390, height: 844 }, progress = PLAYED } = {}) {
  const page = await browser.newPage({ viewport, hasTouch: true });
  if (progress) {
    await page.addInitScript((data) => {
      if (!localStorage.getItem('leadlight-v1')) localStorage.setItem('leadlight-v1', data);
    }, JSON.stringify(progress));
  }
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
  const { page, errors } = await open('', { viewport: { width: 360, height: 640 }, progress: null });
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

test('leaving during the win cascade never shows the result card over the menu', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-3');
  const solution = await page.evaluate(() => window.__leadlight.level.solution);
  for (const k of solution) await tapKey(page, k);
  assert.equal(await page.evaluate(() => window.__leadlight.game.status), 'won');
  await page.click('#menu-btn');
  await page.waitForTimeout(2600);
  assert.equal(await page.isHidden('#result'), true);
  assert.equal(await page.isVisible('#home'), true);
  await page.click('#windows-btn');
  await page.waitForTimeout(2600);
  assert.equal(await page.isHidden('#result'), true);
  assert.deepEqual(errors, []);
  await page.close();
});

test('a deep link to a locked window opens the windows grid instead', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-20', { progress: null });
  await page.waitForSelector('#levels:not([hidden])');
  assert.equal(await page.isHidden('#hud'), true);
  assert.equal(await page.evaluate(() => window.__leadlight.game), null);
  assert.equal(await page.locator('#level-grid li.current').count(), 1);
  assert.equal(new URL(page.url()).hash, '');
  await page.evaluate(() => { location.hash = '#trail-3'; });
  await page.waitForFunction(() => window.__leadlight.level?.id === 'trail-3');
  assert.deepEqual(errors, []);
  await page.close();
});

test('the sound button in the top bar mutes and M toggles it back', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-2');
  await page.click('#mute-btn');
  assert.equal(await page.getAttribute('#mute-btn', 'aria-pressed'), 'false');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('leadlight-v1')).muted), true);
  await page.keyboard.press('m');
  assert.equal(await page.getAttribute('#mute-btn', 'aria-pressed'), 'true');
  assert.deepEqual(errors, []);
  await page.close();
});

test('a keystone tapped too early bumps in the page too', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-19');
  const target = await page.evaluate(() => {
    const { game } = window.__leadlight;
    return [...game.tiles.entries()].find(([, tile]) => tile.keystone && [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].some(([dq, dr]) => game.tiles.has(`${tile.q + dq},${tile.r + dr}`)))[0];
  });
  await tapKey(page, target);
  const state = await page.evaluate((k) => ({ has: window.__leadlight.game.tiles.has(k), cracks: window.__leadlight.game.cracks }), target);
  assert.deepEqual(state, { has: true, cracks: 1 });
  assert.match(await page.textContent('#toast'), /Keystone/);
  assert.deepEqual(errors, []);
  await page.close();
});

test('a rule tip hides behind the menu and comes back with the game, then closes after the first move', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-4', { progress: { unlocked: 24, tipSeen: true, seen: {} } });
  assert.equal(await page.isVisible('#tip'), true);
  await page.click('#menu-btn');
  await page.waitForSelector('#home:not([hidden])');
  assert.equal(await page.isHidden('#tip'), true);
  await page.click('#windows-btn');
  assert.equal(await page.isHidden('#tip'), true);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#hud:not([hidden])');
  assert.equal(await page.isVisible('#tip'), true);
  const first = await page.evaluate(() => window.__leadlight.level.solution[0]);
  await tapKey(page, first);
  assert.equal(await page.isHidden('#tip'), true);
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('leadlight-v1')))).seen.keystone, true);
  assert.deepEqual(errors, []);
  await page.close();
});

test('the header stays on one line at 360px', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-23', { viewport: { width: 360, height: 640 } });
  const heights = await page.evaluate(() => {
    const k = document.getElementById('level-kicker').getBoundingClientRect().height;
    const n = document.getElementById('level-name').getBoundingClientRect().height;
    return { k, n };
  });
  assert.ok(heights.k < 20, `kicker wraps (${heights.k}px)`);
  assert.ok(heights.n < 30, `name wraps (${heights.n}px)`);
  assert.ok((await page.evaluate(() => window.__leadlight.paneSize())) >= 34);
  assert.deepEqual(errors, []);
  await page.close();
});

test('a rule tip on a dense window closes on the first move and the board grows back', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-23', { viewport: { width: 360, height: 640 }, progress: { unlocked: 24, tipSeen: true, seen: { keystone: true, pair: true } } });
  assert.equal(await page.isVisible('#tip'), true);
  assert.ok((await page.evaluate(() => window.__leadlight.paneSize())) >= 36, 'board shrank too far for the tip');
  assert.match(await page.textContent('#tip'), /Weighted panes/);
  const first = await page.evaluate(() => window.__leadlight.level.solution[0]);
  await tapKey(page, first);
  await page.waitForTimeout(100);
  assert.equal(await page.isHidden('#tip'), true);
  assert.equal(await page.evaluate(() => window.__leadlight.game.history.length), 1);
  assert.ok((await page.evaluate(() => window.__leadlight.paneSize())) >= 37);
  assert.deepEqual(errors, []);
  await page.close();
});

test('a weighted pane slides and parks in the page, and undo slides it back', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-14');
  const plan = await page.evaluate(() => {
    const { game } = window.__leadlight;
    const w = [...game.tiles.entries()].find(([, t]) => t.weighted)[0];
    return { w, sol: window.__leadlight.level.solution };
  });
  const before = await page.evaluate(() => window.__leadlight.game.tiles.size);
  let k;
  for (k of plan.sol) {
    const tile = await page.evaluate((key) => window.__leadlight.game.tiles.get(key), k);
    if (tile?.weighted) break;
    await tapKey(page, k);
  }
  const removed = before - (await page.evaluate(() => window.__leadlight.game.tiles.size));
  await tapKey(page, k);
  const after = await page.evaluate((key) => ({ there: window.__leadlight.game.tiles.has(key), size: window.__leadlight.game.tiles.size, last: window.__leadlight.game.history.at(-1) }), k);
  assert.equal(after.there, false);
  assert.equal(after.size, before - removed);
  assert.equal(after.last.kind, 'slide');
  await page.keyboard.press('u');
  assert.equal(await page.evaluate((key) => window.__leadlight.game.tiles.get(key)?.weighted, k), true);
  assert.deepEqual(errors, []);
  await page.close();
});

test('a tip open at the moment of losing hides behind the loss card', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-4', { progress: { unlocked: 24, tipSeen: true, seen: {} } });
  assert.equal(await page.isVisible('#tip'), true);
  const held = await page.evaluate(() => {
    const { game } = window.__leadlight;
    return [...game.tiles.entries()].find(([, tile]) => tile.keystone && [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].some(([dq, dr]) => game.tiles.has(`${tile.q + dq},${tile.r + dr}`)))[0];
  });
  for (let i = 0; i < 3; i++) await tapKey(page, held);
  assert.equal(await page.evaluate(() => window.__leadlight.game.status), 'lost');
  await page.waitForSelector('#result:not([hidden])', { timeout: 4000 });
  assert.equal(await page.isHidden('#tip'), true);
  assert.match(await page.textContent('#result-text'), /^Too many bumps/);
  assert.deepEqual(errors, []);
  await page.close();
});

test('skipping ahead shows every new rule in one tip', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-20', { progress: { unlocked: 24, tipSeen: true, seen: {} } });
  const text = await page.textContent('#tip');
  for (const rule of [/Keystones/, /Leaded pairs/, /Weighted panes/]) assert.match(text, rule);
  await page.click('#tip-ok');
  const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('leadlight-v1')).seen);
  assert.deepEqual(seen, { keystone: true, pair: true, weighted: true });
  assert.deepEqual(errors, []);
  await page.close();
});

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
  test(`tapping the tip text at ${viewport.width}px closes it and never reaches a pane`, async (t) => {
    if (skip) return t.skip(skip);
    const { page, errors } = await open('#window-23', { viewport, progress: { unlocked: 24, tipSeen: true, seen: {} } });
    const box = await page.locator('#tip-text').boundingBox();
    const before = await page.evaluate(() => window.__leadlight.game.tiles.size);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const state = await page.evaluate(() => ({ cracks: window.__leadlight.game.cracks, size: window.__leadlight.game.tiles.size, moves: window.__leadlight.game.history.length }));
    assert.deepEqual(state, { cracks: 0, size: before, moves: 0 });
    assert.equal(await page.isHidden('#tip'), true);
    assert.ok((await page.evaluate(() => window.__leadlight.paneSize())) >= 37);
    assert.deepEqual(errors, []);
    await page.close();
  });
}
