import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

/** Fresh isolated fixture page; no repository or stored records are used. */
export async function checkConnectedSheetOrigin(page) {
  const trigger = page.getByRole('button', { name: 'Open details', exact: true });
  const origin = await trigger.elementHandle();
  await trigger.click();
  await page.getByRole('button', { name: 'Close details', exact: true }).click();
  await page.locator('dialog[open]').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(element => document.activeElement === element, origin), true, 'A connected opener must keep receiving focus');
}

/** Removing the opener models a card moving columns without app-level focus effects. */
export async function checkRemovedSheetOrigin(page) {
  const trigger = page.getByRole('button', { name: 'Open details', exact: true });
  const origin = await trigger.elementHandle();
  await trigger.click();
  await page.getByRole('button', { name: 'Complete and remove origin', exact: true }).click();
  await page.locator('dialog[open]').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(element => element.isConnected, origin), false, 'Fixture must remove the original opener');
  assert.equal(await page.getByRole('status').innerText(), 'Operation completed');
  await page.waitForFunction(() => document.activeElement?.matches('main [role="status"], main h1'), null, { timeout: 1000 });
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    return { tag: element?.tagName, role: element?.getAttribute('role'), meaningful: element?.matches('main [role="status"], main h1') && element.getClientRects().length > 0 };
  });
  assert.equal(focus.meaningful, true, `Removed opener must return focus to visible status or heading, not BODY: ${JSON.stringify(focus)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('../../.cache/browser-check/node_modules/playwright/index.mjs');
  const executablePath = process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url));
  const browser = await chromium.launch({ headless: true, executablePath });
  const results = [];
  try {
    for (const [name, check] of [['connected origin', checkConnectedSheetOrigin], ['removed origin', checkRemovedSheetOrigin]]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
      try {
        page.setDefaultTimeout(5000);
        await page.goto(new URL('/tests/browser/fixtures/side-sheet-focus.html', process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/').href);
        await check(page);
        results.push({ name, status: 'pass' });
      } catch (error) { results.push({ name, status: 'fail', error: error.stack }); process.exitCode = 1; }
      finally { await page.context().close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: results.filter(r => r.status === 'pass').length, failed: results.filter(r => r.status === 'fail').length, results }, null, 2));
}
