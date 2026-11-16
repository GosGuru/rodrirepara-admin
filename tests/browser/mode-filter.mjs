import assert from 'node:assert/strict';

const expected = {
  Todas: ['RR-1047', 'RR-1048', 'RR-1049', 'RR-1050', 'RR-1030'],
  Taller: ['RR-1047', 'RR-1050'],
  Domicilio: ['RR-1048', 'RR-1049', 'RR-1030'],
};
const content = async locator => (await locator.innerText()).replace(/\s+/g, ' ').trim();
const orderIds = page => page.locator('.orders-view tbody tr')
  .filter({ has: page.locator('td > strong') })
  .locator('td:first-child > strong').allTextContents();

/** Public UI regression: caller supplies an isolated, seeded Playwright page. */
export async function checkModePointer(page, { touch = false } = {}) {
  const activate = locator => touch ? locator.tap() : locator.click();
  await activate(page.getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('button', { name: 'Órdenes de trabajo', exact: true }));
  const control = page.getByRole('combobox', { name: /^Modalidad/ });
  const select = async value => {
    const selected = await content(control);
    await activate(control);
    assert.equal(await page.getByRole('option', { name: selected, exact: true }).getAttribute('aria-selected'), 'true', 'popup exposes current selection');
    await activate(page.getByRole('option', { name: value, exact: true }));
    assert.equal(await control.getAttribute('aria-expanded'), 'false', 'choice closes popup');
    assert.equal(await content(control), value, 'choice must commit before blur dismisses options');
    assert.equal(await control.evaluate(el => document.activeElement === el), true, 'choice returns focus to combobox');
  };
  const search = page.getByRole('searchbox', { name: 'Buscar cliente, equipo, falla u orden' });
  for (const value of ['Taller', 'Domicilio', 'Todas']) {
    await select(value);
    assert.deepEqual(await orderIds(page), expected[value], `${value} public rows`);
    await page.getByText(`${expected[value].length} órdenes`, { exact: true }).waitFor({ state: 'visible' });
  }
  await search.fill('RR-1047');
  await select('Taller');
  assert.deepEqual(await orderIds(page), ['RR-1047'], 'query and mode combine');
  assert.match(await content(page.locator('.orders-view .heading [aria-live="polite"]')), /^1\b/, 'combined count is one');
  await select('Domicilio');
  assert.deepEqual(await orderIds(page), [], 'incompatible mode yields no matches');
  assert.match(await content(page.locator('.orders-view .heading [aria-live="polite"]')), /^0\b/, 'no-results count is zero');
  assert.equal(await search.inputValue(), 'RR-1047', 'no results retains query');
  await page.getByText('No hay trabajos con estos filtros. Probá ampliar la búsqueda.').waitFor({ state: 'visible' });
  assert.match(await content(page.locator('.orders-view__criteria')), /RR-1047 · Modalidad: Domicilio/);
  await activate(page.getByRole('button', { name: 'Limpiar filtros', exact: true }));
  assert.equal(await search.inputValue(), '', 'reset clears search');
  assert.equal(await content(control), 'Todas', 'reset clears mode');
  assert.deepEqual(await orderIds(page), expected.Todas, 'reset restores every original row');
  await page.getByText('5 órdenes', { exact: true }).waitFor({ state: 'visible' });
}
