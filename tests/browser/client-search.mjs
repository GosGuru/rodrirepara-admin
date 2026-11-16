import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../.cache/browser-check/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url)) });
const results = [];
try {
  for (const width of [1440, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(5000);
    try {
      await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
      await page.getByRole('button', { name: 'Clientes e historial', exact: true }).click();
      const view = page.locator('.clients-view'), cards = view.locator('article.client');
      const names = await cards.locator('h3').allTextContents();
      assert.ok(names.includes('María') && names.includes('Juan'), 'all seeded clients are initially visible');
      const search = view.getByRole('searchbox', { name: 'Buscar clientes' });
      const create = view.getByRole('button', { name: 'Nuevo cliente', exact: true });
      assert.equal(await create.locator('svg.lucide-plus').count(), 1, 'quick create has a visible plus icon');
      for (const control of [search, create]) {
        const rect = await control.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width && rect.height >= 44, 'controls fit and remain usable');
      }
      await search.fill('maria');
      assert.deepEqual(await cards.locator('h3').allTextContents(), ['María'], 'name search ignores case and accents');
      await search.fill('sin-coincidencia-123');
      assert.equal(await cards.count(), 0); assert.equal(await view.getByText('No se encontraron clientes.').isVisible(), true);
      await search.fill(''); assert.deepEqual(await cards.locator('h3').allTextContents(), names, 'clearing search restores the full list');
      const phone = await cards.first().locator('.mv-client-header p').first().innerText();
      await search.fill(phone); assert.ok(await cards.count() >= 1); assert.ok((await cards.locator('h3').allTextContents()).includes(names[0]), 'phone search finds client');
      await search.fill('');
      const before = await page.evaluate(() => localStorage.getItem('rodrigo-crm'));
      await create.click(); const dialog = page.getByRole('dialog', { name: 'Nuevo cliente' });
      assert.equal(await dialog.isVisible(), true); await dialog.getByRole('button', { name: 'Cerrar diálogo' }).click();
      await dialog.waitFor({ state: 'hidden' }); assert.equal(await page.evaluate(() => localStorage.getItem('rodrigo-crm')), before);
      assert.deepEqual(await cards.locator('h3').allTextContents(), names, 'closing without saving preserves all clients');
      await create.click();
      const newClient = page.getByRole('dialog', { name: 'Nuevo cliente' });
      await newClient.getByLabel('Nombre', { exact: true }).fill('Cliente temporal');
      await newClient.getByLabel('Teléfono', { exact: true }).fill('12345678');
      await newClient.getByRole('button', { name: 'Guardar', exact: true }).click();
      await newClient.waitFor({ state: 'hidden' });
      assert.deepEqual(await cards.locator('h3').allTextContents(), [...names, 'Cliente temporal'], 'new client joins the list after saving');
      results.push({ width, status: 'pass' });
    } catch (error) { results.push({ width, status: 'fail', error: error.stack }); process.exitCode = 1; }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
