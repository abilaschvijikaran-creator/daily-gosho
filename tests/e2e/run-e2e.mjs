// End-to-end check of the real app in a real browser (installed Google Chrome),
// with an iPhone-sized viewport. It needs the app running with its function:
//   npm run preview:full        (in one terminal; builds, then serves on port 8788)
//   npm run test:e2e            (in another terminal)
// It calls the LIVE official and blog sources, so it needs an internet connection.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.APP_URL ?? 'http://localhost:8788/';
const SHOTS = process.env.SHOT_DIR ?? join(process.cwd(), 'e2e-screenshots');
mkdirSync(SHOTS, { recursive: true });

const failures = [];
const passes = [];

function check(name, condition, detail = '') {
  if (condition) passes.push(name);
  else failures.push(`${name}${detail ? ` – ${detail}` : ''}`);
}

/** The London date the test expects, computed independently of the app code. */
function expectedLondonIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14 CSS size
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'en-GB',
  timezoneId: 'Europe/London',
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error)));

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const iso = expectedLondonIso();
  const dateHeading = await page.locator('h1.date').innerText();
  check('UK date is shown on open', dateHeading.length > 0, dateHeading);
  check('date sub-line shows the London ISO date', (await page.locator('.today-header').innerText()).includes(iso));

  const button = page.getByRole('button', { name: 'Get Today’s Guidance' });
  check('main button is visible on open', await button.isVisible());

  const noHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  check('no horizontal scroll at 390px wide', noHorizontalScroll);

  await page.screenshot({ path: join(SHOTS, '01-open.png'), fullPage: false });

  await button.click();
  // Live retrieval: wait for the official quotation to appear, or give up after 30 seconds.
  const quote = page.locator('figure.passage blockquote').first();
  await quote.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  const shownText = (await quote.count()) > 0 ? await quote.innerText() : '';
  check('live retrieval shows a passage', shownText.length > 0, 'no passage appeared – check the internet connection');
  check('a passage from the verified source is labelled', (await page.locator('body').innerText()).includes('Primary · '));
  check(
    'source link is present and points to the official site or blog',
    (await page.locator('a[href*="sokaglobal.org"]').count()) > 0 &&
      (await page.locator('a[href*="brilliantbrenteastbuddhists"]').count()) > 0,
  );
  check('reflection shows template label', (await page.locator('body').innerText()).includes('Generated from templates on this device'));
  check('no horizontal scroll after retrieval', await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  ));

  await page.screenshot({ path: join(SHOTS, '02-result.png'), fullPage: true });

  await page.getByRole('button', { name: 'Copy today’s determination' }).click();
  check('copy shows accessible feedback', (await page.getByText('Copied to clipboard.').count()) > 0);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check('clipboard holds the determination', clip.includes('My determination for'), clip.slice(0, 60));

  // Simulated outage: the function is unreachable, so the honest failure state must appear.
  await page.route('**/api/daily*', (route) => route.abort());
  await button.click();
  check('network failure shows a retrieval-failed alert', (await page.getByRole('alert').count()) > 0);
  check('retry button is offered after failure', (await page.getByRole('button', { name: 'Try again' }).count()) > 0);
  await page.screenshot({ path: join(SHOTS, '03-failure.png'), fullPage: false });
  await page.unroute('**/api/daily*');

  // Dark appearance.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: join(SHOTS, '04-dark.png'), fullPage: false });
  await page.emulateMedia({ colorScheme: 'light' });

  // Favourites round trip on this device.
  await page.getByRole('button', { name: 'Get Today’s Guidance' }).click();
  await quote.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  await page.getByRole('button', { name: '☆ Save to favourites' }).last().click();
  await page.getByRole('button', { name: 'Favourites', exact: true }).click();
  check('a saved favourite appears in the Favourites tab', (await page.locator('.list .card').count()) > 0);

  // Settings: clearing removes personal data (dialog is accepted automatically).
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Delete all personal data on this device' }).click();
  await page.getByRole('button', { name: 'Favourites', exact: true }).click();
  check('clearing removes favourites', (await page.locator('.list .card').count()) === 0);
} catch (error) {
  failures.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await browser.close();
}

const realErrors = consoleErrors.filter((text) => !/Failed to load resource|net::ERR|aborted/i.test(text));
check('no unexpected JavaScript errors in the console', realErrors.length === 0, realErrors.join(' | '));

console.log(`\nPassed (${passes.length}):`);
for (const name of passes) console.log(`  ✓ ${name}`);
if (failures.length > 0) {
  console.log(`\nFailed (${failures.length}):`);
  for (const name of failures) console.log(`  ✗ ${name}`);
  process.exitCode = 1;
} else {
  console.log('\nAll browser checks passed.');
}
