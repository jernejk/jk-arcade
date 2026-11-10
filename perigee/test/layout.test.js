import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeNight } from "../logic.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

async function loadChromium() {
  const require = createRequire(path.join(root, "package.json"));
  for (const name of ["playwright", "playwright-core"]) {
    try {
      const mod = require(name);
      if (mod.chromium) return mod.chromium;
    } catch {}
  }
  return null;
}

async function launch(chromium) {
  try {
    return await chromium.launch({ channel: "chrome", args: ["--no-sandbox"] });
  } catch (channelError) {
    try {
      return await chromium.launch({ args: ["--no-sandbox"] });
    } catch (bundledError) {
      const reason = channelError.message || bundledError.message;
      return { missing: reason };
    }
  }
}

function serve() {
  const server = createServer(async (req, res) => {
    try {
      const file = path.join(root, decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname));
      const body = await readFile(file);
      res.writeHead(200, { "content-type": types[path.extname(file)] || "text/plain" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("missing");
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const sample = {
  date: "2026-11-03",
  number: 3,
  goal: "Perfect 2 rifts tonight",
  score: 2806,
  medal: "gold",
  history: Array.from({ length: 30 }, (_, i) => ({ result: i % 5 === 0 ? "cash" : i % 2 ? "good" : "perfect" })),
};

test("a shared night link fits, and a short title stays off the ring", async (t) => {
  const chromium = await loadChromium();
  if (!chromium) {
    t.skip("playwright-core is not installed. In perigee/, run npm install, then npm test. No browser found.");
    return;
  }
  const browser = await launch(chromium);
  if (browser.missing) {
    t.skip(`no browser found: ${browser.missing}`);
    return;
  }
  const server = await serve();
  const port = server.address().port;
  const hash = encodeNight(sample);
  try {
    for (const width of [360, 375, 390]) {
      const page = await (await browser.newContext({
        viewport: { width, height: 780 },
        hasTouch: true,
        isMobile: true,
      })).newPage();
      await page.goto(`http://127.0.0.1:${port}/index.html${hash}`);
      const box = await page.evaluate(() => {
        const row = document.querySelector("#challenge-row");
        const card = document.querySelector("#challenge");
        const app = document.querySelector("#app");
        return {
          night: document.querySelector("#challenge-k").textContent,
          goal: document.querySelector("#challenge-goal").textContent,
          row: row.textContent,
          rowWidth: row.scrollWidth,
          cardWidth: card.scrollWidth,
          appWidth: app.scrollWidth,
          inner: window.innerWidth,
          hidden: card.hidden,
        };
      });
      assert.equal(box.hidden, false);
      assert.match(box.night, /Night 3/);
      assert.match(box.goal, /Perfect 2 rifts tonight/);
      assert.match(box.goal, /2,806/);
      assert.ok(box.row.includes("★") && box.row.includes("☆") && box.row.includes("✶"));
      assert.ok(box.rowWidth <= box.inner, `${width} row ${box.rowWidth}`);
      assert.ok(box.cardWidth <= box.inner, `${width} card ${box.cardWidth}`);
      assert.ok(box.appWidth <= box.inner + 1, `${width} app ${box.appWidth}`);
      await page.close();
    }
    for (const [width, height] of [[360, 640], [375, 667]]) {
      const page = await (await browser.newContext({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
      })).newPage();
      await page.addInitScript(() => {
        localStorage.setItem("perigee-v2", JSON.stringify({
          quietUnlocked: true,
          runs: 6,
          nights: [{ date: "2026-11-10", medal: "gold", stars: 3, goal: "rift" }],
          nightsCleared: 1,
        }));
      });
      await page.goto(`http://127.0.0.1:${port}/index.html`);
      const box = await page.evaluate(() => {
        const dock = document.querySelector("#title-dock").getBoundingClientRect();
        const play = document.querySelector("#btn-play").getBoundingClientRect();
        const orbit = window.__perigee.orbit;
        return {
          dockTop: dock.top,
          ringBottom: orbit.cy + orbit.r,
          playBottom: play.bottom,
          slots: document.querySelectorAll("#week-sky i").length,
          h: window.innerHeight,
        };
      });
      assert.equal(box.slots, 7);
      assert.ok(box.dockTop >= box.ringBottom - 8, `${width}x${height} dock ${box.dockTop} ring ${box.ringBottom}`);
      assert.ok(box.playBottom <= box.h, `${width} play ${box.playBottom}`);
      await page.evaluate(() => document.querySelector("#btn-play").click());
      await page.waitForTimeout(250);
      const playing = await page.evaluate(() => {
        const header = document.querySelector(".top").getBoundingClientRect().bottom;
        const dock = document.querySelector(".dock").getBoundingClientRect().top;
        const orbit = window.__perigee.orbit;
        const meta = document.querySelector("#meta");
        return {
          header,
          dock,
          top: orbit.cy - orbit.r,
          bottom: orbit.cy + orbit.r,
          metaText: meta.textContent,
          overflow: meta.scrollWidth - meta.clientWidth,
        };
      });
      assert.ok(playing.top >= playing.header - 1, `${width}x${height} ring ${playing.top} header ${playing.header}`);
      assert.ok(playing.bottom <= playing.dock + 1, `${width}x${height} ring ${playing.bottom} dock ${playing.dock}`);
      assert.ok(playing.overflow <= 1, `${width} meta ${playing.metaText}`);
      await page.close();
    }
    const challenge = await (await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })).newPage();
    await challenge.goto(`http://127.0.0.1:${port}/index.html${hash}`);
    const playVisible = await challenge.evaluate(() => {
      const play = document.querySelector("#btn-play");
      const tonight = document.querySelector("#btn-daily");
      return play.getBoundingClientRect().height > 0 && tonight.getBoundingClientRect().height > 0;
    });
    assert.equal(playVisible, true);
    await challenge.evaluate(() => document.querySelector("#btn-challenge").click());
    const started = Date.now();
    while (Date.now() - started < 90000) {
      const state = await challenge.evaluate(() => window.__perigee.mode);
      if (state === "over") break;
      const tap = await challenge.evaluate(() => {
        const run = window.__perigee.run;
        return run && run.phase === "playing" && (run.zone === "perfect" || (run.zone === "echo" && run.pot > 0));
      });
      if (tap) await challenge.touchscreen.tap(195, 280);
      await challenge.waitForTimeout(16);
    }
    for (let i = 0; i < 4; i++) {
      if (await challenge.evaluate(() => document.querySelector("#reveal").hidden)) break;
      await challenge.evaluate(() => document.querySelector("#btn-reveal-close").click());
    }
    const verdict = await challenge.evaluate(() => ({
      reason: document.querySelector("#reason").textContent,
      yours: document.querySelector("#share-row").textContent,
      theirs: document.querySelector("#share-theirs").textContent,
      hash: location.hash,
    }));
    assert.match(verdict.reason, /Beat it by|short|Matched/);
    assert.ok(verdict.yours.length > 0 && verdict.theirs.length > 0);
    assert.equal(verdict.hash, "");
    await challenge.evaluate(() => document.querySelector("#btn-share").click());
    const shared = await challenge.evaluate(() => window.__perigee.lastShare);
    assert.match(shared.href, /^https?:\/\/.+#night\?/);
    assert.match(shared.href, /d=2026-11-03/);
    assert.equal(shared.date, "2026-11-03");
    await challenge.evaluate(() => document.querySelector("#btn-home").click());
    const home = await challenge.evaluate(() => ({
      play: document.querySelector("#btn-play").getBoundingClientRect().height,
      hash: location.hash,
      challengeHidden: document.querySelector("#challenge").hidden,
    }));
    assert.ok(home.play > 0);
    assert.equal(home.hash, "");
    assert.equal(home.challengeHidden, true);
    await challenge.close();
  } finally {
    await browser.close();
    server.close();
  }
});
