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

async function open(hash, { viewport = { width: 390, height: 844 }, progress = PLAYED, isMobile = false } = {}) {
  const page = await browser.newPage({ viewport, hasTouch: true, isMobile });
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
  assert.equal(await page.getByRole('list', { name: 'Windows' }).getByRole('button').count(), 24);
  assert.equal(await page.locator('#windows-title:focus').count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Window 2, locked' }).isDisabled(), true);
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
  const result = page.getByRole('dialog', { name: 'Window clear' });
  assert.equal(await result.isVisible(), true);
  assert.match(await result.ariaSnapshot(), /2 of 3 gems/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('leadlight-v1')));
  assert.equal(saved.best[3], 2);
  await page.click('#result-menu');
  await page.keyboard.press('Escape');
  assert.equal(await page.isVisible('#continue-btn'), true);
  assert.equal(await page.isHidden('#pane-controls'), true);
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
  const hintText = await page.textContent('#move-status');
  const match = /^Hint 1: try the (\w+) pane at ([-\d]+,[-\d]+), pointing ([\w-]+)\.$/.exec(hintText);
  assert.ok(match, hintText);
  const pane = page.locator(`#pane-controls button[data-key="${match[2]}"]`);
  const label = await pane.getAttribute('aria-label');
  assert.ok(label.startsWith(match[1]) && label.includes(`pointing ${match[3]}`), label);
  await page.keyboard.press('h');
  assert.equal(await page.textContent('#move-status'), hintText.replace('Hint 1:', 'Hint 2:'));
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
  assert.equal(await page.getByRole('dialog', { name: 'The frame gave way' }).isVisible(), true);
  assert.match(await page.textContent('#result-text'), /^Too many bumps/);
  await page.click('#result-menu');
  await page.keyboard.press('Escape');
  assert.equal(await page.isVisible('#continue-btn'), true);
  assert.equal(await page.isHidden('#pane-controls'), true);
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

test('a keyboard player can discover, select and clear every pane', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-1');
  const solution = await page.evaluate(() => window.__leadlight.level.solution);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focused = page.locator('#pane-controls button:focus');
  for (const [i, key] of solution.entries()) {
    const count = await page.locator('#pane-controls button').count();
    assert.equal(count, solution.length - i);
    for (let n = 0; n < count && await focused.getAttribute('data-key') !== key; n++) {
      await page.keyboard.press('ArrowRight');
    }
    assert.equal(await focused.getAttribute('data-key'), key);
    assert.match(await focused.getAttribute('aria-label'), /pane at .+, pointing /);
    await page.keyboard.press(i % 2 ? 'Space' : 'Enter');
  }
  await page.waitForSelector('#result:not([hidden])');
  assert.equal(await page.isVisible('#result-next'), true);
  assert.deepEqual(errors, []);
  await page.close();
});

test('a single tap plays on release, a drag is ignored and a board pinch zooms without playing', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-1', { isMobile: true });
  t.after(() => page.close());
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  const nextPoint = () => page.evaluate(() => {
    const { level, game, pixelOf } = window.__leadlight;
    return pixelOf(level.solution[game.history.length]);
  });
  const state = () => page.evaluate(() => {
    const { game } = window.__leadlight;
    return [game.history.length, game.tiles.size, game.cracks];
  });
  const initial = await state();
  let point = await nextPoint();
  await touch('touchStart', [point]);
  assert.deepEqual(await state(), initial);
  await touch('touchEnd', []);
  const afterTap = [1, initial[1] - 1, 0];
  assert.deepEqual(await state(), afterTap);

  point = await nextPoint();
  await touch('touchStart', [point]);
  await touch('touchMove', [{ ...point, y: point.y + 40 }]);
  await touch('touchMove', [point]);
  await touch('touchEnd', []);
  assert.deepEqual(await state(), afterTap);

  await touch('touchStart', [point]);
  await touch('touchCancel', []);
  assert.deepEqual(await state(), afterTap);

  // Start one finger on a playable pane, then spread two fingers around its left edge.
  const finger = (x, id) => ({ x, y: point.y, id });
  await touch('touchStart', [finger(point.x, 1)]);
  await touch('touchStart', [finger(point.x, 1), finger(point.x - 60, 2)]);
  for (let spread = 5; spread <= 50; spread += 5) {
    await touch('touchMove', [finger(point.x + spread, 1), finger(point.x - 60 - spread, 2)]);
  }
  await touch('touchEnd', []);
  await page.waitForFunction(() => visualViewport.scale > 1.2, null, { timeout: 3000 });
  assert.deepEqual(await state(), afterTap);
  assert.deepEqual(errors, []);
});

test('Window 23 keyboard entry dismisses the rule tip before a pane can take focus', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-23', {
    viewport: { width: 360, height: 640 },
    progress: { unlocked: 24, tipSeen: true, seen: {} },
  });
  t.after(() => page.close());
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#tip-ok:focus').count(), 1);
  assert.equal(await page.getByRole('toolbar').count(), 0);
  await page.keyboard.press('Enter');
  assert.equal(await page.isHidden('#tip'), true);
  assert.equal(await page.locator('#pane-controls button:focus').count(), 1);
  await page.keyboard.press('End');
  assert.equal(await page.locator('#pane-controls button:last-child:focus').count(), 1);
  assert.deepEqual(await page.evaluate(() => {
    const { game } = window.__leadlight;
    return [game.cracks, game.history.length];
  }), [0, 0]);
  assert.deepEqual(errors, []);
});

test('a pane chosen directly by assistive technology retains a keyboard path through move and undo', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-1');
  t.after(() => page.close());
  const board = page.getByRole('toolbar', { name: /Window 1.*First Light/ });
  const key = await page.evaluate(() => window.__leadlight.level.solution[0]);
  const chosen = board.locator(`button[data-key="${key}"]`);
  assert.equal(await chosen.getAttribute('tabindex'), '-1');
  await chosen.focus();
  assert.equal(await chosen.getAttribute('tabindex'), '0');
  await page.keyboard.press('Enter');
  assert.equal(await board.locator('button:focus').count(), 1);
  await page.getByRole('button', { name: 'Undo (U)' }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await chosen.evaluate((b) => document.activeElement === b), true);
  assert.equal(await page.textContent('#move-status'), `Restored ${key}.`);
  assert.deepEqual(errors, []);
});

const boardState = (page) => page.evaluate(() => {
  const { game } = window.__leadlight;
  return { tiles: [...game.tiles], history: game.history, cracks: game.cracks, hints: game.hintsUsed };
});

test('Continue resumes the actual Window 23 position, counters, URL and undo history', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-23', { viewport: { width: 360, height: 640 } });
  t.after(() => page.close());
  const moves = await page.evaluate(() => window.__leadlight.level.solution.slice(0, 11));
  for (const k of moves) await tapKey(page, k);
  await page.keyboard.press('h');
  const blocked = await page.evaluate(async () => {
    const { analyseMove } = await import('/src/board.js');
    const { game } = window.__leadlight;
    return [...game.tiles.keys()].find(k => analyseMove(game.bounds, game.mask, game.tiles, k).type === 'bump');
  });
  await tapKey(page, blocked);
  const before = await boardState(page);
  assert.deepEqual([before.tiles.length, before.history.length, before.cracks, before.hints], [57, 11, 1, 1]);
  await page.click('#menu-btn');
  await page.getByRole('button', { name: 'Continue window 23' }).click();
  assert.equal(new URL(page.url()).hash, '#window-23');
  assert.deepEqual(await boardState(page), before);
  await page.click('#undo-btn');
  assert.equal((await boardState(page)).history.length, 10);
  assert.deepEqual(errors, []);
});

test('every Window 23 pane and its focus ring fit clear of the combined rule tip at 360px', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-23', {
    viewport: { width: 360, height: 640 }, progress: { unlocked: 24, tipSeen: true, seen: {} },
  });
  t.after(() => page.close());
  const geometry = await page.evaluate(() => {
    const { game, pixelOf, paneSize } = window.__leadlight;
    const radius = 0.75 * paneSize() / Math.sqrt(3) + 6;
    const board = document.querySelector('#board').getBoundingClientRect();
    const tip = document.querySelector('#tip').getBoundingClientRect();
    const clear = [...game.tiles.keys()].filter(k => {
      const { x, y } = pixelOf(k);
      return document.elementFromPoint(x, y)?.id === 'board' && y + radius <= tip.top &&
        x - radius >= board.left && x + radius <= board.right && y - radius >= board.top;
    });
    return [clear.length, game.tiles.size, document.documentElement.scrollWidth];
  });
  assert.deepEqual(geometry, [68, 68, 360]);
  assert.deepEqual(errors, []);
});

test('free inspection previews the Window 12 weighted stop before committing', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-12', { viewport: { width: 360, height: 640 } });
  t.after(() => page.close());
  const before = await boardState(page);
  await page.click('#inspect-btn');
  await tapKey(page, '0,0');
  const report = await page.textContent('#inspect-summary');
  assert.match(report, /Parks at 0,-1 because 0,-2 is occupied/);
  assert.match(report, /north-west: 0,-1 → 0,-2/);
  await page.locator('#inspect-neighbours summary').click();
  assert.match(await page.textContent('#neighbour-text'), /north-west 0,-1: empty/);
  assert.deepEqual(await boardState(page), before);
  await page.click('#inspect-move');
  const after = await boardState(page);
  assert.equal(after.history.at(-1).to, '0,-1');
  assert.deepEqual([after.history.length, after.hints, after.cracks], [1, 0, 0]);
  assert.deepEqual(errors, []);
});

test('Up and Down select the closest pane in the next occupied row and update inspection', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-23');
  t.after(() => page.close());
  const board = page.getByRole('toolbar');
  await board.locator('[tabindex="0"]').focus();
  await page.keyboard.press('i');
  const before = await boardState(page);
  for (const direction of ['ArrowDown', 'ArrowDown', 'ArrowUp']) {
    const expected = await board.evaluate((el, down) => {
      const active = document.activeElement.getBoundingClientRect();
      return [...el.children].map(b => ({ key: b.dataset.key, rect: b.getBoundingClientRect() }))
        .filter(b => down ? b.rect.y > active.y + 1 : b.rect.y < active.y - 1)
        .sort((a, b) => {
          const row = Math.abs(a.rect.y - active.y) - Math.abs(b.rect.y - active.y);
          const distance = Math.abs(a.rect.x - active.x) - Math.abs(b.rect.x - active.x);
          if (Math.abs(row) > 0.1) return row;
          return Math.abs(distance) > 0.1 ? distance : a.rect.x - b.rect.x;
        })[0].key;
    }, direction === 'ArrowDown');
    await page.keyboard.press(direction);
    assert.equal(await board.locator(':focus').getAttribute('data-key'), expected);
    assert.ok((await page.textContent('#inspect-summary')).includes(`at ${expected}.`));
  }
  assert.deepEqual(await boardState(page), before);
  assert.deepEqual(errors, []);
});

test('reviewing Rules from the pause menu preserves the live window and seen tips', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-12');
  t.after(() => page.close());
  await tapKey(page, '0,0');
  const before = await boardState(page);
  const saved = await page.evaluate(() => localStorage.getItem('leadlight-v1'));
  await page.click('#menu-btn');
  await page.getByRole('button', { name: 'Rules', exact: true }).click();
  assert.equal(await page.locator('#rules-title:focus').count(), 1);
  assert.match(await page.locator('#rules-text').innerText(), /Weighted panes/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#rules-btn:focus').count(), 1);
  await page.click('#continue-btn');
  assert.deepEqual(await boardState(page), before);
  assert.equal(await page.evaluate(() => localStorage.getItem('leadlight-v1')), saved);
  assert.deepEqual(errors, []);
});

test('inspection stays steady through selection, disclosure and consecutive explicit commits', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-12', { viewport: { width: 360, height: 640 } });
  t.after(() => page.close());
  const centres = () => page.evaluate(() => {
    const { level, pixelOf } = window.__leadlight;
    return level.cells.map(([q, r]) => pixelOf(`${q},${r}`));
  });
  await page.click('#inspect-btn');
  const initial = await centres();
  await tapKey(page, '0,0');
  assert.deepEqual(await centres(), initial);
  await page.locator('#inspect-neighbours summary').click();
  assert.deepEqual(await centres(), initial);
  await page.click('#inspect-move');
  assert.equal(await page.getAttribute('#inspect-btn', 'aria-pressed'), 'true');
  assert.equal(await page.isHidden('#inspect-move'), true);
  assert.deepEqual(await centres(), initial);
  const afterFirst = await boardState(page);
  assert.equal(afterFirst.history.length, 1);
  await tapKey(page, '0,-1');
  assert.match(await page.textContent('#inspect-summary'), /Would bump against 0,-2/);
  assert.deepEqual(await boardState(page), afterFirst);
  assert.deepEqual(await centres(), initial);
  await page.click('#inspect-move');
  assert.equal((await boardState(page)).cracks, afterFirst.cracks + 1);
  assert.equal(await page.getAttribute('#inspect-btn', 'aria-pressed'), 'true');
  assert.deepEqual(errors, []);
});

for (const outcome of ['win', 'loss', 'daily win']) {
  test(`Tab stays inside the ${outcome} result in both directions`, async (t) => {
    if (skip) return t.skip(skip);
    const daily = outcome === 'daily win';
    const loss = outcome === 'loss';
    const { page, errors } = await open(daily ? '#daily-2026-11-24' : '#window-1');
    t.after(() => page.close());
    await page.evaluate((lose) => {
      const { game, level, tapKey } = window.__leadlight;
      if (lose) {
        for (let n = 0; n < game.maxCracks; n++) tapKey('0,0');
      } else {
        level.solution.forEach(tapKey);
      }
    }, loss);
    await page.waitForSelector('#result:not([hidden])');
    const ids = loss ? ['result-again', 'result-menu'] : ['result-next', ...(daily ? ['result-share'] : []), 'result-again', 'result-menu'];
    const focused = () => page.evaluate(() => document.activeElement.id);
    assert.equal(await focused(), ids[0]);
    for (const id of [...ids.slice(1), ids[0]]) {
      await page.keyboard.press('Tab');
      assert.equal(await focused(), id);
    }
    for (const id of [...ids].reverse()) {
      await page.keyboard.press('Shift+Tab');
      assert.equal(await focused(), id);
    }
    assert.deepEqual(errors, []);
  });
}

test('reload preserves a weighted board, inspection, counters and usable Undo while playing or paused', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-12');
  t.after(() => page.close());
  await tapKey(page, '0,0');
  await tapKey(page, '0,-1');
  await page.keyboard.press('h');
  await page.click('#inspect-btn');
  await tapKey(page, '0,-1');
  const before = await boardState(page);
  const preview = await page.textContent('#inspect-summary');
  assert.deepEqual([before.history.length, before.cracks, before.hints], [1, 1, 1]);
  await page.reload();
  assert.deepEqual(await boardState(page), before);
  assert.equal(await page.getAttribute('#inspect-btn', 'aria-pressed'), 'true');
  assert.equal(await page.textContent('#inspect-summary'), preview);

  await page.click('#menu-btn');
  await page.reload();
  await page.getByRole('button', { name: 'Continue window 12' }).click();
  assert.deepEqual(await boardState(page), before);
  await page.click('#undo-btn');
  const undone = await boardState(page);
  assert.equal(undone.history.length, 0);
  assert.ok(undone.tiles.some(([k, tile]) => k === '0,0' && tile.weighted));
  await page.reload();
  assert.deepEqual(await boardState(page), undone);
  await page.click('#restart-btn');
  await page.reload();
  const fresh = await boardState(page);
  assert.deepEqual([fresh.history.length, fresh.cracks, fresh.hints], [0, 0, 0]);
  assert.deepEqual(errors, []);
});

test('a finished window discards its previous reload checkpoint', async (t) => {
  if (skip) return t.skip(skip);
  const { page, errors } = await open('#window-1');
  t.after(() => page.close());
  const solution = await page.evaluate(() => window.__leadlight.level.solution);
  await tapKey(page, solution[0]);
  await page.reload();
  for (const k of solution.slice(1)) await tapKey(page, k);
  await page.waitForSelector('#result:not([hidden])');
  await page.click('#result-menu');
  await page.reload();
  assert.equal(await page.isVisible('#home'), true);
  assert.equal(await page.evaluate(() => window.__leadlight.game), null);
  assert.deepEqual(errors, []);
});
