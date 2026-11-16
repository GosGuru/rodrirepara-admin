import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../.cache/browser-check/node_modules/playwright/index.mjs';

const executablePath = process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url));
const browser = await chromium.launch({ headless: true, executablePath });
const results = [];
const seed = { clients: [{ id: 'client-1', name: 'Cliente prueba', phone: '123' }], orders: [], expenses: [], leads: [], payments: [], partsPurchases: [] };
const forms = [
  { title: 'Nueva reparación', fields: ['Equipo y modelo', 'Dirección o recepción', 'Falla informada'], fill: async d => { await d.locator('select[name="client"]').selectOption('client-1'); await d.getByLabel('Equipo y modelo').fill('Heladera'); await d.getByLabel('Dirección o recepción').fill('Taller'); await d.getByLabel('Falla informada').fill('No enfría'); }, key: 'orders' },
  { title: 'Nuevo cliente', fields: ['Nombre', 'Teléfono'], fill: async d => { await d.getByLabel('Nombre').fill('Ana Prueba'); await d.getByLabel('Teléfono').fill('123456'); }, key: 'clients' },
  { title: 'Registrar gasto', fields: ['Concepto', 'Importe ($)'], fill: async d => { await d.getByLabel('Concepto').fill('Combustible'); await d.getByLabel('Importe ($)').fill('1200'); }, key: 'expenses' },
];
async function run(name, viewport, fn) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  try {
    await page.addInitScript(data => localStorage.setItem('rodrigo-crm', JSON.stringify(data)), seed);
    await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
    await page.getByRole('heading', { name: 'Tablero de trabajo' }).waitFor();
    await fn(page);
    results.push({ name, viewport: viewport.width, status: 'pass' });
  } catch (error) { results.push({ name, viewport: viewport.width, status: 'fail', error: error.message }); process.exitCode = 1; }
  finally { await context.close(); }
}
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 480 }]) {
    for (const form of forms) {
      const open = async page => { await page.locator('.ob-actions').getByRole('button', { name: form.title, exact: true }).click(); return page.getByRole('dialog'); };
      await run(`${form.title}: examples`, viewport, async page => {
        const d = await open(page);
        for (const field of form.fields) { const input = d.getByLabel(field, { exact: true }); assert.ok(await input.getAttribute('placeholder'), `${field} needs an example`); assert.equal(await input.inputValue(), ''); }
      });
      await run(`${form.title}: layout and backdrop`, viewport, async page => {
        const d = await open(page), heading = d.getByRole('heading', { name: form.title }), close = d.getByRole('button', { name: 'Cerrar diálogo' }), save = d.getByRole('button', { name: 'Guardar' });
        const info = await d.evaluate(el => { const r = el.getBoundingClientRect(), h = el.querySelector('h2').getBoundingClientRect(), s = el.querySelector('button.primary').getBoundingClientRect(), c = el.querySelector('[aria-label="Cerrar diálogo"]').getBoundingClientRect(); return { r: r.toJSON(), h: h.toJSON(), s: s.toJSON(), c: c.toJSON(), backdrop: getComputedStyle(el, '::backdrop').backgroundColor, blur: getComputedStyle(el, '::backdrop').backdropFilter }; });
        assert.equal(info.backdrop, 'rgba(23, 38, 29, 0.5)'); assert.equal(info.blur, 'none');
        assert.ok(info.h.left >= info.r.left && info.h.right <= info.c.left && info.h.top >= info.r.top, 'title is not clipped or overlapping');
        assert.ok(info.c.width >= 44 && info.c.height >= 44, 'close touch target');
        assert.ok(info.s.right > info.r.left + info.r.width * .7, 'save aligns right');
        assert.ok(await heading.isVisible() && await close.isVisible() && await save.isVisible());
        const overlaps = await d.evaluate(el => {
          const scroll = el.querySelector('.create-dialog__fields') ?? el.querySelector('form');
          const clip = scroll.getBoundingClientRect(), button = el.querySelector('button.primary').getBoundingClientRect();
          return [...scroll.querySelectorAll('input, select, textarea')].filter(input => {
            const r = input.getBoundingClientRect();
            const visible = { left: Math.max(r.left, clip.left), right: Math.min(r.right, clip.right), top: Math.max(r.top, clip.top), bottom: Math.min(r.bottom, clip.bottom) };
            return visible.right > visible.left && visible.bottom > visible.top && visible.left < button.right && visible.right > button.left && visible.top < button.bottom && visible.bottom > button.top;
          }).map(input => input.name);
        });
        assert.deepEqual(overlaps, [], 'visible fields must not be obscured by the save action');
        const scroll = await d.locator('.create-dialog__fields').count() ? d.locator('.create-dialog__fields') : d.locator('form'); await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
        const boxes = await Promise.all([heading.boundingBox(), close.boundingBox(), save.boundingBox(), d.boundingBox()]);
        for (const box of boxes.slice(0, 3)) assert.ok(box.y >= boxes[3].y - 1 && box.y + box.height <= boxes[3].y + boxes[3].height + 1, 'header and save remain visible while scrolling');
      });
      await run(`${form.title}: validation and save`, viewport, async page => {
        const d = await open(page), before = await page.evaluate(() => localStorage.getItem('rodrigo-crm'));
        await d.getByRole('button', { name: 'Guardar' }).click();
        assert.equal(await d.isVisible(), true); assert.equal(await page.evaluate(() => localStorage.getItem('rodrigo-crm')), before);
        await form.fill(d); await d.getByLabel(form.fields[0], { exact: true }).press('Enter'); await d.waitFor({ state: 'hidden' });
        const after = await page.evaluate(() => JSON.parse(localStorage.getItem('rodrigo-crm')));
        assert.equal(after[form.key].length, seed[form.key].length + 1);
        for (const key of Object.keys(seed).filter(key => key !== form.key)) assert.deepEqual(after[key], seed[key]);
      });
      await run(`${form.title}: escape and close`, viewport, async page => {
        const trigger = page.locator('.ob-actions').getByRole('button', { name: form.title, exact: true });
        let d = await open(page); await page.keyboard.press('Escape'); await d.waitFor({ state: 'hidden' }); assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
        d = await open(page); await d.getByRole('button', { name: 'Cerrar diálogo' }).click(); await d.waitFor({ state: 'hidden' }); assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
      });
    }
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
