import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

/** Public UI in a fresh seeded context; never use a real user's browser profile. */
export async function checkMoveSelectorLayout(page) {
  await page.getByRole('combobox', { name: 'Mover RR-1047', exact: true }).selectOption('progress');
  const sheet = page.locator('dialog[open]');
  const radio = sheet.getByRole('radio').first();
  const geometry = await radio.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const label = element.closest('label');
    return { width: bounds.width, height: bounds.height, labelDisplay: getComputedStyle(label).display, labelHeight: label.getBoundingClientRect().height }; 
  });
  assert.ok(geometry.width >= 16 && geometry.width <= 24 && geometry.height >= 16 && geometry.height <= 24,
    `State radio must look like a compact selector, not a loading circle: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.labelDisplay, 'flex', 'Radio and state text must share one clear clickable row');
  assert.ok(geometry.labelHeight >= 44, 'The clickable label must be at least 44px tall');
  const save = sheet.getByRole('button', { name: 'Guardar estado', exact: true });
  assert.equal(await save.isDisabled(), true, 'Choosing an exact state is still required');
  assert.equal(await save.getAttribute('aria-busy'), 'false', 'No save is pending before selection');
  assert.equal(await save.evaluate(element => getComputedStyle(element).cursor), 'not-allowed', 'Unselected state is not an in-flight save');
  await page.screenshot({ path: `${process.env.CRM_EVIDENCE_DIR ?? '.cache/verification/move-state-selector'}/${process.env.CRM_EVIDENCE_PHASE ?? 'run'}-${page.viewportSize().width}-selector-open.png` });
  await sheet.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await sheet.waitFor({ state: 'hidden' });
}

export async function checkStageColors(page) {
  const expected = { pending: 'rgb(121, 80, 24)', progress: 'rgb(52, 88, 117)', ready: 'rgb(49, 95, 67)' };
  const surface = 'rgb(255, 255, 255)';
  const contrast = (a, b) => {
    const luminance = color => {
      const rgb = color.match(/\d+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    };
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  for (const [stage, color] of Object.entries(expected)) {
    const column = page.locator(`.ob-column--${stage}`);
    const header = column.locator(':scope > header');
    assert.equal(await header.evaluate(el => getComputedStyle(el).backgroundColor), color, `${stage} header must be fully filled with the design color`);
    if (!await column.locator('.ob-card').count()) {
      await page.getByRole('combobox', { name: 'Mover RR-1047', exact: true }).selectOption(stage);
      const sheet = page.locator('dialog[open]');
      await sheet.getByRole('radio', { name: stage === 'progress' ? 'En reparación' : 'Terminado', exact: true }).check();
      await sheet.getByRole('button', { name: 'Guardar estado', exact: true }).click();
      await sheet.waitFor({ state: 'hidden' });
    }
    const cardColor = await column.locator('.ob-card').first().evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(cardColor, surface, `${stage} cards must use the neutral base surface`);
    const headerText = await header.locator('h3').evaluate(el => getComputedStyle(el).color);
    const cardText = await column.locator('.ob-card .ob-mode').first().evaluate(el => getComputedStyle(el).color);
    assert.ok(contrast(headerText, color) >= 4.5, `${stage} header text contrast`);
    assert.ok(contrast(cardText, surface) >= 4.5, `${stage} muted card text contrast`);
  }
}

export async function checkMoveSelectorTransitions(page) {
  const card = () => page.locator('.ob-card').filter({ has: page.getByRole('combobox', { name: 'Mover RR-1047', exact: true }) });
  const originalStates = await card().locator('.ob-card-states').innerText();
  for (const [target, state] of [['progress', 'En reparación'], ['ready', 'Terminado'], ['pending', 'Esperando repuestos']]) {
    await page.getByRole('combobox', { name: 'Mover RR-1047', exact: true }).selectOption(target);
    const sheet = page.locator('dialog[open]');
    const save = sheet.getByRole('button', { name: 'Guardar estado', exact: true });
    assert.equal(await save.isDisabled(), true);
    await sheet.getByRole('radio', { name: state, exact: true }).check();
    assert.equal(await save.isEnabled(), true);
    await save.click();
    await sheet.waitFor({ state: 'hidden' });
    await page.reload();
    const moved = page.locator(`.ob-column--${target} .ob-card`).filter({ has: page.getByRole('combobox', { name: 'Mover RR-1047', exact: true }) });
    await moved.getByText(state, { exact: true }).waitFor();
    assert.equal(await moved.locator('.ob-card-states').innerText(), originalStates, 'Payment and delivery stay unchanged after each saved move/reload');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { mkdir } = await import('node:fs/promises');
  const evidenceDir = process.env.CRM_EVIDENCE_DIR ?? '.cache/verification/move-state-selector';
  await mkdir(evidenceDir, { recursive: true });
  const { chromium } = await import('../../.cache/browser-check/node_modules/playwright/index.mjs');
  const executablePath = process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url));
  const browser = await chromium.launch({ headless: true, executablePath });
  const results = [];
  try {
    for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
      for (const [name, check] of [['selector appearance', checkMoveSelectorLayout], ['stage colors', checkStageColors], ['pending/process/ready persistence', checkMoveSelectorTransitions]]) {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        const page = await context.newPage();
        try {
          page.setDefaultTimeout(5000);
          await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
          await check(page);
          results.push({ name, viewport: viewport.width, status: 'pass' });
        } catch (error) { results.push({ name, viewport: viewport.width, status: 'fail', error: error.stack }); process.exitCode = 1; }
        finally {
          await page.screenshot({ path: `${evidenceDir}/${process.env.CRM_EVIDENCE_PHASE ?? 'run'}-${viewport.width}-${name.replaceAll(' ', '-')}.png`, fullPage: true });
          await context.close();
        }
      }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: results.filter(r => r.status === 'pass').length, failed: results.filter(r => r.status === 'fail').length, results }, null, 2));
}
