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

test("phone and desktop play a keep without page errors", async () => {
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
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
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
