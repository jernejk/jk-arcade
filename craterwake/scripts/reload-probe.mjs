// Run separately from npm test: real display timing depends on the host.
import { startServer } from './harness.js';
import { summarize } from './salvo-timing.js';

// A separately installed Playwright must supply both the driver and its WebKit.
const { devices, webkit } = await import(
  process.env.CRATERWAKE_PLAYWRIGHT || 'playwright-core'
);

async function openingShot(page) {
  await page.evaluate(async () => {
    window.sampleOpening = (
      await import('./scripts/salvo-timing.js')
    ).measureSalvo;
  });
  await page.locator('#start').tap();
  await page.waitForFunction(() => window.__craterwake?.calls > 0);
  const result = page.evaluate(() => window.sampleOpening(window, 'chain'));
  await page.waitForTimeout(400);
  await page.locator('#fire').tap();
  return result;
}

const server = await startServer();
const url =
  'http://127.0.0.1:' + server.address().port + '/craterwake/?seed=824';
const pooled = new Map();
try {
  for (let run = 1; run <= 10; run++) {
    const browser = await webkit.launch();
    try {
      const page = await browser.newPage({
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      });
      if (run === 1)
        console.log(
          'Headless WebKit',
          browser.version(),
          '· 390 × 844 · DPR 3 · seed 824',
        );
      await page.goto(url);
      for (const mode of ['fresh', 'same-tab reload', 'in-session restart']) {
        if (mode === 'same-tab reload') await page.reload();
        if (mode === 'in-session restart') {
          await page.locator('#pause').tap();
          await page.getByRole('button', { name: 'Back to title' }).tap();
        }
        for (const [phase, samples] of Object.entries(
          await openingShot(page),
        )) {
          const name = mode + ' · ' + phase;
          if (!pooled.has(name)) pooled.set(name, []);
          pooled.get(name).push(...samples);
          const stats = summarize(samples);
          console.log(run, name, stats);
          if (mode === 'same-tab reload' && (stats.p95 > 20 || stats.over))
            process.exitCode = 1;
        }
      }
    } finally {
      await browser.close();
    }
  }
  console.table(
    Object.fromEntries(
      [...pooled].map(([name, samples]) => [name, summarize(samples)]),
    ),
  );
} finally {
  server.closeAllConnections();
  server.close();
}
