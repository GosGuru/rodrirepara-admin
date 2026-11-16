import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

/** Public UI regression; caller supplies an isolated, seeded page. Never clicks Save. */
export async function checkOrderSheetEntry(page, id = 'RR-1047') {
  await page.getByRole('button', { name: 'Resumen', exact: true }).click();
  await page.locator('.ob-card').filter({ has: page.getByRole('combobox', { name: `Mover ${id}`, exact: true }) }).getByRole('button', { name: 'Ver detalle', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Cerrar detalle', exact: true }) });
  const detailField = dialog.locator('.inline-order-work dl > div').first();
  const layout = await detailField.evaluate(field => ({
    labelBottom: field.querySelector('dt').getBoundingClientRect().bottom,
    valueTop: field.querySelector('dd').getBoundingClientRect().top,
  }));
  assert.ok(layout.valueTop >= layout.labelBottom, `Detail labels must sit above values, not inherit the global nested two-column grid: ${JSON.stringify(layout)}`);
  for (const [open, save, cancel] of [
    ['Editar orden', 'Guardar cambios', 'Cancelar edición'],
    ['Registrar cobro', 'Guardar cobro', 'Cancelar cobro'],
  ]) {
    await dialog.getByRole('button', { name: open, exact: true }).click();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    assert.equal(await page.getByRole('status').filter({ hasText: /actualizada en este navegador|registrado en este navegador/ }).count(), 0, `${open} must not persist or announce success`);
    assert.equal(await dialog.getByRole('form').count(), 1, `${open} must leave one live form`);
    const form = dialog.getByRole('form');
    const formId = await form.getAttribute('id');
    assert.ok(formId);
    const submit = dialog.getByRole('button', { name: save, exact: true });
    assert.equal(await submit.getAttribute('form'), formId);
    assert.equal(await submit.isEnabled(), true, 'Opening is not a pending save');
    await dialog.getByRole('button', { name: cancel, exact: true }).click();
    assert.equal(await dialog.getByRole('form').count(), 0);
    assert.equal(await page.getByRole('status').filter({ hasText: /actualizada en este navegador|registrado en este navegador/ }).count(), 0, 'Cancel must not persist or announce success');
  }
  await dialog.getByRole('button', { name: 'Cerrar detalle', exact: true }).click();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('../../.cache/browser-check/node_modules/playwright/index.mjs');
  const executablePath = process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url));
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(5000);
    await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
    await checkOrderSheetEntry(page);
    console.log('PASS: edit/payment entry, live footer targets and cancellation; no save clicks or success notices.');
  } finally { await browser.close(); }
}
