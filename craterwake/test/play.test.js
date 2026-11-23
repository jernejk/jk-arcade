import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launchBrowser } from '../scripts/harness.js';

let browser, server, base, skip;
before(async () => {
  ({ browser, skip } = await launchBrowser());
  if (browser) {
    server = await startServer();
    base = 'http://127.0.0.1:' + server.address().port + '/craterwake/';
  }
});
after(async () => {
  await browser?.close();
  server?.close();
});

async function open(
  t,
  { clock = false, seed = 824, denied = false, ...opts } = {},
) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ...opts,
  });
  t.after(() => context.close());
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('request', (r) => {
    if (new URL(r.url()).hostname !== '127.0.0.1')
      errors.push('External request ' + r.url());
  });
  t.after(() => assert.deepEqual(errors, []));
  if (denied)
    await page.addInitScript(() =>
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Storage is disabled');
        },
      }),
    );
  if (clock) {
    await page.clock.install({ time: new Date('2025-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2025-01-01T00:00:02Z'));
  }
  await page.goto(base + '?seed=' + seed);
  return page;
}
const state = (p) =>
  p.evaluate(() => {
    const { checksum, ...rest } = window.__craterwake;
    return { ...rest, checksum: checksum() };
  });
const begin = async (p) => {
  await p.locator('#start').focus();
  await p.keyboard.press('Enter');
};
const advance = async (p, ms) => {
  await p.clock.fastForward(ms);
};
const phaseIs = (p, name) =>
  p.waitForSelector('#hud[data-phase="' + name + '"]');
async function range(p, id, value) {
  await p.locator(id).fill(String(value));
}
async function finishChunkUploads(p) {
  for (let i = 0; i < 24; i++) {
    if (await p.evaluate(() => window.__craterwake.meshesPending === 0)) return;
    await p.clock.runFor(16);
  }
  assert.fail('dirty chunk uploads did not finish within 24 frames');
}
for (const [name, viewport] of [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1366, height: 900 }],
]) {
  test(
    name +
      ' loads, fires and cycles through four live camera beats without errors',
    async (t) => {
      if (skip) return t.skip(skip);
      const start = performance.now(),
        p = await open(t, { viewport });
      await begin(p);
      await p.waitForFunction(() => window.__craterwake?.calls > 0);
      const ready = performance.now() - start;
      const initial = await state(p);
      assert.ok(await p.locator('#pin').isVisible());
      assert.equal(initial.phase, 'aim');
      const box = await p.locator('#cabinet').boundingBox();
      assert.equal(
        await p.evaluate(() => document.documentElement.scrollWidth),
        viewport.width,
      );
      assert.ok(Math.abs(box.x - (viewport.width - box.width) / 2) <= 1);
      assert.ok(box.width <= 520);
      const fireBox = await p.locator('#fire').boundingBox();
      assert.equal(fireBox.width, 76);
      await p.evaluate(() => {
        const samples = (window.samples = []);
        let old = performance.now();
        function capture(t) {
          const s = window.__craterwake;
          if (s)
            samples.push({
              phase: s.phase,
              actor: s.turn,
              dt: t - old,
              calls: s.calls,
              tris: s.triangles,
              camera: s.camera,
            });
          old = t;
          requestAnimationFrame(capture);
        }
        requestAnimationFrame(capture);
      });
      await p.keyboard.press('Space');
      await phaseIs(p, 'shell-cam');
      assert.equal(await p.locator('#fire').isDisabled(), true);
      await phaseIs(p, 'impact');
      assert.notEqual((await state(p)).checksum, initial.checksum);
      await phaseIs(p, 'their-shot');
      assert.equal(await p.textContent('#beat'), 'Rivet aiming');
      await phaseIs(p, 'shell-cam');
      await phaseIs(p, 'impact');
      await phaseIs(p, 'aim');
      const frames = await p.evaluate(() => window.samples);
      assert.ok(
        frames.some(
          (s) => s.phase === 'shell-cam' && s.camera[1] > initial.camera[1] + 2,
        ),
      );
      const impacts = frames.filter((s) => s.phase === 'impact'),
        settled = impacts.map((s) => s.dt).sort((a, b) => a - b);
      assert.ok(impacts.length > 5);
      assert.ok(Math.max(...frames.map((s) => s.calls)) <= 70);
      assert.ok(Math.max(...frames.map((s) => s.tris)) <= 80000);
      t.diagnostic(
        'Local first playable ' +
          Math.round(ready) +
          ' ms; peak ' +
          Math.max(...frames.map((s) => s.calls)) +
          ' draws / ' +
          Math.max(...frames.map((s) => s.tris)) +
          ' triangles; impact frame p50 ' +
          settled[Math.floor(settled.length * 0.5)].toFixed(1) +
          ' ms, p95 ' +
          settled[Math.floor(settled.length * 0.95)].toFixed(1) +
          ' ms',
      );
    },
  );
}
test('pointer drag clamps yaw, power tap and hold ramp, sliders, tray, mute and keyboard aim work', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { clock: true });
  await begin(p);
  await advance(p, 100);
  await p.mouse.move(75, 420);
  await p.mouse.down();
  await p.mouse.move(325, 420);
  await p.mouse.up();
  assert.equal((await state(p)).aim.heading, 30);
  await p.keyboard.press('a');
  assert.equal(await p.textContent('#bearing'), '+29°');
  await p.mouse.move(325, 420);
  await p.mouse.down();
  await p.mouse.move(55, 420);
  await p.mouse.up();
  assert.equal((await state(p)).aim.heading, -30);
  await range(p, '#elevation', 80);
  await p.keyboard.press('ArrowUp');
  assert.equal((await state(p)).aim.angle, 80);
  await p.keyboard.press('ArrowDown');
  assert.equal(await p.inputValue('#elevation'), '79');
  await range(p, '#throttle', 47);
  await p.click('#plus');
  assert.equal((await state(p)).aim.power, 48);
  const plus = await p.locator('#plus').boundingBox();
  await p.mouse.move(plus.x + 20, plus.y + 20);
  await p.mouse.down();
  await p.clock.runFor(1050);
  const held = (await state(p)).aim.power;
  await p.clock.runFor(100);
  assert.equal((await state(p)).aim.power - held, 5);
  await p.mouse.up();
  await range(p, '#throttle', 100);
  await p.keyboard.press('w');
  assert.equal((await state(p)).aim.power, 100);
  await p.keyboard.press('s');
  assert.equal((await state(p)).aim.power, 99);
  await p.click('#ammo');
  await p.getByRole('button', { name: 'Corkscrew 2' }).click();
  assert.equal((await state(p)).aim.ammo, 1);
  await p.keyboard.press('3');
  assert.equal((await state(p)).aim.ammo, 2);
  await p.keyboard.press('m');
  assert.equal(await p.getAttribute('#sound', 'aria-pressed'), 'false');
  await p.keyboard.press('Enter');
  assert.equal((await state(p)).phase, 'shell-cam');
});
test('reduced motion holds fixed camera positions, impact skips after 0.8 s, and pause freezes timer', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { clock: true, reducedMotion: 'reduce' });
  await begin(p);
  await advance(p, 100);
  await p.keyboard.press('Escape');
  const time = (await state(p)).remaining;
  await advance(p, 30000);
  assert.equal((await state(p)).remaining, time);
  await p.getByRole('button', { name: 'Resume duel' }).press('Enter');
  await p.keyboard.press('Space');
  await advance(p, 200);
  const shell = (await state(p)).camera;
  await advance(p, 400);
  assert.deepEqual((await state(p)).camera, shell);
  await advance(p, 4000);
  assert.equal((await state(p)).phase, 'impact');
  const overhead = (await state(p)).camera;
  await advance(p, 350);
  assert.deepEqual((await state(p)).camera, overhead);
  assert.notDeepEqual(overhead, shell);
  await p.mouse.click(190, 430);
  assert.equal((await state(p)).phase, 'impact');
  await advance(p, 480);
  await p.locator('#skip').press('Enter');
  assert.equal((await state(p)).phase, 'their-shot');
  await advance(p, 1400);
  assert.equal((await state(p)).phase, 'shell-cam');
});
test('expiry fires the selected shot and a water miss gets a short splash', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { clock: true });
  await begin(p);
  await advance(p, 32);
  await range(p, '#throttle', 27);
  await range(p, '#elevation', 55);
  const before = (await state(p)).checksum;
  await advance(p, 20050);
  assert.equal((await state(p)).phase, 'shell-cam');
  await advance(p, 5000);
  assert.equal(await p.locator('#beat').textContent(), 'Splash');
  assert.match(await p.textContent('#feedback'), /^Water miss\b/);
  assert.equal((await state(p)).checksum, before);
  await advance(p, 820);
  assert.equal((await state(p)).phase, 'their-shot');
});
test('a complete best-of-three via turn expiry reaches a real results card and playable rematch', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { clock: true, seed: 4, reducedMotion: 'reduce' });
  await begin(p);
  await advance(p, 32);
  for (let beats = 0; beats < 440; beats++) {
    const phase = await p.getAttribute('#hud', 'data-phase');
    if (phase === 'results') break;
    if (phase === 'round-over') {
      await p.getByRole('button', { name: 'Next round' }).press('Enter');
      continue;
    }
    await advance(
      p,
      { aim: 20100, 'their-shot': 1450, 'shell-cam': 6500, impact: 2500 }[
        phase
      ],
    );
  }
  const s = await state(p);
  assert.equal(s.phase, 'results');
  assert.ok(s.score.includes(2));
  assert.match(await p.textContent('#panel-title'), /wins the duel/);
  assert.match(await p.textContent('#panel-copy'), new RegExp(s.checksum));
  assert.match(await p.textContent('#panel-copy'), /Seed 4/);
  await p.getByRole('button', { name: /Rematch/ }).press('Enter');
  const replay = await state(p);
  assert.equal(replay.phase, 'aim');
  assert.deepEqual(replay.score, [0, 0]);
  assert.equal(replay.seed, 4);
  await p.keyboard.press('2');
  assert.equal(
    await p.textContent('#ammo b'),
    s.score[1] === 2 ? 'Corkscrew 3' : 'Corkscrew 2',
  );
});
test('a reload releases the outgoing WebGL context while a cacheable pagehide retains it', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t);
  await begin(p);
  await p.waitForFunction(() => window.__craterwake?.calls > 0);
  const retained = await p.evaluate(() => {
    const canvas = document.querySelector('#sea');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    );
    window.addEventListener(
      'pagehide',
      (e) => {
        sessionStorage.setItem(
          'reload-check',
          JSON.stringify([e.persisted, gl.isContextLost()]),
        );
      },
      { once: true },
    );
    return !gl.isContextLost();
  });
  assert.ok(retained);
  await p.reload();
  assert.deepEqual(
    await p.evaluate(() => JSON.parse(sessionStorage.getItem('reload-check'))),
    [false, true],
  );
  await begin(p);
  await p.keyboard.press('Space');
  await phaseIs(p, 'impact');
  const s = await state(p);
  assert.deepEqual(s.hp, [100, 99]);
  assert.equal(s.checksum, '5c000090');
});

test('a cached cabinet reloads offline and plays with local storage denied', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { denied: true });
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  await p.context().setOffline(true);
  await p.reload();
  await begin(p);
  await p.waitForFunction(() => window.__craterwake?.calls > 0);
  await p.keyboard.press('m');
  await p.keyboard.press('Space');
  await phaseIs(p, 'impact');
});

test('Gull Strike releases its three bombs before the ground changes and the rebuilt chunks finish', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { clock: true });
  await begin(p);
  await advance(p, 32);
  const terrain = (await state(p)).checksum;
  await p.keyboard.press('3');
  await p.keyboard.press('Space');
  await advance(p, 5000);
  assert.equal(await p.textContent('#beat'), 'Gull strike');
  assert.equal((await state(p)).checksum, terrain);
  await advance(p, 640);
  assert.notEqual((await state(p)).checksum, terrain);
  await finishChunkUploads(p);
  await advance(p, 250);
  await p.locator('#skip').press('Enter');
  assert.equal((await state(p)).phase, 'their-shot');
});

test('390 × 844 shows the complete opening and rival guides, then frames the stock bore from its mouth', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { clock: true });
  await p.evaluate(async () => {
    const { Battlefield } = await import('./src/scene.js'),
      T = await import('./vendor/three.module.min.js');
    const draw = Battlefield.prototype.draw;
    let field, view;
    Battlefield.prototype.draw = function (state, dt) {
      field = this;
      view = state;
      return draw.call(this, state, dt);
    };
    function inspectPoint(point) {
      const rect = field.canvas.getBoundingClientRect(),
        projected = point.clone().project(field.camera);
      const x = rect.left + (rect.width * (1 + projected.x)) / 2,
        y = rect.top + (rect.height * (1 - projected.y)) / 2;
      const clear = [
        ...document.querySelectorAll(
          '.hp,.compass,#beat,#pin,#angle,#power,#feedback,footer',
        ),
      ].every((el) => {
        const b = el.getBoundingClientRect();
        return (
          x < b.left - 4 || x > b.right + 4 || y < b.top - 4 || y > b.bottom + 4
        );
      });
      return { x, y, clear };
    }
    window.readGuide = () => {
      if (!field.pips.visible) return [];
      const obstacles = [
        ...field.chunks.values(),
        ...field.toys.map((t) => t.group),
        field.props,
      ];
      return Array.from({ length: field.pips.count }, (_, i) => {
        const matrix = new T.Matrix4();
        field.pips.getMatrixAt(i, matrix);
        const pos = new T.Vector3().setFromMatrixPosition(matrix),
          eye = field.camera.position;
        const ray = new T.Raycaster(
          eye,
          pos.clone().sub(eye).normalize(),
          0,
          eye.distanceTo(pos) - 0.1,
        );
        return {
          ...inspectPoint(pos),
          visible: ray.intersectObjects(obstacles, true).length === 0,
        };
      });
    };
    window.readBore = () => {
      const mouth = new T.Vector3().copy(view.result.drill[0]),
        end = new T.Vector3().copy(view.result.drill.at(-1));
      const axis = end.clone().sub(mouth).normalize();
      const eye = field.camera.position.clone().sub(mouth).normalize();
      return {
        mouth: inspectPoint(mouth),
        end: inspectPoint(end),
        alignment: eye.dot(axis),
      };
    };
  });
  await begin(p);
  await advance(p, 700);
  async function checkGuide() {
    const dots = await p.evaluate(() => window.readGuide());
    assert.equal(dots.length, 14);
    for (const [i, dot] of dots.entries()) {
      assert.ok(
        dot.visible &&
          dot.clear &&
          dot.x > 4 &&
          dot.x < 386 &&
          dot.y > 4 &&
          dot.y < 840,
        'occluded or clipped pip ' + i,
      );
      if (i) {
        const gap = Math.hypot(dot.x - dots[i - 1].x, dot.y - dots[i - 1].y);
        assert.ok(gap > 8 && gap < 40, 'pip spacing ' + gap);
      }
    }
  }
  await checkGuide();
  await p.keyboard.press('Space');
  await advance(p, 4000);
  await advance(p, 2000);
  await p.clock.runFor(780);
  assert.equal((await state(p)).phase, 'their-shot');
  await checkGuide();
  await advance(p, 800);
  await advance(p, 5000);
  await advance(p, 2600);
  await range(p, '#elevation', 5);
  await p.keyboard.press('2');
  await p.keyboard.press('Space');
  await advance(p, 5000);
  await finishChunkUploads(p);
  await p.clock.runFor(750);
  assert.match(await p.textContent('#feedback'), /Cover hit/);
  const bore = await p.evaluate(() => window.readBore());
  assert.ok(
    bore.alignment < -0.93,
    'orbit should look along the bore from the entry side',
  );
  for (const point of [bore.mouth, bore.end])
    assert.ok(
      point.clear &&
        point.x > 60 &&
        point.x < 330 &&
        point.y > 230 &&
        point.y < 640,
    );
});

test('spring chain stages its shockwaves and bouncing rubble within phone budgets; calm mode preserves the crater', async (t) => {
  if (skip) return t.skip(skip);
  const hashes = [];
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const p = await open(t, { clock: true, reducedMotion });
    await p.evaluate(async () => {
      const { Battlefield } = await import('./src/scene.js'),
        draw = Battlefield.prototype.draw;
      let field;
      Battlefield.prototype.draw = function (...args) {
        field = this;
        return draw.apply(this, args);
      };
      window.depthMatchesCrater = () => {
        const { data, width } = field.depth.image;
        return data.every((value, i) => {
          const top = field.round.world.top(i % width, Math.floor(i / width));
          return value === Math.round((top * 255) / 40);
        });
      };
      window.impactStats = () => {
        const e = field.effects;
        return {
          shards: e.shards.count,
          puffs: e.cloud.count,
          waves: e.waves.count,
          bounces: e.bodies.filter((b) => b.bounces).length,
          settled: e.bodies.filter((b) => b.asleep).length,
          shake: field.camera.view?.enabled
            ? Math.hypot(field.camera.view.offsetX, field.camera.view.offsetY)
            : 0,
        };
      };
    });
    await begin(p);
    await advance(p, 32);
    await p.keyboard.press('Space');
    await advance(p, 4000);
    await p.clock.runFor(360);
    const early = await p.evaluate(() => window.impactStats());
    assert.ok(await p.evaluate(() => window.depthMatchesCrater()));
    assert.match(await p.textContent('#beat'), /chain ×2/i);
    if (reducedMotion === 'reduce') {
      assert.deepEqual(
        [early.shards, early.puffs, early.waves, early.shake],
        [0, 0, 0, 0],
      );
    } else {
      assert.ok(early.waves >= 2 && early.waves <= 7);
      assert.ok(
        early.shards > 0 &&
          early.shards <= 96 &&
          early.puffs > 0 &&
          early.puffs <= 36,
      );
      assert.ok(early.shake > 0 && early.shake <= 6);
      assert.ok((await state(p)).calls <= 70);
      await p.clock.runFor(900);
      const late = await p.evaluate(() => window.impactStats());
      assert.ok(late.bounces > 0 && late.settled > 0);
    }
    hashes.push((await state(p)).checksum);
  }
  assert.equal(hashes[0], hashes[1]);
});

test('Skipper is selectable with 4 and both water skips occur in the original chase beat', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { clock: true });
  await begin(p);
  await advance(p, 32);
  await range(p, '#elevation', 23);
  await range(p, '#throttle', 43);
  for (let n = 0; n < 12; n++) await p.keyboard.press('d');
  await p.keyboard.press('4');
  assert.match(await p.textContent('#ammo b'), /Skipper 2/);
  await p.keyboard.press('Space');
  await p.clock.runFor(1320);
  assert.equal((await state(p)).phase, 'shell-cam');
  assert.match(await p.textContent('#beat'), /bounce 1/);
  await p.clock.runFor(960);
  assert.match(await p.textContent('#beat'), /bounce 2/);
  await advance(p, 3000);
  assert.equal((await state(p)).phase, 'impact');
});

test('Skipper reports its water landing after bouncing off terrain and water', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { clock: true });
  await begin(p);
  const start = (await state(p)).checksum;
  await range(p, '#elevation', 5);
  await range(p, '#throttle', 11);
  for (let i = 0; i < 30; i++) await p.keyboard.press('d');
  await p.keyboard.press('4');
  await p.keyboard.press('Space');
  await advance(p, 5000);
  assert.equal(await p.textContent('#beat'), 'Splash');
  assert.match(await p.textContent('#feedback'), /^Water miss · 2 skips\b/);
  assert.equal((await state(p)).checksum, start);
});

test('a point-blank Gull Strike reports the cover hit and the five voxels Kettle lost', async (t) => {
  if (skip) return t.skip(skip);
  const p = await open(t, { clock: true });
  await begin(p);
  await range(p, '#elevation', 5);
  await range(p, '#throttle', 10);
  await p.keyboard.press('3');
  await p.keyboard.press('Space');
  await advance(p, 5000);
  await advance(p, 640);
  assert.equal(
    await p.textContent('#feedback'),
    'Cover hit · Kettle −5% · 43 short',
  );
  const hit = await state(p);
  assert.deepEqual(hit.hp, [95, 100]);
  assert.equal(hit.checksum, '29d83c6d');
});

test('a turret breach exposes a visible core through the next aim and clears on knockout in Normal and Calm', async (t) => {
  if (skip) return t.skip(skip);
  const wrecks = [];
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const p = await open(t, { clock: true, reducedMotion });
    await p.evaluate(async () => {
      const { Battlefield } = await import('./src/scene.js');
      const { armour, core } = await import('./src/tank.js');
      const { Raycaster } = await import('./vendor/three.module.min.js');
      const draw = Battlefield.prototype.draw;
      Battlefield.prototype.draw = function (...args) {
        const stats = draw.apply(this, args);
        const target = this.round.tanks[1];
        window.inspectCore = () => {
          const group = this.toys[1].group,
            cam = this.camera;
          const point = group.localToWorld(core.centre.clone());
          const ray = new Raycaster(
            cam.position,
            point.clone().sub(cam.position).normalize(),
          );
          const first = ray.intersectObjects(
            [group, ...this.chunks.values()],
            true,
          )[0];
          const local = first && group.worldToLocal(first.point.clone());
          const corners = [];
          for (const x of [core.box.min.x, core.box.max.x])
            for (const z of [core.box.min.z, core.box.max.z]) {
              const top = core.centre.clone().set(x, core.box.max.y, z);
              corners.push(group.localToWorld(top).project(cam));
            }
          const extent = (axis) => {
            const coords = corners.map((corner) => corner[axis]);
            return (Math.max(...coords) - Math.min(...coords)) / 2;
          };
          return {
            clear: local && core.box.containsPoint(local),
            width: extent('x') * this.canvas.clientWidth,
            height: extent('y') * this.canvas.clientHeight,
            puffs: this.effects.cloud.count,
          };
        };
        window.readTank = () => ({
          missing: armour.flatMap((v, i) => (target.cells.has(v) ? [] : [i])),
          turretInstances: this.toys[1].turret.children.find(
            (m) => m.isInstancedMesh,
          ).count,
          shards: this.effects.shards.count,
          bodies: this.effects.bodies.length,
        });
        return stats;
      };
    });
    await begin(p);
    await advance(p, 32);
    const fresh = await p.evaluate(() => window.readTank());
    const badge = p.locator('#hp1 .core-status');
    assert.equal(await badge.isVisible(), false);
    for (let i = 0; i < 8; i++) await p.keyboard.press('d');
    await range(p, '#throttle', 75);
    await p.keyboard.press('Space');
    await advance(p, 5000);
    await p.clock.runFor(150);
    const hit = await p.evaluate(() => window.readTank());
    assert.match(
      await p.textContent('#feedback'),
      /Turret hit.*Rivet −18%.*Core exposed/,
    );
    assert.equal(await p.textContent('#hp1 strong'), '82%');
    assert.equal(await badge.isVisible(), true);
    assert.equal(hit.missing.length, 18);
    assert.ok(hit.turretInstances < fresh.turretInstances);
    if (reducedMotion === 'reduce') {
      assert.deepEqual([hit.bodies, hit.shards], [0, 0]);
    } else {
      assert.ok(hit.bodies >= 12 && hit.shards <= 96);
    }
    await p.clock.runFor(1000);
    const core = await p.evaluate(() => window.inspectCore());
    assert.ok(
      core.clear && core.width >= 32 && core.height >= 28,
      JSON.stringify(core),
    );
    t.diagnostic(
      reducedMotion +
        ' core top face projects to ' +
        Math.round(core.width) +
        ' × ' +
        Math.round(core.height) +
        ' CSS px',
    );
    assert.equal(core.puffs, 0);
    await advance(p, 1100);
    assert.equal((await state(p)).phase, 'impact');
    await advance(p, 650);
    assert.equal((await state(p)).phase, 'their-shot');
    assert.equal(await badge.isVisible(), true);
    await advance(p, 1450);
    await advance(p, 5000);
    await advance(p, 3000);
    assert.equal((await state(p)).phase, 'aim');
    assert.equal(await badge.isVisible(), true);
    assert.equal(await badge.textContent(), 'Core exposed');
    assert.match(
      await p.textContent('#feedback'),
      /Last shot .*Heading \+8° · Angle 43° · Power 75/,
    );
    await p.keyboard.press('d');
    await range(p, '#elevation', 50);
    await range(p, '#throttle', 80);
    await p.keyboard.press('Space');
    await advance(p, 5000);
    assert.equal(await p.textContent('#hp1 strong'), '0%');
    assert.match(await p.textContent('#feedback'), /Rivet core destroyed!/);
    assert.equal(await badge.isVisible(), false);
    await advance(p, 3000);
    assert.equal((await state(p)).phase, 'round-over');
    wrecks.push([hit.missing, hit.turretInstances]);
  }
  assert.deepEqual(wrecks[0], wrecks[1]);
});
