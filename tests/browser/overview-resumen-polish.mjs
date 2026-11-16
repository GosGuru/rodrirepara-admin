import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export async function checkHeading(page) {
  assert.equal(await page.getByRole('heading', { name: 'Tablero de trabajo', level: 1 }).isVisible(), true);
  assert.equal(await page.getByText('Qué está esperando', { exact: false }).count(), 0, 'Resumen subtitle must be absent');
  assert.equal((await page.locator('header.top p').innerText()).trim(), '', 'No fallback subtitle should appear');
}
export async function checkBoardHeading(page) {
  assert.equal(await page.getByRole('heading', { name: 'Reparaciones', level: 2 }).isVisible(), true);
  assert.equal(await page.getByRole('button', { name: 'Ver todos →', exact: true }).isVisible(), true);
  assert.equal(await page.getByText('Todos los trabajos activos, por estado de reparación.', { exact: true }).count(), 0, 'Board description must be absent');
}
export async function checkToolbarLayout(page) {
  const title = page.getByRole('heading', { name: 'Reparaciones', level: 2 });
  const toolbar = page.locator('.ob-toolbar'), controls = page.locator('.ob-toolbar-controls');
  const titleBox = await title.boundingBox(), toolbarBox = await toolbar.boundingBox(), controlsBox = await controls.boundingBox();
  const boardBox = await page.locator('.ob-board').boundingBox();
  const size = parseFloat(await title.evaluate(el => getComputedStyle(el).fontSize));
  await page.screenshot({ path: `${process.env.CRM_EVIDENCE_DIR ?? '.cache/verification/resumen-polish'}/${process.env.CRM_EVIDENCE_PHASE ?? 'run'}-${page.viewportSize().width}-toolbar.png`, fullPage: true });
  console.log('toolbar geometry:', JSON.stringify({ width: page.viewportSize().width, size, titleBox, toolbarBox, controlsBox, gap: boardBox.y-toolbarBox.y-toolbarBox.height }));
  assert.ok(size >= (page.viewportSize().width >= 1000 ? 35 : 30), `Reparaciones heading should use the available space: ${size}px`);
  assert.equal(await toolbar.evaluate(el => getComputedStyle(el).alignItems), 'center', 'Heading and toolbar actions align vertically');
  if (controlsBox.y < titleBox.y + titleBox.height) assert.ok(Math.abs((titleBox.y+titleBox.height/2)-(controlsBox.y+controlsBox.height/2)) <= 1, 'Heading and controls share a vertical center');
  else assert.ok(controlsBox.y >= titleBox.y+titleBox.height, 'Wrapped controls do not overlap the heading');
  assert.ok(controlsBox.x >= toolbarBox.x && controlsBox.x+controlsBox.width <= toolbarBox.x+toolbarBox.width+1, 'Controls fit inside the toolbar');
  assert.ok(boardBox.y-toolbarBox.y-toolbarBox.height <= 10, 'Excess space below the toolbar is reduced');
}
export async function checkToolbarControls(page) {
  const settings = page.getByRole('button', { name: 'Ajustar colores del tablero' });
  const all = page.getByRole('button', { name: 'Ver todos →', exact: true });
  const ratio = (a,b) => {
    const luminance = color => { const c=color.match(/\d+/g).slice(0,3).map(Number).map(v => { v/=255; return v<=.04045 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
    const [hi,lo]=[luminance(a),luminance(b)].sort((x,y)=>y-x); return (hi+.05)/(lo+.05);
  };
  for (const button of [settings, all]) {
    const box = await button.boundingBox();
    const styles = await button.evaluate(el => { const s=getComputedStyle(el); return {border:s.borderTopColor,background:s.backgroundColor,align:s.alignItems,justify:s.justifyContent,color:s.color,surface:getComputedStyle(document.documentElement).backgroundColor}; });
    assert.ok(box.width >= 44 && box.height >= 44, 'Toolbar buttons retain accessible target sizes');
    assert.equal(styles.border, 'rgba(0, 0, 0, 0)', 'Toolbar controls should not show an outlined frame');
    assert.equal(styles.background, 'rgba(0, 0, 0, 0)', 'Toolbar controls should not show a filled box');
    assert.ok(ratio(styles.color,styles.surface)>=4.5, `Toolbar text and icon contrast: ${JSON.stringify(styles)}`);
    assert.equal(styles.align, 'center'); assert.equal(styles.justify, 'center');
  }
  await settings.focus(); await page.keyboard.press('Tab');
  assert.equal(await all.evaluate(el => document.activeElement === el), true);
  const focus = await all.evaluate(el => { const s=getComputedStyle(el); return {style:s.outlineStyle,color:s.outlineColor,surface:getComputedStyle(document.documentElement).backgroundColor}; });
  assert.notEqual(focus.style, 'none', 'Keyboard focus remains visible');
  assert.ok(ratio(focus.color,focus.surface)>=3, `Keyboard focus contrast: ${JSON.stringify(focus)}`);
}
export async function checkToolbarActions(page) {
  const settings = page.getByRole('button', { name: 'Ajustar colores del tablero' });
  await settings.click(); assert.equal(await settings.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.getByText('Colores del tablero', { exact: true }).isVisible(), true);
  const panel = await page.locator('#ob-color-settings').boundingBox();
  assert.ok(panel.x >= 0 && panel.x + panel.width <= page.viewportSize().width, `Settings panel must fit the viewport: ${JSON.stringify(panel)}`);
  await settings.click(); assert.equal(await settings.getAttribute('aria-expanded'), 'false');
  await page.getByRole('button', { name: 'Ver todos →', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: 'Órdenes de trabajo', level: 1 }).isVisible(), true);
}
export async function checkQuickActionsSticky(page) {
  const bar = page.locator('.ob-actions'), metrics = page.locator('.ob-metrics');
  const initial = await bar.boundingBox(), metricBox = await metrics.boundingBox();
  assert.ok(initial.y+initial.height <= metricBox.y, 'Quick actions should appear above the indicators and board');
  assert.equal(await bar.evaluate(el => getComputedStyle(el).position), 'sticky', 'Quick actions remain available while scrolling');
  await page.setViewportSize({ width: page.viewportSize().width, height: 500 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => window.scrollY > 50);
  const pinned = await bar.boundingBox();
  await page.screenshot({ path: `${process.env.CRM_EVIDENCE_DIR ?? '.cache/verification/resumen-polish'}/${process.env.CRM_EVIDENCE_PHASE ?? 'run'}-${page.viewportSize().width}-quick-sticky.png` });
  assert.ok(Math.abs(pinned.y) <= 1 && pinned.height < 150, `Sticky actions must remain visible without covering too much content: ${JSON.stringify(pinned)}`);
}
export async function checkQuickActionsKeyboard(page) {
  const bar=page.locator('.ob-actions'), strip=bar.locator(':scope > div');
  const buttons=['Nueva reparación','Nuevo cliente','Registrar gasto','Ver trabajos →'].map(name=>bar.getByRole('button',{name,exact:true}));
  await buttons[0].focus();
  for (let i=0;i<buttons.length;i++) {
    if (i) await page.keyboard.press('Tab');
    assert.equal(await buttons[i].evaluate(el=>document.activeElement===el),true, `Keyboard reaches action ${i+1}`);
    const b=await buttons[i].boundingBox(), s=await strip.boundingBox();
    assert.ok(b.width>=44 && b.height>=44 && b.x>=s.x-1 && b.x+b.width<=s.x+s.width+1, `Focused action remains visible: ${JSON.stringify({b,s})}`);
  }
}
export async function checkQuickActionsBehavior(page) {
  const bar=page.locator('.ob-actions');
  for (const title of ['Nueva reparación','Nuevo cliente','Registrar gasto']) {
    await bar.getByRole('button',{name:title,exact:true}).click();
    const dialog=page.getByRole('dialog');
    assert.equal(await dialog.getByRole('heading',{name:title,exact:true}).isVisible(),true);
    await dialog.getByRole('button',{name:'Cerrar diálogo'}).click(); await dialog.waitFor({state:'hidden'});
  }
  await bar.getByRole('button',{name:'Ver trabajos →',exact:true}).click();
  assert.equal(await page.getByRole('heading',{name:'Órdenes de trabajo',level:1}).isVisible(),true);
}
export async function checkMoveHint(page) {
  assert.equal(await page.getByText('Arrastrá desde el asa', { exact: false }).count(), 0, 'Move hint must be absent');
}
export async function checkSeparation(page) {
  const separation = await page.locator('.ob-section').evaluate(el => {
    const style = getComputedStyle(el), box = el.getBoundingClientRect(), metrics = document.querySelector('.ob-metrics').getBoundingClientRect();
    return { width: box.width, metricsWidth: metrics.width, top: box.top, metricsBottom: metrics.bottom, border: parseFloat(style.borderTopWidth), color: style.borderTopColor, padding: parseFloat(style.paddingTop) };
  });
  assert.ok(separation.width >= separation.metricsWidth && separation.top >= separation.metricsBottom && separation.border >= 1 && separation.color === 'rgb(217, 222, 213)' && separation.padding >= 16, `Full-width spaced divider: ${JSON.stringify(separation)}`);
}
export async function checkPreservedBoard(page) {
  assert.equal(await page.locator('.ob-metric').count(), 4);
  assert.equal(await page.getByRole('button', { name: /^Ver detalles de / }).count(), 4);
  for (const [stage, header] of [['pending','rgb(121, 80, 24)'], ['progress','rgb(52, 88, 117)'], ['ready','rgb(49, 95, 67)']]) {
    const column = page.locator(`.ob-column--${stage}`);
    assert.equal(await column.locator('header').evaluate(el => getComputedStyle(el).backgroundColor), header);
    assert.equal(await column.evaluate(el => getComputedStyle(el).getPropertyValue('--ob-card').trim()), '#fff');
    if (await column.locator('.ob-card').count()) assert.equal(await column.locator('.ob-card').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
  }
  assert.ok(await page.locator('.ob-card').count() > 0);
  assert.ok(await page.getByRole('combobox', { name: /^Mover / }).count() > 0);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { mkdir } = await import('node:fs/promises');
  const evidenceDir = process.env.CRM_EVIDENCE_DIR ?? '.cache/verification/resumen-polish';
  await mkdir(evidenceDir, { recursive: true });
  const { chromium } = await import('../../.cache/browser-check/node_modules/playwright/index.mjs');
  const executablePath = process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url));
  const browser = await chromium.launch({ headless: true, executablePath });
  const results = [];
  try {
    for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }, { width: 320, height: 844 }]) {
      for (const [name, check] of [['heading', checkHeading], ['board heading', checkBoardHeading], ['toolbar layout', checkToolbarLayout], ['toolbar controls', checkToolbarControls], ['toolbar actions', checkToolbarActions], ['quick sticky', checkQuickActionsSticky], ['quick keyboard', checkQuickActionsKeyboard], ['quick behavior', checkQuickActionsBehavior], ['move hint', checkMoveHint], ['separation', checkSeparation], ['preserved board', checkPreservedBoard]]) {
        const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
        const page = await context.newPage();
        try {
          page.setDefaultTimeout(5000);
          await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
          await page.getByRole('heading', { name: 'Tablero de trabajo', level: 1 }).waitFor();
          await check(page);
          results.push({ name, viewport: viewport.width, status: 'pass' });
        } catch (error) { results.push({ name, viewport: viewport.width, status: 'fail', error: error.stack }); process.exitCode = 1; }
        finally {
          if (name === 'separation') await page.screenshot({ path: `${evidenceDir}/${process.env.CRM_EVIDENCE_PHASE ?? 'run'}-${viewport.width}.png`, fullPage: true });
          await context.close();
        }
      }
    }
    for (const width of [390,320]) {
      const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
      const page=await context.newPage(); page.setDefaultTimeout(5000);
      try {
        await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
        await page.evaluate(() => { window.__quickTouchEvents=[]; for (const type of ['touchstart','touchend']) document.addEventListener(type,e=>window.__quickTouchEvents.push({type,trusted:e.isTrusted}),true); });
        const bar=page.locator('.ob-actions');
        for (const title of ['Nueva reparación','Nuevo cliente','Registrar gasto']) {
          await bar.getByRole('button',{name:title,exact:true}).tap();
          const dialog=page.getByRole('dialog');
          assert.equal(await dialog.getByRole('heading',{name:title,exact:true}).isVisible(),true);
          await dialog.getByRole('button',{name:'Cerrar diálogo'}).tap(); await dialog.waitFor({state:'hidden'});
        }
        await bar.getByRole('button',{name:'Ver trabajos →',exact:true}).tap();
        assert.equal(await page.getByRole('heading',{name:'Órdenes de trabajo',level:1}).isVisible(),true);
        const events=await page.evaluate(()=>window.__quickTouchEvents);
        assert.ok(events.filter(e=>e.type==='touchstart').length>=7 && events.filter(e=>e.type==='touchend').length>=7 && events.every(e=>e.trusted),'Quick actions and closing dialogs use trusted native touch events');
        console.log(`quick actions touch ${width}:`,JSON.stringify(events));
        results.push({name:'quick touch',viewport:width,status:'pass'});
      } catch(error) { results.push({name:'quick touch',viewport:width,status:'fail',error:error.stack}); process.exitCode=1; }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: results.filter(r => r.status === 'pass').length, failed: results.filter(r => r.status === 'fail').length, results }, null, 2));
}
