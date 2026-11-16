import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../.cache/browser-check/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url)) });
const seed = { clients: [{ id: 'client-1', name: 'María Pérez', phone: '123' }, { id: 'client-2', name: 'Juan', phone: '456' }], orders: [], expenses: [], leads: [], payments: [], partsPurchases: [] };
const results = [];
try {
  for (const width of [1440, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 640 : 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(5000);
    try {
      await page.addInitScript(data => localStorage.setItem('rodrigo-crm', JSON.stringify(data)), seed);
      await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
      await page.getByRole('button', { name: 'Nueva reparación', exact: true }).click();
      const repair = page.getByRole('dialog', { name: 'Nueva reparación' });
      const list = repair.getByRole('listbox', { name: 'Cliente' });
      const search = repair.getByRole('searchbox', { name: 'Buscar clientes' });
      assert.equal(await list.locator('option').filter({ hasText: 'María Pérez' }).count(), 1);
      assert.equal(await list.locator('option').filter({ hasText: 'Juan' }).count(), 1);
      await search.fill('maria'); assert.equal(await list.getByRole('option', { name: /María Pérez/ }).count(), 1); assert.equal(await list.getByRole('option', { name: /Juan/ }).count(), 0);
      await list.selectOption('client-1'); await search.fill('sin coincidencia');
      assert.equal(await list.inputValue(), 'client-1', 'filtering does not discard selected identity');
      await search.fill('');
      await repair.getByLabel('Equipo y modelo').fill('Heladera de prueba');
      await repair.getByLabel('Dirección o recepción').fill('Taller de prueba');
      await repair.getByLabel('Falla informada').fill('No enfría');
      await search.fill('maria'); await search.press('Enter');
      assert.equal(await repair.isVisible(), true, 'Enter in client search must not submit a repair');
      assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('rodrigo-crm')))).orders.length, 0);
      await search.fill('');
      assert.equal(await page.locator('form form').count(), 0, 'forms are never nested');
      const add = repair.getByRole('button', { name: 'Agregar cliente', exact: true });
      await add.click(); let clientDialog = page.getByRole('dialog', { name: 'Nuevo cliente' });
      await clientDialog.getByLabel('Nombre', { exact: true }).fill('Descartado');
      await clientDialog.getByRole('button', { name: 'Cerrar diálogo' }).click(); await clientDialog.waitFor({ state: 'hidden' });
      assert.equal(await repair.getByLabel('Equipo y modelo').inputValue(), 'Heladera de prueba'); assert.equal(await list.inputValue(), 'client-1');
      assert.equal(await add.evaluate(element => element === document.activeElement), true, 'focus returns to add client');
      await add.click(); clientDialog = page.getByRole('dialog', { name: 'Nuevo cliente' });
      await clientDialog.getByLabel('Nombre', { exact: true }).fill('María Pérez');
      await clientDialog.getByLabel('Teléfono', { exact: true }).fill('123');
      await clientDialog.getByRole('button', { name: 'Guardar', exact: true }).click(); await clientDialog.waitFor({ state: 'hidden' });
      const newId = await list.inputValue(); assert.ok(newId && newId !== 'client-1', 'the exact newly created duplicate is selected');
      const afterClient = await page.evaluate(() => JSON.parse(localStorage.getItem('rodrigo-crm')));
      assert.equal(afterClient.clients.filter(client => client.name === 'María Pérez' && client.phone === '123').length, 2);
      assert.equal(afterClient.clients.find(client => client.id === newId)?.name, 'María Pérez');
      assert.equal(await repair.getByLabel('Equipo y modelo').inputValue(), 'Heladera de prueba');
      await repair.getByRole('button', { name: 'Guardar', exact: true }).click(); await repair.waitFor({ state: 'hidden' });
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rodrigo-crm')));
      assert.equal(saved.orders.length, 1); assert.equal(saved.orders[0].clientId, newId);
      assert.equal(saved.orders[0].equipment, 'Heladera de prueba');
      assert.deepEqual(saved.expenses, []); assert.deepEqual(saved.payments, []);
      results.push({ width, status: 'pass' });
    } catch (error) { results.push({ width, status: 'fail', error: error.stack }); process.exitCode = 1; }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
