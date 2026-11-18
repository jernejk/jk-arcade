import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

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
  const executablePath = process.env.GROKSTONE_CHROME;
  return {
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(executablePath ? { executablePath } : {}),
  };
}

test("phone and desktop play a keep without page errors", async () => {
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
      }, null, { timeout: 8000 });
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
      }, null, { timeout: 8000 });
    }
    await page.waitForSelector("#result:not([hidden])", { timeout: 8000 });
    assert.match(await page.locator("#result-title").innerText(), /banner falls/i);
    assert.equal(await page.evaluate(() => window.__grokstone.won), true);
    const view = page.viewportSize();
    for (const id of ["#retry", "#result-title-btn", "#share"]) {
      const box = await page.locator(id).boundingBox();
      assert.ok(box, id);
      assert.ok(box.y >= 0 && box.y + box.height <= view.height + 1, `${id} y ${box.y}`);
    }
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
    }, null, { timeout: 8000 });
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
