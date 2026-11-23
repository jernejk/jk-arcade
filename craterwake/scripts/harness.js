import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = fileURLToPath(new URL('../../', import.meta.url));
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
};
export async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const rel = decodeURIComponent(
          new URL(req.url, 'http://localhost').pathname,
        ),
        file = path.resolve(root, '.' + rel);
      if (!file.startsWith(root) || rel.split('/').includes('node_modules'))
        throw Error();
      const target = (await stat(file)).isDirectory()
        ? path.join(file, 'index.html')
        : file;
      const body = await readFile(target);
      res.writeHead(200, {
        'Content-Type':
          mime[path.extname(target)] || 'application/octet-stream',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(server)),
  );
}
export async function launchBrowser() {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND')
      return { skip: 'playwright-core unavailable' };
    throw e;
  }
  const options = [{}, { channel: 'chrome' }];
  if (process.env.CRATERWAKE_CHROME)
    options.unshift({ executablePath: process.env.CRATERWAKE_CHROME });
  for (const option of options) {
    try {
      return { browser: await chromium.launch({ headless: true, ...option }) };
    } catch (e) {
      if (
        !/executable doesn't exist|not found|not installed|distribution.*chrome/i.test(
          e.message,
        )
      )
        throw e;
    }
  }
  return {
    skip: 'No Chromium available. Set CRATERWAKE_CHROME or install Chromium.',
  };
}
