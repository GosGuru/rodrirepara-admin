import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../.cache/browser-check/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true, executablePath: process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url)) });
const results = [];
async function openDetail(page) {
  await page.locator('.ob-card').filter({ has: page.getByRole('combobox', { name: 'Mover RR-1047' }) }).getByRole('button', { name: 'Ver detalle' }).click();
  return page.locator('dialog[open]');
}
const checks = [
  ['backdrop', async page => {
    const sheet = await openDetail(page);
    assert.equal(await sheet.evaluate(el => getComputedStyle(el, '::backdrop').backgroundColor), 'rgba(23, 38, 29, 0.5)');
  }],
  ['compact spacing and scrollbar', async page => {
    const sheet = await openDetail(page);
    const style = await sheet.locator('.side-sheet__body').evaluate(el => ({ padding: parseFloat(getComputedStyle(el).paddingTop), scrollbar: getComputedStyle(el).scrollbarWidth }));
    assert.ok(style.padding <= 20, JSON.stringify(style));
    assert.equal(style.scrollbar, 'thin');
  }],
  ['editor examples', async page => {
    const sheet = await openDetail(page); await sheet.getByRole('button', { name: 'Editar orden' }).click();
    assert.ok(await sheet.getByLabel('Equipo', { exact: true }).getAttribute('placeholder'));
    assert.ok(await sheet.getByLabel('Diagnóstico', { exact: true }).getAttribute('placeholder'));
    assert.ok(await sheet.getByLabel('Costo de repuestos', { exact: true }).getAttribute('placeholder'));
    assert.equal(await sheet.getByLabel('Precio final', { exact: true }).getAttribute('placeholder'), null);
  }],
  ['compact mobile payment summary preserves all values', async page => {
    const sheet = await openDetail(page); await sheet.getByRole('button', { name: 'Registrar cobro' }).click();
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const summary = sheet.locator('.payment-form__summary');
      const geometry = await summary.evaluate(el => ({
        items: [...el.children].map(item => ({ label: item.querySelector('dt').textContent.trim(), value: item.querySelector('dd').textContent.trim(), rect: item.getBoundingClientRect().toJSON() })),
        bounds: el.getBoundingClientRect().toJSON(),
      }));
      assert.deepEqual(geometry.items.map(item => item.label), ['Orden', 'Equipo', 'Precio final', 'Cobrado', 'Saldo']);
      assert.ok(geometry.items.every(item => item.value && item.rect.left >= geometry.bounds.left && item.rect.right <= geometry.bounds.right), `summary values visible at ${width}`);
      assert.ok(Math.abs(geometry.items[0].rect.top - geometry.items[1].rect.top) < 2 && geometry.items[1].rect.left >= geometry.items[0].rect.right, `summary uses distinct compact columns at ${width}`);
    }
  }],
  ['payment example', async page => {
    const sheet = await openDetail(page); await sheet.getByRole('button', { name: 'Registrar cobro' }).click();
    const amount = sheet.getByLabel('Importe ($)');
    assert.ok(await amount.getAttribute('placeholder')); assert.equal(await amount.inputValue(), '');
  }],
  ['detail edit and payment cancellation', async page => {
    const sheet = await openDetail(page);
    for (const [open, save, cancel] of [['Editar orden','Guardar cambios','Cancelar edición'], ['Registrar cobro','Guardar cobro','Cancelar cobro']]) {
      await sheet.getByRole('button', { name: open, exact: true }).click();
      const form = sheet.getByRole('form');
      assert.equal(await sheet.getByRole('button', { name: save }).getAttribute('form'), await form.getAttribute('id'));
      await page.keyboard.press('Escape'); assert.equal(await sheet.isVisible(), true);
      await sheet.getByRole('button', { name: cancel }).click(); assert.equal(await form.count(), 0);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      assert.equal(await sheet.getByRole('button', { name: open, exact: true }).evaluate(el => document.activeElement === el), true);
    }
    await page.keyboard.press('Escape'); await sheet.waitFor({ state: 'hidden' });
  }],
  ['mobile scroll and footer', async page => {
    const sheet = await openDetail(page); await sheet.getByRole('button', { name: 'Editar orden' }).click();
    const body = sheet.locator('.side-sheet__body');
    const geometry = await body.evaluate(el => { el.scrollTop = el.scrollHeight; const b = el.getBoundingClientRect(); return { scroll: el.scrollTop, width: b.width, right: b.right }; });
    assert.ok(geometry.scroll > 0 && geometry.right <= 390, JSON.stringify(geometry));
    assert.equal(await sheet.getByRole('button', { name: 'Guardar cambios' }).isVisible(), true);
    const cancel = await sheet.getByRole('button', { name: 'Cancelar edición' }).boundingBox();
    const save = await sheet.getByRole('button', { name: 'Guardar cambios' }).boundingBox();
    assert.ok(save.x > cancel.x);
  }],
  ['edit and payment saves', async page => {
    const sheet = await openDetail(page);
    await sheet.getByRole('button', { name: 'Editar orden' }).click();
    await sheet.getByLabel('Diagnóstico', { exact: true }).fill('Diagnóstico de prueba');
    await sheet.getByRole('button', { name: 'Guardar cambios' }).click();
    await sheet.getByRole('button', { name: 'Editar orden' }).waitFor();
    await sheet.getByRole('button', { name: 'Editar orden' }).click();
    assert.equal(await sheet.getByLabel('Diagnóstico', { exact: true }).inputValue(), 'Diagnóstico de prueba');
    await sheet.getByRole('button', { name: 'Cancelar edición' }).click();
    await sheet.getByRole('button', { name: 'Registrar cobro' }).click();
    await sheet.getByLabel('Importe ($)').fill('100');
    await sheet.getByRole('button', { name: 'Guardar cobro' }).click();
    await sheet.getByRole('button', { name: 'Editar orden' }).waitFor();
    assert.ok((await sheet.getByRole('region', { name: 'Cobros registrados' }).innerText()).includes('100'));
  }],
  ['footer geometry at three widths', async page => {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      const sheet = await openDetail(page);
      await sheet.getByRole('button', { name: 'Editar orden' }).click();
      const footer = await sheet.locator('.side-sheet__footer').boundingBox();
      const cancel = await sheet.getByRole('button', { name: 'Cancelar edición' }).boundingBox();
      const save = await sheet.getByRole('button', { name: 'Guardar cambios' }).boundingBox();
      for (const box of [footer, cancel, save]) assert.ok(box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= 845, JSON.stringify({ width, box }));
      assert.ok(save.x >= cancel.x + cancel.width && save.x + save.width <= footer.x + footer.width, JSON.stringify({ width, cancel, save, footer }));
      await sheet.getByRole('button', { name: 'Cancelar edición' }).click();
      await sheet.getByRole('button', { name: 'Cerrar detalle' }).click();
      await sheet.waitFor({ state: 'hidden' });
    }
  }],
  ['payment Enter submits associated form', async page => {
    const sheet = await openDetail(page);
    await sheet.getByRole('button', { name: 'Registrar cobro' }).click();
    const form = sheet.getByRole('form');
    assert.equal(await sheet.getByRole('button', { name: 'Guardar cobro' }).getAttribute('form'), await form.getAttribute('id'));
    const amount = sheet.getByLabel('Importe ($)'); await amount.fill('100'); await amount.press('Enter');
    await sheet.getByRole('button', { name: 'Editar orden' }).waitFor();
    assert.ok((await sheet.getByRole('region', { name: 'Cobros registrados' }).innerText()).includes('100'));
    await page.reload();
    const reopened = await openDetail(page);
    assert.ok((await reopened.getByRole('region', { name: 'Cobros registrados' }).innerText()).includes('100'));
  }],
  ['pending save blocks closing', async page => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const sheet = await openDetail(page);
    await sheet.getByRole('button', { name: 'Editar orden' }).click();
    await sheet.getByLabel('Diagnóstico', { exact: true }).fill('Pendiente controlado');
    // Hold the real Web Lock used by the local repository; no state or busy flags are mocked.
    await page.evaluate(() => new Promise(resolve => {
      navigator.locks.request('rodrigo-crm', () => new Promise(release => { window.releaseTestLock = release; resolve(); }));
    }));
    try {
      await sheet.getByRole('button', { name: 'Guardar cambios' }).click();
      await sheet.getByRole('button', { name: 'Guardando…' }).waitFor();
      assert.equal(await sheet.getAttribute('aria-busy'), 'true');
      assert.equal(await sheet.getByRole('button', { name: 'Cancelar edición' }).isDisabled(), true);
      assert.equal(await sheet.getByRole('button', { name: 'Cerrar detalle' }).isDisabled(), true);
      await page.keyboard.press('Escape'); assert.equal(await sheet.isVisible(), true);
      assert.ok((await sheet.boundingBox()).x > 2, 'test click is outside the desktop sheet');
      await page.evaluate(() => { document.addEventListener('click', e => { if (e.clientX === 2 && e.clientY === 2) window.outsideClickTarget = e.target === document.querySelector('dialog[open]'); }, { once: true, capture: true }); });
      await page.mouse.click(2, 2); assert.equal(await page.evaluate(() => window.outsideClickTarget), true); assert.equal(await sheet.isVisible(), true);
      assert.equal(await sheet.getByRole('form').count(), 1);
    } finally { await page.evaluate(() => window.releaseTestLock()); }
    await sheet.getByRole('button', { name: 'Editar orden' }).waitFor();
    await sheet.getByRole('button', { name: 'Editar orden' }).click();
    assert.equal(await sheet.getByLabel('Diagnóstico', { exact: true }).inputValue(), 'Pendiente controlado');
  }],
  ['saved move changes repair only', async page => {
    const card = () => page.locator('.ob-card').filter({ has: page.getByRole('combobox', { name: 'Mover RR-1047' }) });
    const states = await card().locator('.ob-card-states').innerText();
    await page.getByRole('combobox', { name: 'Mover RR-1047' }).selectOption('progress');
    const sheet = page.locator('dialog[open]');
    await sheet.getByRole('radio', { name: 'En reparación', exact: true }).check();
    await sheet.getByRole('button', { name: 'Guardar estado' }).click();
    await sheet.waitFor({ state: 'hidden' }); await page.reload();
    const moved = page.locator('.ob-column--progress .ob-card').filter({ has: page.getByRole('combobox', { name: 'Mover RR-1047' }) });
    await moved.getByText('En reparación', { exact: true }).waitFor();
    assert.equal(await moved.locator('.ob-card-states').innerText(), states);
  }],
  ['move and metric sheets', async page => {
    await page.getByRole('combobox', { name: 'Mover RR-1047' }).selectOption('progress');
    let sheet = page.locator('dialog[open]'); assert.equal(await sheet.getByRole('button', { name: 'Guardar estado' }).isDisabled(), true);
    await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click(); await sheet.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: /^Ver detalles de / }).first().click();
    sheet = page.locator('dialog[open]'); assert.equal(await sheet.isVisible(), true); await page.keyboard.press('Escape'); await sheet.waitFor({ state: 'hidden' });
  }],
];
try {
  for (const [name, check] of checks) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage(); page.setDefaultTimeout(5000);
      await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/'); await check(page);
      results.push({ name, status: 'pass' });
    } catch (error) { results.push({ name, status: 'fail', error: error.stack }); process.exitCode = 1; }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
