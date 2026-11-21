import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const file = path.join(root, rel);
      if (!file.startsWith(root) || rel.includes('node_modules')) throw new Error('forbidden');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('missing');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

export async function launchBrowser() {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    return { skip: 'playwright-core is not installed (run npm install)' };
  }
  const attempts = [];
  if (process.env.LEADLIGHT_CHROME) attempts.push({ executablePath: process.env.LEADLIGHT_CHROME });
  attempts.push({}, { channel: 'chrome' });
  for (const opts of attempts) {
    try {
      return { browser: await chromium.launch({ headless: true, ...opts }) };
    } catch {}
  }
  return { skip: 'no Chromium found (npx playwright install chromium, or set LEADLIGHT_CHROME)' };
}
