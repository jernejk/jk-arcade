import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { defaultSave, layoutByNumber } from "../logic.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      const file = path.join(root, rel);
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("missing");
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function openPage(browser, server, viewport, query) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("request", (req) => {
    const host = new URL(req.url()).hostname;
    if (host !== "127.0.0.1") errors.push(`off-machine request ${req.url()}`);
  });
  const port = server.address().port;
  await page.goto(`http://127.0.0.1:${port}/${query}`, { waitUntil: "networkidle" });
  await page.waitForSelector("h1");
  return { page, errors };
}

function launchOptions() {
  const args = ["--no-sandbox", "--disable-dev-shm-usage"];
  const executablePath = process.env.GROKSTONE_CHROME;
  if (executablePath) return { args, executablePath };
  if (existsSync(chromium.executablePath())) return { args };
  return { args, channel: "chrome" };
}

test("phone and desktop play a keep without page errors", async (t) => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    for (const viewport of [
      { width: 360, height: 640 },
      { width: 1280, height: 800 },
    ]) {
      const { page, errors } = await openPage(browser, server, viewport, "?test=1");
      assert.match(await page.locator("h1").innerText(), /Grokstone/);
      await page.getByRole("button", { name: "Begin the siege" }).click();
      await page.waitForSelector("#tray:not([hidden])");
      const box = await page.locator("#view").boundingBox();
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.72);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.42, { steps: 8 });
      await page.mouse.up();
      await page.waitForFunction(() => window.__grokstone.shots >= 1, null, { timeout: 4000 });
      await page.waitForFunction(() => {
        const game = window.__grokstone;
        return game.phase === "aim" || game.screen === "result";
      }, null, { timeout: 12000 });
      assert.deepEqual(errors, []);
      await page.close();
    }

    const { page, errors } = await openPage(browser, server, { width: 360, height: 640 }, "?test=1");
    await page.getByRole("button", { name: "Begin the siege" }).click();
    await page.waitForSelector("#weapons");
    await page.getByRole("button", { name: "Mute sound" }).click();
    assert.equal(await page.locator("#mute").getAttribute("aria-pressed"), "true");
    for (let i = 0; i < 4; i++) {
      const done = await page.evaluate(() => window.__grokstone.screen === "result");
      if (done) break;
      await page.waitForFunction(() => window.__grokstone.phase === "aim" && window.__grokstone.screen === "battle");
      await page.evaluate(() => window.__grokstone.fireSolution());
      await page.waitForFunction(() => {
        const game = window.__grokstone;
        return (game.phase === "aim" && game.screen === "battle") || game.screen === "result";
      }, null, { timeout: 12000 });
    }
    await page.waitForSelector("#result:not([hidden])", { timeout: 12000 });
    assert.match(await page.locator("#result-title").innerText(), /banner falls/i);
    assert.equal(await page.evaluate(() => window.__grokstone.won), true);
    const view = page.viewportSize();
    for (const id of ["#retry", "#result-title-btn", "#share"]) {
      const box = await page.locator(id).boundingBox();
      assert.ok(box, id);
      assert.ok(box.y >= 0 && box.y + box.height <= view.height + 1, `${id} y ${box.y}`);
    }
    await page.locator("#yard").click();
    await page.waitForSelector("#yard-sheet:not([hidden])");
    assert.ok(await page.locator(".yard-row:not([disabled])").count() > 0, "the first yard visit has nothing to buy");
    assert.ok(await page.locator(".yard-row[disabled] .price small").count() > 0, "a locked item does not say how much more it needs");
    for (const size of [{ width: 360, height: 640 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(size);
      const row = page.locator(".yard-row").first();
      const name = await row.locator("b").boundingBox();
      const blurb = await row.locator("small").boundingBox();
      assert.ok(blurb.y >= name.y + name.height - 1, `yard row name and blurb share a line at ${size.width}px`);
    }
    await page.setViewportSize({ width: 360, height: 640 });
    const puck = page.getByRole("button", { name: /Hire Puck Harrow/ });
    const hire = await puck.boundingBox();
    assert.ok(hire.y >= 0 && hire.y + hire.height <= 640);
    await page.mouse.click(hire.x + hire.width / 2, hire.y + hire.height / 2);
    assert.match(await puck.innerText(), /Kept/);
    const next = await page.locator("#next-siege").boundingBox();
    t.diagnostic(`Next siege at 360×640: y=${next.y}, height=${next.height}`);
    assert.ok(next.y >= 0 && next.y + next.height <= 640, "Next siege is below the fold");
    const x = next.x + next.width / 2;
    for (const y of [next.y + 2, next.y + next.height - 2]) {
      assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [x, y]), "next-siege");
    }
    await page.mouse.click(x, next.y + next.height / 2);
    assert.equal(await page.evaluate(() => window.__grokstone.screen), "battle");
    assert.equal(await page.locator('[data-weapon="keg"]').isEnabled(), true);
    assert.deepEqual(errors, []);
    await page.close();

    const desktop = await openPage(browser, server, { width: 1280, height: 800 }, "");
    await desktop.page.getByRole("button", { name: "Today's keep" }).click();
    await desktop.page.waitForSelector("#level-name");
    assert.match(await desktop.page.locator("#level-name").innerText(), /Today/);
    await desktop.page.keyboard.press("ArrowUp");
    await desktop.page.keyboard.press("Space");
    await desktop.page.waitForFunction(() => {
      const text = document.querySelector("#shot-count").textContent;
      const result = document.querySelector("#result");
      return text.includes("Their") || text.includes("Shot 2") || (result && !result.hidden);
    }, null, { timeout: 12000 });
    assert.deepEqual(desktop.errors, []);
    await desktop.page.close();

    const linked = await openPage(browser, server, { width: 360, height: 640 }, "?test=1#l=8");
    assert.match(await linked.page.locator("#continue").innerText(), /Brackencrown/);
    assert.deepEqual(linked.errors, []);
    await linked.page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function liveDuel(browser, server, level, weapon, limit) {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.addInitScript(() => {
    localStorage.setItem("grokstone-v1", JSON.stringify({
      v: 1, unlocked: 8, rubble: 40,
      weapons: ["roundshot", "keg", "harpoon", "boulder"],
      upgrades: {}, cleared: {}, best: {}, daily: null, seeds: {},
      lastWeapon: "roundshot",
      stats: { wins: 4, losses: 0, shots: 12 },
      settings: { muted: true, motion: "reduce" },
      seenEgg: false, dailyBonusDate: null,
    }));
  });
  const port = server.address().port;
  await page.goto(`http://127.0.0.1:${port}/?test=1#l=${level}`, { waitUntil: "networkidle" });
  await page.locator("#continue").click();
  await page.waitForFunction(() => window.__grokstone.phase === "aim");
  await page.evaluate((id) => window.__grokstone.use(id), weapon);
  for (let i = 0; i < limit; i++) {
    if (await page.evaluate(() => window.__grokstone.screen === "result")) break;
    await page.waitForFunction(() => window.__grokstone.phase === "aim" && window.__grokstone.screen === "battle", null, { timeout: 12000 });
    await page.evaluate(() => window.__grokstone.fireSolution());
    await page.waitForFunction(() => {
      const game = window.__grokstone;
      return (game.phase === "aim" && game.screen === "battle") || game.screen === "result";
    }, null, { timeout: 12000 });
  }
  const status = await page.evaluate(() => window.__grokstone.status());
  await page.close();
  return { status, errors };
}

test("a dragged aim outlines the foot, and that duel can take the star", async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    for (const [level, weapon, foot] of [[3, "harpoon", "efootb"], [6, "boulder", "efootb"]]) {
      const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.addInitScript(() => {
        localStorage.setItem("grokstone-v1", JSON.stringify({
          v: 1, unlocked: 8, rubble: 40,
          weapons: ["roundshot", "keg", "harpoon", "boulder"],
          upgrades: {}, cleared: {}, best: {}, daily: null, seeds: {},
          lastWeapon: "roundshot",
          stats: { wins: 4, losses: 0, shots: 12 },
          settings: { muted: true, motion: "reduce" },
          seenEgg: false, dailyBonusDate: null,
        }));
      });
      const port = server.address().port;
      await page.goto(`http://127.0.0.1:${port}/?test=1#l=${level}`, { waitUntil: "networkidle" });
      await page.locator("#continue").click();
      await page.waitForFunction(() => window.__grokstone.phase === "aim");
      await page.evaluate((id) => window.__grokstone.use(id), weapon);
      const from = await page.evaluate(() => window.__grokstone.clientFor("cannon"));
      const to = await page.evaluate((id) => window.__grokstone.clientFor(id), foot);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 12 });
      await nextFrames(page, 2);
      const outlined = await page.evaluate(() => window.__grokstone.outline());
      assert.equal(outlined, foot, `level ${level} outlined ${outlined}`);
      await page.mouse.up();
      for (let i = 0; i < 6; i++) {
        if (await page.evaluate(() => window.__grokstone.screen === "result")) break;
        await page.waitForFunction(() => window.__grokstone.phase === "aim" && window.__grokstone.screen === "battle", null, { timeout: 12000 });
        const hit = await page.evaluate(() => {
          const feet = window.__grokstone.feet();
          const prefer = feet.includes("efootb") ? "efootb" : feet[0];
          return prefer ? window.__grokstone.aimAt(prefer) : null;
        });
        if (hit === "elintel") assert.fail(`level ${level} aimed the beam`);
        await page.evaluate(() => window.__grokstone.fireAimed());
        await page.waitForFunction(() => {
          const game = window.__grokstone;
          return (game.phase === "aim" && game.screen === "battle") || game.screen === "result";
        }, null, { timeout: 12000 });
      }
      const status = await page.evaluate(() => window.__grokstone.status());
      assert.deepEqual(errors, []);
      assert.equal(status.won, true, status.detail);
      assert.equal(status.stars, 3, status.detail);
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function mouseDrag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  try {
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await nextFrames(page, 2);
    return await page.evaluate(() => window.__grokstone.outline());
  } finally {
    await page.mouse.move(from.x, from.y, { steps: 3 });
    await page.mouse.up();
  }
}

async function touchDrag(page, from, to) {
  const client = await page.context().newCDPSession(page);
  const slide = (type, x, y) => client.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }],
  });
  try {
    await slide("touchStart", from.x, from.y);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      await slide("touchMove", from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    }
    await slide("touchMove", to.x, to.y);
    await nextFrames(page, 2);
    return await page.evaluate(() => window.__grokstone.outline());
  } finally {
    for (let i = 1; i <= 3; i++) {
      await slide("touchMove", to.x + ((from.x - to.x) * i) / 3, to.y + ((from.y - to.y) * i) / 3);
    }
    await slide("touchEnd", from.x, from.y);
    await client.detach();
  }
}

test("battle framing enlarges the stones and keeps both walls in reach", async (t) => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    const page = await browser.newPage({ hasTouch: true, reducedMotion: "reduce" });
    const blocks = layoutByNumber(1, defaultSave()).blocks;
    await page.goto(`http://127.0.0.1:${server.address().port}/?test=1`);
    await page.locator("#continue").click();
    for (const [width, height, minW, minH] of [[360, 640, 28, 22], [390, 844, 30, 24], [1280, 800, 54, 34]]) {
      await page.setViewportSize({ width, height });
      await nextFrames(page, 2);
      const bounds = await page.evaluate((blocks) => blocks.map(b => {
        const game = window.__grokstone;
        return {
          id: b.id,
          tl: game.clientFor(b.id, -b.w / 2, -b.h / 2),
          br: game.clientFor(b.id, b.w / 2, b.h / 2),
        };
      }), blocks);
      const hud = await page.locator("#hud").boundingBox();
      const tray = await page.locator("#tray").boundingBox();
      for (const { id, tl, br } of bounds) {
        assert.ok(tl.x >= 0 && br.x <= width && tl.y > hud.y + hud.height && br.y < tray.y, `${id} outside battle area at ${width}px`);
      }
      const { tl, br } = bounds.find(b => b.id === "p0x0");
      const w = br.x - tl.x, h = br.y - tl.y;
      t.diagnostic(`${width}×${height}: stone target ${w.toFixed(1)}×${h.toFixed(1)} CSS px`);
      assert.ok(w >= minW && h >= minH);
      const [from, to, foot] = await page.evaluate(() => {
        const game = window.__grokstone;
        const foot = game.feet()[0];
        return [game.clientFor("cannon"), game.clientFor(foot), foot];
      });
      // With ambient motion reduced, the canvas includes the exact cannon angle
      // and dotted shot path, independently of the DOM pause overlay.
      const canvasPixels = () => page.locator("#view").evaluate(canvas => canvas.toDataURL());
      const before = await canvasPixels();
      for (const button of ["#pause", "#resume"]) {
        await page.locator(button).click();
        await nextFrames(page, 2);
        assert.deepEqual(await page.locator("#hud").boundingBox(), hud);
        assert.deepEqual(await page.evaluate(() => window.__grokstone.clientFor("cannon")), from);
        assert.deepEqual(await page.evaluate(id => window.__grokstone.clientFor(id), foot), to);
        assert.ok(await canvasPixels() === before, `battle painting moved after ${button} at ${width}px`);
      }
      assert.equal(await touchDrag(page, from, to), foot);
    }
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("mouse and touch outline reachable feet and the screen before a sheltered foot", async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    const context = await browser.newContext({ viewport: { width: 960, height: 640 }, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.addInitScript(() => {
      localStorage.setItem("grokstone-v1", JSON.stringify({
        v: 1, unlocked: 9, rubble: 40,
        weapons: ["roundshot", "keg", "harpoon", "boulder"],
        upgrades: {}, cleared: {}, best: {}, daily: null, seeds: {},
        lastWeapon: "roundshot",
        stats: { wins: 8, losses: 0, shots: 20 },
        settings: { muted: true, motion: "reduce" },
        seenEgg: false, dailyBonusDate: null,
      }));
    });
    const port = server.address().port;
    for (let level = 1; level <= 9; level++) {
      await page.goto(`http://127.0.0.1:${port}/?test=1&keep=${level}#l=${level}`, { waitUntil: "networkidle" });
      await page.locator("#continue").click();
      await page.waitForFunction(() => window.__grokstone.phase === "aim");
      const feet = await page.evaluate(() => window.__grokstone.feet());
      assert.ok(feet.length > 0, `level ${level} has no feet`);
      for (const weapon of ["roundshot", "harpoon"]) {
        await page.evaluate((id) => window.__grokstone.use(id), weapon);
        for (const foot of feet) {
          if (foot === "ehaunchR") continue;
          const from = await page.evaluate(() => window.__grokstone.clientFor("cannon"));
          const to = await page.evaluate((id) => window.__grokstone.clientFor(id), foot);
          const toward = foot === "e0x7"
            ? await page.evaluate((id) => window.__grokstone.clientFor(id, 8, 0), foot)
            : to;
          for (const [kind, drag] of [["mouse", mouseDrag], ["touch", touchDrag]]) {
            for (const point of foot === "e0x7" ? [to, toward] : [to]) {
              const outlined = await drag(page, from, point);
              const screen = weapon === "harpoon" && foot === "e2x3"
                ? ({ 2: "ehaunchL", 7: "e0x2", 8: "ehaunchL" })[level] : null;
              assert.equal(outlined, screen || foot, `level ${level} ${weapon} ${kind} on ${foot} outlined ${outlined}`);
              const shots = await page.evaluate(() => window.__grokstone.shots);
              assert.equal(shots, 0, `level ${level} ${weapon} ${kind} on ${foot} fired during the aim drag`);
            }
          }
        }
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("live duels give each crew its own keep", async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    const wins = [
      [1, "roundshot", 3],
      [3, "harpoon", 3],
      [6, "boulder", 3],
      [7, "harpoon", 3],
      [8, "boulder", 3],
    ];
    for (const [level, weapon, stars] of wins) {
      const { status, errors } = await liveDuel(browser, server, level, weapon, 8);
      assert.deepEqual(errors, [], `${level} ${weapon}`);
      assert.equal(status.won, true, `${level} ${weapon} ${status.detail}`);
      assert.equal(status.stars, stars, `${level} ${weapon} ${status.detail}`);
    }
    for (const [level, weapon] of [[3, "roundshot"], [6, "roundshot"], [8, "harpoon"]]) {
      const { status, errors } = await liveDuel(browser, server, level, weapon, 8);
      assert.deepEqual(errors, [], `${level} ${weapon}`);
      assert.equal(status.won && status.stars === 3, false, `${level} ${weapon} ${status.detail}`);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function nextFrames(page, n) {
  await page.evaluate((count) => new Promise((resolve) => {
    let left = count;
    const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }), n);
}

test("blocked storage still boots, and a full quota still ends the siege", async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    const port = server.address().port;

    const blocked = await browser.newPage({ viewport: { width: 360, height: 640 } });
    const blockedErrors = [];
    blocked.on("pageerror", (error) => blockedErrors.push(String(error)));
    await blocked.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() { throw new DOMException("storage is off", "SecurityError"); },
      });
    });
    await blocked.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: "networkidle" });
    await blocked.getByRole("button", { name: "Begin the siege" }).click();
    await blocked.waitForFunction(() => window.__grokstone.screen === "battle" && window.__grokstone.phase === "aim");
    assert.deepEqual(blockedErrors, []);
    await blocked.close();

    const full = await browser.newPage({ viewport: { width: 360, height: 640 } });
    const fullErrors = [];
    full.on("pageerror", (error) => fullErrors.push(String(error)));
    await full.addInitScript(() => {
      Storage.prototype.setItem = function setItem() {
        throw new DOMException("quota", "QuotaExceededError");
      };
    });
    await full.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: "networkidle" });
    await full.getByRole("button", { name: "Begin the siege" }).click();
    for (let i = 0; i < 6; i++) {
      if (await full.evaluate(() => window.__grokstone.screen === "result")) break;
      await full.waitForFunction(() => window.__grokstone.phase === "aim" && window.__grokstone.screen === "battle", null, { timeout: 12000 });
      await full.evaluate(() => window.__grokstone.fireSolution());
      await full.waitForFunction(() => {
        const game = window.__grokstone;
        return (game.phase === "aim" && game.screen === "battle") || game.screen === "result";
      }, null, { timeout: 12000 });
    }
    await full.waitForSelector("#result:not([hidden])", { timeout: 8000 });
    const before = await full.evaluate(() => window.__grokstone.time);
    await nextFrames(full, 3);
    assert.ok(await full.evaluate(() => window.__grokstone.time) > before, "the frame loop stopped");
    assert.deepEqual(fullErrors, []);
    await full.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("focused buttons keep their keys, and a played daily link keeps its date", async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.addInitScript(() => {
      window.__canvasWrites = 0;
      for (const key of ["width", "height"]) {
        const desc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, key);
        Object.defineProperty(HTMLCanvasElement.prototype, key, {
          configurable: true,
          get: desc.get,
          set(value) {
            window.__canvasWrites += 1;
            desc.set.call(this, value);
          },
        });
      }
    });
    const port = server.address().port;
    await page.goto(`http://127.0.0.1:${port}/?test=1#daily=2026-01-15`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("#continue").innerText(), "Open 2026-01-15");
    await page.locator("#continue").click();
    await page.waitForFunction(() => window.__grokstone.screen === "battle" && window.__grokstone.phase === "aim");
    const layout = await page.evaluate(() => window.__grokstone.layout);
    assert.equal(layout.mode, "daily");
    assert.equal(layout.date, "2026-01-15");
    assert.equal(await page.locator("#level-name").innerText(), "The keep of 2026-01-15");

    await nextFrames(page, 3);
    const writes = await page.evaluate(() => window.__canvasWrites);
    await nextFrames(page, 30);
    assert.equal(await page.evaluate(() => window.__canvasWrites), writes, "the canvas was reset on a still viewport");

    await page.focus("#pause");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => window.__grokstone.screen), "pause");
    await page.locator("#resume").click();
    await page.focus('[data-weapon="roundshot"]');
    await page.keyboard.press("Space");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.weapon), "roundshot", "a keyboard crew pick lost focus");
    await page.focus("#mute");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#mute").getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => window.__grokstone.shots), 0, "a focused button fired the cannon");
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__grokstone.shots === 1);
    await page.evaluate(() => {
      for (const key of ["r", "m"]) {
        for (const mod of ["metaKey", "ctrlKey", "altKey"]) {
          window.dispatchEvent(new KeyboardEvent("keydown", { key, [mod]: true, bubbles: true, cancelable: true }));
        }
      }
    });
    assert.equal(await page.evaluate(() => window.__grokstone.shots), 1, "a browser shortcut restarted the keep");
    assert.equal(await page.locator("#mute").getAttribute("aria-pressed"), "true", "a browser shortcut toggled the sound");

    await page.keyboard.down("r");
    await page.keyboard.down("r");
    await page.keyboard.up("r");
    assert.equal(await page.evaluate(() => window.__grokstone.screen), "pause");
    assert.equal(await page.evaluate(() => document.activeElement.id), "pause-retry");
    assert.equal(await page.evaluate(() => window.__grokstone.shots), 1);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => window.__grokstone.shots), 1);
    await page.keyboard.press("r");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => window.__grokstone.screen), "battle");
    assert.equal(await page.evaluate(() => window.__grokstone.shots), 0);
    assert.deepEqual(await page.evaluate(() => window.__grokstone.layout), layout);
    await page.waitForFunction(() => window.__grokstone.phase === "aim" || window.__grokstone.screen === "result", null, { timeout: 12000 });
    if (await page.evaluate(() => window.__grokstone.screen === "battle")) {
      await page.keyboard.press("Escape");
      await page.locator("#pause-title").click();
    } else {
      await page.locator("#result-title-btn").click();
    }
    assert.equal(await page.evaluate(() => location.hash), "");
    assert.doesNotMatch(await page.locator("#continue").innerText(), /Open/);
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("a pause during the rival's wind-up keeps the wind-up", async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    const port = server.address().port;
    await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Begin the siege" }).click();
    await page.waitForFunction(() => window.__grokstone.phase === "aim");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__grokstone.phase === "enemy" || window.__grokstone.screen === "result", null, { timeout: 12000 });
    assert.equal(await page.evaluate(() => window.__grokstone.screen), "battle", "one shot ended the first keep");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    await page.keyboard.press("Escape");
    await nextFrames(page, 3);
    assert.equal(await page.evaluate(() => window.__grokstone.phase), "enemy", "the rival fired the moment the pause ended");
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("releasing a held outline hits its marked stone first", async (t) => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.addInitScript(save => localStorage.setItem("grokstone-v1", JSON.stringify(save)), {
      ...defaultSave(), unlocked: 8, weapons: ["roundshot", "keg", "harpoon", "boulder"],
    });
    for (const [width, height] of [[360, 640], [390, 844], [1280, 800]]) {
      await page.setViewportSize({ width, height });
      for (const [level, weapon, target, expected] of [
        [2, "roundshot", "e3x1", "e4x2"], // screened on the descending arc
        [2, "roundshot", "e2x3", "e2x3"], // clear line to gold
        [4, "keg", "efootb", "efootb"],
        [3, "harpoon", "efootb", "efootb"],
        [6, "boulder", "efootb", "efootb"],
      ]) {
        await page.goto(`http://127.0.0.1:${server.address().port}/?test=1&keep=${level}&target=${target}&width=${width}#l=${level}`);
        await page.locator("#continue").click();
        await page.locator(`[data-weapon="${weapon}"]`).click();
        const [from, to] = await page.evaluate(target =>
          ["cannon", target].map(id => window.__grokstone.clientFor(id)), target);
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 4 });
        await nextFrames(page, 2);
        const outline = await page.evaluate(() => window.__grokstone.outline());
        assert.equal(outline, expected, `${width}px ${weapon} toward ${target}`);
        await page.mouse.up();
        await page.waitForFunction(() => window.__grokstone.firstDamageId, null, { timeout: 4000 });
        assert.equal(await page.evaluate(() => window.__grokstone.firstDamageId), outline);
        assert.equal(await page.evaluate(() => window.__grokstone.shots), 1);
      }
      t.diagnostic(`${width}×${height}: all five held outlines matched first HP loss`);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test("one-thumb cancellation, interruptions and a complete rival turn", async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, reducedMotion: "reduce" });
    await page.goto(`http://127.0.0.1:${server.address().port}/?test=1`);
    await page.locator("#continue").click();
    const goal = await page.locator("#keep-goal").boundingBox();
    assert.match(await page.locator("#keep-goal").innerText(), /One foot is gold/);
    const [start, target, base] = await page.evaluate(() =>
      ["cannon", "e0x0", "p0x0"].map(id => window.__grokstone.clientFor(id)));
    assert.ok(goal.y > base.y && goal.y > target.y);
    const client = await page.context().newCDPSession(page);
    const send = (type, ...points) => client.send("Input.dispatchTouchEvent", { type,
      touchPoints: points.map((point, i) => ({ ...point, id: i + 1 })),
    });
    const begin = async () => {
      await send("touchStart", start);
      await send("touchMove", target);
    };
    const noShots = async () => assert.equal(await page.evaluate(() => window.__grokstone.shots), 0);
    await send("touchStart", target);
    await send("touchEnd");
    await noShots();
    await begin();
    await send("touchMove", start);
    await send("touchEnd");
    await noShots();
    await begin();
    await send("touchCancel");
    await noShots();
    await begin();
    const outline = await page.evaluate(() => window.__grokstone.outline());
    await send("touchStart", target, base);
    await send("touchMove", target, start);
    assert.equal(await page.evaluate(() => window.__grokstone.outline()), outline);
    await send("touchEnd");
    await noShots();
    await begin();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await send("touchEnd");
    await noShots();
    await begin();
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await send("touchEnd");
    await noShots();

    // Record the visible DOM on every frame, including flight and settlement.
    await page.evaluate(() => {
      window.turnFrames = [];
      function observe() {
        const game = window.__grokstone;
        window.turnFrames.push([game.phase, document.querySelector("#shot-count").textContent,
          getComputedStyle(document.querySelector("#hint")).visibility, game.firstDamageId]);
        if (game.shots === 0 || game.phase !== "aim") requestAnimationFrame(observe);
      }
      observe();
    });
    await begin();
    await send("touchEnd");
    await page.waitForFunction(() => window.__grokstone.shots === 1 && window.__grokstone.phase === "aim", null, { timeout: 15000 });
    await nextFrames(page, 2);
    const frames = await page.evaluate(() => window.turnFrames);
    const enemy = frames.findIndex(([phase]) => phase === "enemy");
    assert.ok(enemy > 0 && frames.slice(0, enemy).some(([phase]) => phase === "sim"));
    const rival = frames.slice(enemy, -1);
    assert.ok(rival.some(([phase]) => phase === "sim"));
    assert.ok(rival.some(([phase, , , damage]) => phase === "sim" && damage));
    assert.ok(rival.every(([, label]) => label === "Their shot"));
    assert.ok(frames.every(([phase, , visibility]) => visibility === (phase === "aim" ? "visible" : "hidden")));
    assert.deepEqual(frames.at(-1).slice(0, 3), ["aim", "Shot 2 · par 3", "visible"]);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
