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
  const require = createRequire(import.meta.url);
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
  date: "2026-11-10",
  number: 4,
  goal: "Perfect 2 rifts tonight",
  score: 2806,
  medal: "gold",
  history: Array.from({ length: 30 }, (_, i) => ({ result: i % 5 === 0 ? "cash" : i % 2 ? "good" : "perfect" })),
};

test("a shared night link fits, and a short title stays off the ring", async (t) => {
  const chromium = await loadChromium();
  if (!chromium) {
    t.skip("no browser found: playwright is not installed");
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
      assert.match(box.night, /Night 4/);
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
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
