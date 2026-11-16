import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../.cache/browser-check/node_modules/playwright/index.mjs';

const executablePath = process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url));
const css = await readFile(new URL('../../src/components/side-sheet.css', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true, executablePath });
const results = [];
try {
  for (const [name, reducedMotion, entered] of [
    ['reduced motion paints an open sheet before the animation frame', 'reduce', false],
    ['normal motion retains the entered state and transitions', 'no-preference', true],
  ]) {
    const context = await browser.newContext({ reducedMotion, viewport: { width: 1440, height: 900 } });
    try {
      const page = await context.newPage();
      await page.setContent(`<dialog open class="side-sheet${entered ? ' side-sheet--entered' : ''}" aria-label="Order detail"><header class="side-sheet__header">Order detail</header><div class="side-sheet__body">Service information</div><footer class="side-sheet__footer">Actions</footer></dialog>`);
      await page.addStyleTag({ content: css });
      const style = await page.getByRole('dialog', { name: 'Order detail' }).evaluate(dialog => {
        const s = getComputedStyle(dialog), box = dialog.getBoundingClientRect();
        return { opacity: s.opacity, display: s.display, transform: s.transform, transition: s.transitionDuration, left: box.left, right: box.right, top: box.top, height: box.height };
      });
      assert.equal(style.opacity, '1', JSON.stringify(style));
      assert.equal(style.display, 'flex');
      assert.ok(style.left >= 0 && style.right <= 1440 && style.top === 0 && style.height === 900, JSON.stringify(style));
      if (reducedMotion === 'reduce') {
        assert.equal(style.transform, 'none');
        assert.equal(style.transition, '0s');
      } else {
        assert.equal(style.transition, '0.22s, 0.18s');
      }
      results.push({ name, status: 'pass', style });
    } catch (error) {
      results.push({ name, status: 'fail', error: error.stack });
      process.exitCode = 1;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ passed: results.filter(r => r.status === 'pass').length, failed: results.filter(r => r.status === 'fail').length, results }, null, 2));
