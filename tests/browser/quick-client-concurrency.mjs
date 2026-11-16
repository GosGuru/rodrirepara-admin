import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../.cache/browser-check/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url)) });
const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
const seed = { clients: [{ id: 'initial', name: 'Cliente inicial', phone: '100' }], orders: [], expenses: [], leads: [], payments: [], partsPurchases: [] };
try {
  const a = await context.newPage();
  await a.addInitScript(data => { if (localStorage.getItem('rodrigo-crm') === null) localStorage.setItem('rodrigo-crm', JSON.stringify(data)); }, seed);
  await a.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
  assert.equal(await a.evaluate(() => Boolean(navigator.locks)), true, 'Web Locks must be available');
  const b = await context.newPage(); await b.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
  async function prepare(page, equipment) {
    await page.getByRole('button', { name: 'Nueva reparación', exact: true }).click();
    const repair = page.getByRole('dialog', { name: 'Nueva reparación' });
    await repair.getByLabel('Equipo y modelo').fill(equipment);
    await repair.getByLabel('Dirección o recepción').fill('Taller');
    await repair.getByLabel('Falla informada').fill('No enciende');
    await repair.getByRole('button', { name: 'Agregar cliente' }).click();
    const client = page.getByRole('dialog', { name: 'Nuevo cliente' });
    await client.getByLabel('Nombre', { exact: true }).fill('Nombre duplicado');
    await client.getByLabel('Teléfono', { exact: true }).fill('555');
    return { repair, client };
  }
  const [first, second] = await Promise.all([prepare(a, 'Equipo A'), prepare(b, 'Equipo B')]);
  await Promise.all([first.client.getByRole('button', { name: 'Guardar', exact: true }).click(), second.client.getByRole('button', { name: 'Guardar', exact: true }).click()]);
  await Promise.all([first.client.waitFor({ state: 'hidden' }), second.client.waitFor({ state: 'hidden' })]);
  const [firstId, secondId] = await Promise.all([first.repair.getByRole('listbox', { name: 'Cliente' }).inputValue(), second.repair.getByRole('listbox', { name: 'Cliente' }).inputValue()]);
  assert.ok(firstId && secondId && firstId !== secondId, 'each page selects its own created identity');
  await Promise.all([first.repair.getByRole('button', { name: 'Guardar', exact: true }).click(), second.repair.getByRole('button', { name: 'Guardar', exact: true }).click()]);
  await Promise.all([first.repair.waitFor({ state: 'hidden' }), second.repair.waitFor({ state: 'hidden' })]);
  const data = await a.evaluate(() => JSON.parse(localStorage.getItem('rodrigo-crm')));
  assert.equal(data.clients.length, 3); assert.equal(data.orders.length, 2);
  assert.equal(data.orders.find(order => order.equipment === 'Equipo A')?.clientId, firstId);
  assert.equal(data.orders.find(order => order.equipment === 'Equipo B')?.clientId, secondId);
  for (const id of [firstId, secondId]) assert.deepEqual(data.clients.find(client => client.id === id), { id, name: 'Nombre duplicado', phone: '555' });
  assert.deepEqual(data.expenses, []); assert.deepEqual(data.payments, []); assert.deepEqual(data.partsPurchases, []);
  console.log('PASS: two tabs created identical clients and independently selected their own persisted identities under Web Locks.');
} finally { await context.close(); await browser.close(); }
