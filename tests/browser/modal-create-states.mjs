import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../.cache/browser-check/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url)) });
const results = [];
async function check(name, fn) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  try {
    await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
    await page.locator('.ob-actions').getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nombre', { exact: true }).fill('Cliente temporal');
    await dialog.getByLabel('Teléfono', { exact: true }).fill('12345678');
    await fn(page, dialog);
    results.push({ name, status: 'pass' });
  } catch (error) { results.push({ name, status: 'fail', error: error.stack }); process.exitCode = 1; }
  finally { await context.close(); }
}
try {
  await check('pending write disables save', async (page, dialog) => {
    await page.evaluate(() => new Promise(resolve => {
      navigator.locks.request('rodrigo-crm', () => new Promise(release => { window.releaseModalTestLock = release; resolve(); }));
    }));
    try {
      await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
      const saving = dialog.getByRole('button', { name: 'Guardando…', exact: true });
      await saving.waitFor(); assert.equal(await saving.isDisabled(), true);
      assert.equal(await dialog.getByLabel('Nombre', { exact: true }).inputValue(), 'Cliente temporal');
    } finally { await page.evaluate(() => window.releaseModalTestLock()); }
    await dialog.waitFor({ state: 'hidden' });
    const data = await page.evaluate(() => JSON.parse(localStorage.getItem('rodrigo-crm')));
    assert.equal(data.clients.filter(client => client.name === 'Cliente temporal').length, 1);
  });
  await check('failed write retains input and stored data', async (page, dialog) => {
    const before = await page.evaluate(() => localStorage.getItem('rodrigo-crm'));
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'rodrigo-crm') throw new DOMException('Storage disabled for test', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    assert.equal(await dialog.getByRole('alert').innerText(), 'No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.');
    assert.equal(await dialog.getByLabel('Nombre', { exact: true }).inputValue(), 'Cliente temporal');
    assert.equal(await dialog.getByLabel('Teléfono', { exact: true }).inputValue(), '12345678');
    assert.equal(await page.evaluate(() => localStorage.getItem('rodrigo-crm')), before);
    assert.equal(await dialog.getByRole('button', { name: 'Guardar', exact: true }).isEnabled(), true);
  });
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
