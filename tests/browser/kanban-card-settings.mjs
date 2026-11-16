import assert from 'node:assert/strict';
import { chromium } from '../../.cache/browser-check/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const out = process.env.CRM_EVIDENCE_DIR;
if (!out) throw new Error('CRM_EVIDENCE_DIR is required');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CRM_BROWSER_EXECUTABLE ?? fileURLToPath(new URL('../../.cache/playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell', import.meta.url)) });
const results = [];
if (process.env.CRM_ARROW_ONLY) {
  const context = await browser.newContext({viewport:{width:1440,height:900}, deviceScaleFactor:1});
  const page = await context.newPage();
  try {
    await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
    const select = page.getByRole('combobox',{name:'Mover RR-1047'});
    await select.waitFor();
    const image = await select.screenshot({path:`${out}/arrow.png`});
    const geometry = await page.evaluate(async data => {
      const img = new Image(); img.src = data; await img.decode();
      const canvas=document.createElement('canvas'); canvas.width=img.width; canvas.height=img.height;
      const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0); const pixels=ctx.getImageData(0,0,img.width,img.height).data;
      const xs=[]; for(let y=Math.floor(img.height/2)-7;y<=Math.floor(img.height/2)+7;y++) for(let x=img.width-22;x<img.width-1;x++) { const i=(y*img.width+x)*4; if(pixels[i]<110 && pixels[i+1]<110 && pixels[i+2]<110) xs.push(x); }
      return {width:img.width,height:img.height, darkPixels:xs.length, rightmost:xs.length ? Math.max(...xs) : null, inset:xs.length ? img.width-1-Math.max(...xs) : null};
    },`data:image/png;base64,${image.toString('base64')}`);
    console.log('arrow pixel geometry:',JSON.stringify(geometry));
    assert.ok(geometry.darkPixels >= 3, 'visible arrow pixels must be measurable');
    assert.ok(geometry.inset >= 8, `arrow pixels must be inset at least 8px from select border: ${JSON.stringify(geometry)}`);
    results.push({name:'arrow inset',status:'pass'});
  } catch(error) { results.push({name:'arrow inset',status:'fail',error:error.stack}); process.exitCode=1; }
  finally { await context.close(); }
}
if (process.env.CRM_INTERACTIONS_ONLY) {
  for (const name of ['drag', 'keyboard', 'touch', 'uuid'].filter(name => !process.env.CRM_INTERACTION_CASE || name === process.env.CRM_INTERACTION_CASE)) {
    const touch=name==='touch';
    const context=await browser.newContext({viewport:{width:touch?390:1440,height:900},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
    const page=await context.newPage(); page.setDefaultTimeout(6000);
    try {
      await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
      await page.getByRole('heading',{name:'Tablero de trabajo'}).waitFor();
      const card=()=>page.locator('.ob-card').filter({has:page.getByRole('combobox',{name:'Mover RR-1047',exact:true})});
      if(name==='drag') {
        const states=await card().locator('.ob-card-states').innerText();
        await page.evaluate(() => { window.__dragEvents=[]; document.addEventListener('dragstart', e=>window.__dragEvents.push({type:e.type,trusted:e.isTrusted})); document.addEventListener('drop', e=>window.__dragEvents.push({type:e.type,trusted:e.isTrusted})); });
        const handle=card().getByRole('button',{name:/Arrastrar RR-1047/}), target=page.locator('.ob-column--progress > header');
        const from=await handle.boundingBox(), to=await target.boundingBox();
        await page.mouse.move(from.x+from.width/2,from.y+from.height/2); await page.mouse.down();
        await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:20}); await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:2}); await page.mouse.up();
        const sheet=page.locator('dialog[open]'); await sheet.getByRole('heading',{name:'Mover RR-1047'}).waitFor();
        const events=await page.evaluate(()=>window.__dragEvents); assert.deepEqual(events.map(e=>e.type),['dragstart','drop']); assert.ok(events.every(e=>e.trusted));
        await sheet.getByRole('radio',{name:'En reparación',exact:true}).check(); await sheet.getByRole('button',{name:'Guardar estado'}).click(); await sheet.waitFor({state:'hidden'});
        await page.reload(); const moved=page.locator('.ob-column--progress .ob-card').filter({has:page.getByRole('combobox',{name:'Mover RR-1047',exact:true})});
        await moved.getByText('En reparación',{exact:true}).waitFor(); assert.equal(await moved.locator('.ob-card-states').innerText(),states);
        console.log('native drag events:',JSON.stringify(events));
      } else if(name==='keyboard' || name==='touch') {
        const metrics=await page.locator('.ob-metric').allInnerTexts(), cards=await page.locator('.ob-card').allInnerTexts();
        const trigger=page.getByRole('button',{name:'Ajustar colores del tablero'});
        if(touch) await trigger.tap(); else { await trigger.focus(); await page.keyboard.press('Enter'); }
        const select=page.getByRole('combobox',{name:'Color de Pendientes'}); await select.waitFor();
        if(touch) await select.tap(); else await page.keyboard.press('Tab');
        assert.equal(await select.evaluate(el=>document.activeElement===el),true);
        if (touch) { await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); }
        else {
          await page.evaluate(() => { window.__colorEvents=[]; for (const type of ['keydown','input','change','keyup']) document.addEventListener(type,e => { if (e.target?.getAttribute?.('aria-label') === 'Color de Pendientes') window.__colorEvents.push({type,key:e.key ?? null,trusted:e.isTrusted}); },true); });
          await page.keyboard.press('a'); // Native type-ahead selects the visible label Azul.
          const events=await page.evaluate(() => window.__colorEvents);
          assert.ok(events.some(e => e.type === 'input' && e.trusted) && events.some(e => e.type === 'change' && e.trusted));
          console.log('keyboard select events:',JSON.stringify(events));
        }
        assert.equal(await select.inputValue(),'blue');
        if(touch) await trigger.tap(); else { await page.keyboard.press('Shift+Tab'); assert.equal(await trigger.evaluate(el=>document.activeElement===el),true); await page.keyboard.press('Enter'); }
        assert.equal(await trigger.getAttribute('aria-expanded'),'false'); assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
        await page.reload(); await trigger.click(); assert.equal(await select.inputValue(),'blue');
        assert.deepEqual(await page.locator('.ob-metric').allInnerTexts(),metrics); assert.deepEqual(await page.locator('.ob-card').allInnerTexts(),cards);
      } else {
        await page.getByRole('button',{name:'Nueva reparación'}).click();
        const dialog=page.getByRole('dialog'); await dialog.locator('select[name="client"]').selectOption({index:1});
        await dialog.getByLabel('Equipo y modelo').fill('Equipo Prueba UUID'); await dialog.getByLabel('Dirección o recepción').fill('Taller prueba');
        await dialog.getByLabel('Falla informada').fill('Prueba aislada'); await dialog.getByRole('button',{name:'Guardar',exact:true}).click();
        const created=page.locator('.ob-card').filter({hasText:'Equipo Prueba UUID'}); await created.waitFor();
        const selector=created.getByRole('combobox',{name:/^Mover /}); const name=await selector.getAttribute('aria-label');
        const id=name.slice(6); assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        assert.doesNotMatch(await created.innerText(),/RR-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        await created.getByRole('button',{name:'Ver detalle'}).click(); await page.getByRole('dialog').filter({hasText:id}).waitFor({state:'visible'});
        console.log('created order has UUID and matching detail target');
      }
      await page.screenshot({path:`${out}/${name}.png`,fullPage:true}); results.push({name,status:'pass'});
    } catch(error) { results.push({name,status:'fail',error:error.stack}); process.exitCode=1; await page.screenshot({path:`${out}/${name}-failure.png`,fullPage:true}); }
    finally { await context.close(); }
  }
}
if (!process.env.CRM_ARROW_ONLY && !process.env.CRM_INTERACTIONS_ONLY) for (const width of [1440, 390]) {
  for (const [name, check] of Object.entries({
    async layout(page) {
      const main = page.locator('main').first();
      assert.ok(parseFloat(await main.evaluate(el => getComputedStyle(el).paddingTop)) < (width === 390 ? 22 : 28));
      assert.ok(parseFloat(await page.getByRole('heading', {name:'Reparaciones',exact:true}).evaluate(el => getComputedStyle(el).fontSize)) > 20);
      await page.getByRole('button', { name: 'Órdenes de trabajo', exact: true }).click();
      assert.equal(parseFloat(await main.evaluate(el => getComputedStyle(el).paddingTop)), width === 390 ? 22 : 28);
    },
    async settings(page) {
      const before = await page.locator('.ob-metric').allInnerTexts();
      const card = page.locator('.ob-card').first();
      const text = await card.innerText();
      const trigger = page.getByRole('button', {name:'Ajustar colores del tablero'});
      await trigger.focus(); await page.keyboard.press('Enter');
      const select = page.getByRole('combobox', {name:'Color de Pendientes'});
      await select.selectOption('blue');
      const color = await page.locator('.ob-column--pending > header').evaluate(el => getComputedStyle(el).backgroundColor);
      await page.reload();
      assert.equal(await page.locator('.ob-column--pending > header').evaluate(el => getComputedStyle(el).backgroundColor), color);
      assert.deepEqual(await page.locator('.ob-metric').allInnerTexts(), before);
      assert.equal(await page.locator('.ob-card').first().innerText(), text);
    },
    async contrast(page) {
      const ratio = (a,b) => {
        const l = c => { const v=c.match(/\d+/g).slice(0,3).map(Number).map(x => { x/=255; return x<=.04045 ? x/12.92 : ((x+.055)/1.055)**2.4; }); return .2126*v[0]+.7152*v[1]+.0722*v[2]; };
        const [hi,lo]=[l(a),l(b)].sort((x,y)=>y-x); return (hi+.05)/(lo+.05);
      };
      await page.getByRole('combobox',{name:'Mover RR-1047'}).selectOption('progress');
      const sheet = page.locator('dialog[open]');
      await sheet.getByRole('radio',{name:'En reparación',exact:true}).check();
      await sheet.getByRole('button',{name:'Guardar estado'}).click();
      await sheet.waitFor({state:'hidden'});
      await page.getByRole('button',{name:'Ajustar colores del tablero'}).click();
      for (const [stage,label] of [['pending','Pendientes'],['progress','En proceso'],['ready','Listos']]) for (const color of ['amber','blue','green','plum']) {
        await page.getByRole('combobox',{name:`Color de ${label}`}).selectOption(color);
        const column=page.locator(`.ob-column--${stage}`), header=column.locator(':scope > header');
        const h=await header.evaluate(el=>({bg:getComputedStyle(el).backgroundColor,fg:getComputedStyle(el.querySelector('h3')).color}));
        assert.ok(ratio(h.bg,h.fg)>=4.5, `${stage}/${color} header ${JSON.stringify(h)}`);
        for (const card of await column.locator('.ob-card').all()) assert.equal(await card.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)', `${stage}/${color} card has its own neutral base`);
        for (const tag of await column.locator('.ob-card .status-pill').all()) {
          const c=await tag.evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor,card:getComputedStyle(el.closest('.ob-card')).backgroundColor,neutral:el.classList.contains('status-pill--neutral')}));
          assert.ok(ratio(c.fg,c.bg)>=4.5, `${stage}/${color} tag text ${JSON.stringify(c)}`);
          assert.ok(ratio(c.border,c.card)>=3, `${stage}/${color} tag boundary ${JSON.stringify(c)}`);
          assert.ok(ratio(c.bg,c.card)>=(c.neutral?1.2:1.35), `${stage}/${color} tag fill should stand apart from the card ${JSON.stringify(c)}`);
        }
        for (const text of await column.locator('.ob-card .ob-mode, .ob-card .ob-client, .ob-card .ob-equipment').all()) {
          const c=await text.evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el.closest('.ob-card')).backgroundColor}));
          assert.ok(ratio(c.fg,c.bg)>=4.5, `${stage}/${color} card text ${JSON.stringify(c)}`);
        }
        for (const control of await column.locator('.ob-card-actions > button, .ob-card-actions select').all()) {
          const c=await control.evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor,card:getComputedStyle(el.closest('.ob-card')).backgroundColor}));
          assert.ok(ratio(c.fg,c.bg)>=4.5, `${stage}/${color} control text ${JSON.stringify(c)}`);
          assert.ok(ratio(c.border,c.bg)>=3 && ratio(c.border,c.card)>=3, `${stage}/${color} control boundary ${JSON.stringify(c)}`);
        }
      }
      await page.screenshot({path:`${out}/settings-${width}.png`,fullPage:true});
    },
    async compactCard(page) {
      const card = page.locator('.ob-card').filter({has:page.getByRole('combobox',{name:'Mover RR-1047'})});
      await page.screenshot({path:`${out}/card-layout-${width}.png`,fullPage:true});
      const box = await card.boundingBox();
      const client = await card.locator('.ob-client').boundingBox(), equipment = await card.locator('.ob-equipment').boundingBox(), mode = await card.locator('.ob-mode').boundingBox();
      const sizes = await card.evaluate(el=>({client:parseFloat(getComputedStyle(el.querySelector('.ob-client')).fontSize),equipment:parseFloat(getComputedStyle(el.querySelector('.ob-equipment')).fontSize),tag:parseFloat(getComputedStyle(el.querySelector('.ob-card-repair .status-pill')).fontSize)}));
      console.log(`card ${width}:`,JSON.stringify({height:box.height,clientY:client.y,equipmentY:equipment.y,modeY:mode.y,sizes}));
      assert.ok(box.height <= 250, `seed card is too tall: ${box.height}px`);
      assert.ok(client.y < equipment.y && equipment.y < mode.y, 'client, equipment and supporting context have a clear reading order');
      assert.ok(sizes.client > sizes.equipment && sizes.client > sizes.tag, `client should have more visual emphasis: ${JSON.stringify(sizes)}`);
      assert.equal(await card.locator('.ob-card-repair svg').count(),1, 'repair status retains a contextual icon');
      assert.ok(await card.evaluate(el=>el.scrollWidth <= el.clientWidth + 1), 'card content should not overflow horizontally');
    },
    async cardShadow(page) {
      const card=page.locator('.ob-card').filter({has:page.getByRole('combobox',{name:'Mover RR-1047'})});
      const shadow=()=>card.evaluate(el=>getComputedStyle(el).boxShadow);
      const initial=await shadow(); assert.notEqual(initial,'none','cards retain a subtle resting shadow');
      await card.hover(); const hovered=await shadow(); assert.notEqual(hovered,initial,'hover strengthens the shadow');
      await page.mouse.down(); assert.notEqual(await shadow(),initial,'pressing the card strengthens the shadow'); await page.mouse.up();
      await page.mouse.move(1,1); await card.getByRole('button',{name:'Ver detalle'}).focus();
      assert.notEqual(await shadow(),initial,'keyboard focus also exposes the interactive elevation');
      assert.equal(await card.evaluate(el=>getComputedStyle(el).transitionDuration),'0s','reduced motion disables the transition');
    },
    async cardStates(page) {
      const card = page.locator('.ob-card').filter({has:page.getByRole('combobox',{name:'Mover RR-1047'})});
      const states = card.locator('.ob-card-states > div');
      const first = await states.nth(0).boundingBox(), second = await states.nth(1).boundingBox();
      assert.ok(Math.abs(first.y-second.y) < 2, 'Cobro and Entrega should be side by side');
      assert.ok(second.x >= first.x + first.width + 8, 'Cobro and Entrega must have visible separation');
      assert.equal(await states.locator('[data-status-kind]').count(),2);
    },
    async cardActions(page) {
      const card = page.locator('.ob-card').filter({has:page.getByRole('combobox',{name:'Mover RR-1047'})});
      const detail=card.getByRole('button',{name:'Ver detalle'}), move=card.getByRole('combobox',{name:'Mover RR-1047'});
      const d=await detail.boundingBox(), m=await move.boundingBox();
      assert.ok(Math.abs(d.y-m.y) < 2, 'detail and move actions share a compact row');
      assert.ok(d.height >= 44 && m.height >= 44 && d.width >= 44 && m.width >= 44, 'actions retain usable targets');
      await detail.focus(); await page.keyboard.press('Tab');
      assert.equal(await move.evaluate(el=>document.activeElement===el),true, 'keyboard order reaches Mover after detail');
      assert.notEqual(await move.evaluate(el=>getComputedStyle(el).outlineStyle),'none', 'keyboard focus stays visible');
    },
    async cards(page) {
      const card = page.locator('.ob-card').filter({has:page.getByRole('combobox',{name:'Mover RR-1047'})});
      assert.equal(await card.count(), 1);
      assert.doesNotMatch(await card.innerText(), /RR-1047|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      assert.ok(await card.locator('.ob-card-context svg').count() >= 2);
      assert.equal(await card.locator('.ob-card-states [data-status-kind]').count(), 2);
      assert.ok((await card.getByRole('combobox').boundingBox()).height >= 44);
      assert.ok((await card.getByRole('button',{name:/Arrastrar/}).boundingBox()).width >= 44);
      await card.getByRole('button',{name:'Ver detalle'}).click();
      await page.getByRole('dialog').filter({hasText:'RR-1047'}).waitFor({state:'visible'});
    },
  })) {
    const context = await browser.newContext({ viewport:{width,height:900}, reducedMotion:'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(5000);
    try { await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/'); await page.getByRole('heading',{name:'Tablero de trabajo'}).waitFor(); await check(page); results.push({width,name,status:'pass'}); }
    catch (error) { results.push({width,name,status:'fail',error:error.stack}); process.exitCode = 1; }
    finally { if(name === 'cards') await page.screenshot({path:`${out}/cards-${width}.png`,fullPage:true}); await context.close(); }
  }
}
if (!process.env.CRM_ARROW_ONLY && !process.env.CRM_INTERACTIONS_ONLY) {
  const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  try {
    await page.goto(new URL('/tests/browser/fixtures/unknown-board.html',process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/').href);
    const card=page.locator('.ob-column--other .ob-card');
    assert.equal(await card.count(),1);
    assert.equal(await card.getByText('Estado no previsto',{exact:true}).isVisible(),true);
    const presentation=await card.evaluate(el=>({background:getComputedStyle(el).backgroundColor,shadow:getComputedStyle(el).boxShadow,transition:getComputedStyle(el).transitionProperty,duration:getComputedStyle(el).transitionDuration,tag:getComputedStyle(el.querySelector('[data-status-kind="repair"]')).backgroundColor}));
    assert.equal(presentation.background,'rgb(255, 255, 255)','unknown-column cards retain the same base');
    assert.equal(presentation.tag,'rgb(219, 232, 237)','unknown labels retain a neutral, distinct tag');
    assert.notEqual(presentation.shadow,'none');
    assert.ok(presentation.transition.includes('box-shadow') && parseFloat(presentation.duration)>0,'normal motion preserves the shadow transition');
    assert.equal(await card.getByRole('combobox',{name:/^Mover /}).isDisabled(),true,'read-only fallback remains disabled');
    await page.screenshot({path:`${out}/unknown-column.png`,fullPage:true});
    results.push({name:'unknown column and normal motion',status:'pass'});
  } catch(error) { results.push({name:'unknown column and normal motion',status:'fail',error:error.stack}); process.exitCode=1; }
  finally { await context.close(); }
}
if (!process.env.CRM_ARROW_ONLY && !process.env.CRM_INTERACTIONS_ONLY) for (const mode of ['corrupt', 'denied']) {
  const context = await browser.newContext({ viewport:{width:1440,height:900} });
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  await page.addInitScript(mode => {
    const key='rodrigo-crm-kanban-colors';
    if (mode === 'corrupt') localStorage.setItem(key, '{invalid');
    else { const original=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v) { if(k===key) throw new DOMException('denied','SecurityError'); return original.call(this,k,v); }; }
  },mode);
  try {
    await page.goto(process.env.CRM_BASE_URL ?? 'http://127.0.0.1:5173/');
    await page.getByRole('heading',{name:'Tablero de trabajo'}).waitFor();
    const metrics=await page.locator('.ob-metric').allInnerTexts(), cards=await page.locator('.ob-card').allInnerTexts();
    await page.getByRole('button',{name:'Ajustar colores del tablero'}).click();
    await page.getByRole('combobox',{name:'Color de Pendientes'}).selectOption('blue');
    if (mode === 'denied') await page.getByRole('alert').filter({hasText:'No se pudieron guardar los colores'}).waitFor();
    else assert.equal(await page.getByRole('alert').count(),0);
    assert.deepEqual(await page.locator('.ob-metric').allInnerTexts(),metrics); assert.deepEqual(await page.locator('.ob-card').allInnerTexts(),cards);
    await page.reload();
    assert.deepEqual(await page.locator('.ob-metric').allInnerTexts(),metrics); assert.deepEqual(await page.locator('.ob-card').allInnerTexts(),cards);
    results.push({mode,status:'pass'});
  } catch(error) { results.push({mode,status:'fail',error:error.stack}); process.exitCode=1; }
  finally { await context.close(); }
}
await browser.close();
console.log(JSON.stringify(results,null,2));
