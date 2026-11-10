import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

async function browser() {
  try {
    const require = createRequire("/tmp/pw/package.json");
    return require("playwright-core").chromium;
  } catch {
    return null;
  }
}

test("the result panel does not overflow at 360, 375, or 390", async (t) => {
  const chromium = await browser();
  if (!chromium) {
    t.skip("playwright-core is not available");
    return;
  }
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
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const chrome = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  try {
    for (const width of [360, 375, 390]) {
      const page = await (await chrome.newContext({ viewport: { width, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
      await page.goto(`http://127.0.0.1:${port}/index.html`);
      const box = await page.evaluate(() => {
        const row = document.querySelector("#share-row");
        const over = document.querySelector("#over-dock");
        const title = document.querySelector("#title-dock");
        title.hidden = true;
        over.hidden = false;
        row.hidden = false;
        row.textContent = `${"★".repeat(10)}\n${"●".repeat(10)}\n${"◌".repeat(10)}`;
        document.querySelector("#detail").textContent = "30 flings · 24 perfect · 6 cashed · New best · streak 3 · lost 24,400 unbanked";
        document.querySelector("#unlock").hidden = false;
        document.querySelector("#unlock").textContent = "Tonight's seal lit · Wick moon · Pearl trail · Harbor sky";
        const app = document.querySelector("#app");
        return {
          app: app.scrollWidth,
          over: over.scrollWidth,
          row: row.scrollWidth,
          inner: window.innerWidth,
        };
      });
      assert.ok(box.app <= box.inner + 1, `${width} app ${box.app}`);
      assert.ok(box.over <= box.inner + 1, `${width} over ${box.over}`);
      assert.ok(box.row <= box.inner - 20, `${width} row ${box.row}`);
      await page.close();
    }
  } finally {
    await chrome.close();
    server.close();
  }
});
