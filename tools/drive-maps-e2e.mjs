// Prova reale delle mappe di Hari Taxi in Chromium (Playwright):
//   node tools/serve.mjs 5201 &  node tools/drive-maps-e2e.mjs [--port 5201] [--shots DIR]
// - prima apertura: selettore delle mappe (città di Hari già selezionata), anteprime e attribuzione OSM;
// - Ostia: guida (teletrasporto) sul lungomare, al Pontile e alla spiaggia; Desenzano: porto, lago, castello;
// - Ortigia: ponti Umbertino e Santa Lucia sopra la Darsena, Duomo, Fonte Aretusa, Porto Grande, Castello Maniace, Tempio
//   di Apollo, Teatro Greco; isola intera vista dall'alto;
// - minimappa con l'attribuzione; un livello completato su ogni mappa dal bot dei test (tests/_drive-bot.mjs,
//   in pagina, a velocità ×6) fino alla finestra di vittoria; progressi separati per mappa;
// - tema chiaro e scuro (360×760), schermo intero in orizzontale (915×412); nessun errore in console.
import fs from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = +arg('port', 5201), SHOTS = arg('shots', '');
const URL = `http://localhost:${PORT}/`;
let pw;
for (const m of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright/index.mjs']) {
  if (!m) continue;
  try { pw = await import(m); break; } catch (e) { /* prossimo */ }
}
if (!pw) { console.error('Playwright non trovato (npm i -D playwright, oppure PLAYWRIGHT_MODULE=…)'); process.exit(2); }
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await pw.chromium.launch();
const errors = [];
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open({ w = 360, h = 760, scheme = 'light', store = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => { errors.push(e.message); if (process.env.E2E_VERBOSE) console.log('pageerror:', e.stack || e.message); });
  await page.addInitScript((st) => {
    localStorage.setItem('harihari:tut:drive', '1');
    localStorage.setItem('harihari:lang', '"it"');
    for (const [k, v] of Object.entries(st)) localStorage.setItem('harihari:' + k, JSON.stringify(v));
  }, store);
  await page.goto(URL);
  await page.waitForFunction(() => window.HH && HH.catalog);
  await sleep(400);
  return { ctx, page };
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const openDrive = async (page) => { await page.click('[data-game="drive"]'); await page.waitForFunction(() => document.querySelector('#board .dr-wrap')); await sleep(600); };
// fa partire la partita (primo tocco) e porta Hari vicino a un punto, sulla fermata più vicina, rivolto lungo la strada
async function goNear(page, pick, peek = null) {
  const r = await page.evaluate(([pickSrc, pk]) => {
    const el = document.querySelector('#board'), s = el._drive.state(), g = el._drive.geo(), P = HH.drive, md = P.mapData(s.mapId);
    // eslint-disable-next-line no-new-func
    const target = new Function('md', 'g', 'return (' + pickSrc + ')(md, g)')(md, g);
    if (!target) return null;
    const sp = g.spots[g.nearSpot(target.x, target.y, 40)];
    Object.assign(s.car, { x: sp.zx - Math.cos(sp.a) * 0.4, y: sp.zy - Math.sin(sp.a) * 0.4, a: sp.a, v: 0 });
    el._drive.peek(pk ? target.x + pk[0] : null, pk ? target.y + pk[1] : null);
    return { x: sp.zx, y: sp.zy, name: target.name || '' };
  }, [pick.toString(), peek]);
  return r;
}
// primo tocco: "Pronti?… Via!" e la partita parte (poi la si mette subito in moto a teletrasporti)
async function tapStart(page) {
  const box = await page.locator('.dr-stage').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height * 0.7;
  // si parte trascinando (la levetta): un piccolo trascinamento e si lascia
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 30, y, { steps: 4 }); await sleep(120); await page.mouse.up();
  await sleep(3200);
}
async function waitMap(page, id) {
  await page.waitForFunction((m) => { const el = document.querySelector('#board'); const s = el && el._drive && el._drive.state(); return s && s.mapId === m; }, id, { timeout: 15000 });
  await sleep(700);
}
// livello completato dal bot dei test (in pagina), a velocità ×6, fino alla finestra di vittoria
async function botWin(page) {
  // il bot è un modulo ES dei test: lo si importa da un blob (il server statico può servire .mjs senza tipo JS)
  await page.evaluate(async () => {
    if (window.__botKit) return;
    const src = await (await fetch('tests/_drive-bot.mjs')).text();
    window.__botKit = (await import(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })))).botKit;
  });
  await page.evaluate(() => {
    const el = document.querySelector('#board'), s = el._drive.state(), kit = window.__botKit(HH), bot = kit.makeBot(s, { seed: 5 });
    s.ready = 0; s.wait = false;
    const orig = HH.drive.step;
    HH.drive.step = (st, dt, inp) => { if (st !== s) return orig(st, dt, inp); let ev = []; for (let k = 0; k < 6 && !HH.drive.isOver(st); k++) ev = ev.concat(orig(st, dt, bot.input(st.t))); return ev; };
    window.__unbot = () => { HH.drive.step = orig; };
    // il ciclo parte al primo input: un tocco simulato sulla levetta
    el.querySelector('.dr-stage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 300, pointerId: 9 }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9 }));
  });
  try { await page.waitForFunction(() => !document.querySelector('#winDlg').hidden, null, { timeout: 120000 }); } catch (e) {
    // diagnosi: stato della partita quando il bot non ce la fa
    console.log('bot fermo:', await page.evaluate(() => { const s = document.querySelector('#board')._drive.state(); return JSON.stringify({ map: s.mapId, t: s.t, done: s.done, N: s.N, oops: s.oops, car: s.car, ready: s.ready, wait: s.wait, trip: s.trip && s.trip.items.map((i) => i.st) }); }));
    throw e;
  }
  await sleep(1600);
}

// giro di Ortigia: ponti sopra la Darsena, Duomo, Fonte Aretusa, Porto Grande, castello (camera sul luogo)
async function ortigiaTour(page, suf) {
  // (la funzione va in pagina come testo: niente chiusure, la regex è scritta dentro)
  const bridge = (re) => new Function('md', 'g', `const e = g.edges.filter((q) => q.br && ${re}.test(q.name)).sort((a, b) => b.len - a.len)[0]; if (!e) return null; const [x, y] = HH.drive.along(g.center[e.id], e.len / 2); return { x, y, name: e.name };`);
  const br = await goNear(page, bridge(/corso umberto/i), [0, 0]);
  await sleep(1800);
  check(!!br, `Ponte Umbertino (${br && br.name})`);
  await shot(page, `17-ortigia-ponte-umbertino${suf}`);
  const br2 = await goNear(page, bridge(/malta/i), [0, 0]);
  await sleep(1500);
  check(!!br2, 'Ponte Santa Lucia (via Malta)');
  await shot(page, `18-ortigia-ponte-santa-lucia${suf}`);
  // (k, nome) del luogo; la ricerca va in pagina come testo
  for (const [k, re, name, file] of [['duomo', '', 'Duomo', '19-ortigia-duomo'], ['fountain', '', 'Fonte Aretusa', '20-ortigia-fonte-aretusa'], ['harbour', '/porto grande/i', 'Porto Grande', '21-ortigia-porto-grande'],
    ['castle', '', 'Castello Maniace', '22-ortigia-castello'], ['temple', '', 'Tempio di Apollo', '23-ortigia-tempio']]) {
    const r = await goNear(page, new Function('md', `return md.pois.find((p) => p.k === '${k}'${re ? ` && ${re}.test(p.name)` : ''})`), [0, 0]);
    await sleep(1600);
    const vis = await page.evaluate(() => [...document.querySelectorAll('.dr-street span')].map((e) => e.textContent).join(' '));
    check(!!r, `${name} (${r && r.name}) · cartello: ${vis}`);
    await shot(page, file + suf);
  }
  await page.evaluate(() => document.querySelector('#board')._drive.peek());
}

/* ---------- 1. prima apertura: selettore ---------- */
{
  const { ctx, page } = await open();
  await openDrive(page);
  const sel = await page.evaluate(() => [...document.querySelectorAll('.dr-map-card')].map((b) => ({ id: b.dataset.map, on: b.classList.contains('on'), txt: b.textContent })));
  check(sel.length === 4 && sel[0].id === 'hari' && sel[0].on && sel[3].id === 'ortigia', `selettore all'avvio con 4 mappe, città di Hari selezionata (${sel.map((x) => x.id).join(', ')})`);
  check(await page.evaluate(() => { const r = [...document.querySelectorAll('.dr-map-card')].map((b) => b.getBoundingClientRect()); const box = document.querySelector('.dr-maps-box').getBoundingClientRect(); return r.every((q) => q.left >= box.left - 1 && q.right <= box.right + 1 && q.width > 100); }), 'le 4 carte stanno nel riquadro (2 × 2)');
  check(await page.evaluate(() => /OpenStreetMap contributors/.test(document.querySelector('.dr-maps-osm').textContent)), 'attribuzione OSM nel selettore');
  await shot(page, '01-selettore-chiaro');

  /* ---------- 2. Ostia ---------- */
  await page.click('[data-map="ostia"]');
  await waitMap(page, 'ostia');
  await tapStart(page);
  check(await page.evaluate(() => /OpenStreetMap contributors/.test(document.querySelector('.dr-osm').textContent)), 'attribuzione OSM sul palco');
  check(await page.evaluate(() => document.querySelector('#gLevel').textContent.includes('1')), 'Ostia parte dal livello 1 (progressi separati)');
  const lungo = await goNear(page, (md, g) => { const e = g.edges.find((q) => /lungomare/i.test(q.name) && q.len > 20); const [x, y] = HH.drive.along(g.center[e.id], e.len / 2); return { x, y, name: e.name }; });
  await sleep(1800);
  check(await page.evaluate(() => document.querySelector('.dr-street span').textContent.length > 0), `cartello della via sul lungomare (${lungo && lungo.name})`);
  await shot(page, '02-ostia-lungomare');
  // il Pontile è sul mare: la camera lo guarda dal lungomare
  await goNear(page, (md) => md.pois.find((p) => p.k === 'pier'), [0, 7]);
  await sleep(2200);
  await shot(page, '03-ostia-pontile');
  await page.evaluate(() => document.querySelector('#board')._drive.peek());
  await goNear(page, (md) => md.pois.filter((p) => p.k === 'beach')[3] || md.pois.find((p) => p.k === 'beach'));
  await sleep(1800);
  await shot(page, '04-ostia-spiaggia');
  await page.evaluate(() => { const s = document.querySelector('#board')._drive.state(); s.ready = 0; });
  await botWin(page);
  await shot(page, '05-ostia-vinto');
  const lv = await page.evaluate(() => [HH.progress.get('drive@ostia').level, HH.progress.get('drive').level]);
  check(lv[0] === 2 && lv[1] === 1, `livello di Ostia vinto: Ostia ${lv[0]}, città di Hari ${lv[1]}`);
  await page.click('#winNext');
  await sleep(800);
  await page.evaluate(() => window.__unbot && window.__unbot());

  /* ---------- 3. Desenzano dal pulsante mappa ---------- */
  await page.click('.dr-mbtn');
  await sleep(500);
  await shot(page, '06-selettore-in-gioco');
  await page.click('[data-map="desenzano"]');
  await waitMap(page, 'desenzano');
  await tapStart(page);
  await goNear(page, (md) => md.pois.find((p) => p.k === 'harbour' && /porto vecchio/i.test(p.name)));
  await sleep(1800);
  await shot(page, '07-desenzano-porto');
  await goNear(page, (md, g) => { const e = g.edges.filter((q) => /lungolago|lungo lago/i.test(q.name)).sort((a, b) => b.len - a.len)[0]; if (!e) return null; const [x, y] = HH.drive.along(g.center[e.id], e.len / 2); return { x, y, name: e.name }; });
  await sleep(1800);
  await shot(page, '08-desenzano-lago');
  await goNear(page, (md) => md.pois.find((p) => p.k === 'castle'));
  await sleep(1800);
  await shot(page, '09-desenzano-castello');
  await botWin(page);
  await shot(page, '10-desenzano-vinto');
  const lv2 = await page.evaluate(() => HH.progress.get('drive@desenzano').level);
  check(lv2 === 2, `livello di Desenzano vinto (livello ${lv2})`);
  await page.click('#winNext');
  await sleep(800);
  await page.evaluate(() => window.__unbot && window.__unbot());

  /* ---------- 3b. Ortigia ---------- */
  await page.click('.dr-mbtn');
  await sleep(500);
  await shot(page, '16-selettore-4-mappe');
  await page.click('[data-map="ortigia"]');
  await waitMap(page, 'ortigia');
  await tapStart(page);
  check(await page.evaluate(() => document.querySelector('#gLevel').textContent.includes('1')), 'Ortigia parte dal livello 1 (progressi separati)');
  check(await page.evaluate(() => /OpenStreetMap contributors/.test(document.querySelector('.dr-osm').textContent)), 'attribuzione OSM sul palco di Ortigia');
  await ortigiaTour(page, '');
  await page.evaluate(() => document.querySelector('#board')._drive.peek());
  await botWin(page);
  await shot(page, '24-ortigia-vinto');
  const lv3 = await page.evaluate(() => [HH.progress.get('drive@ortigia').level, HH.progress.get('drive@ostia').level]);
  check(lv3[0] === 2 && lv3[1] === 2, `livello di Ortigia vinto (Ortigia ${lv3[0]}, Ostia ${lv3[1]})`);
  await ctx.close();
}

/* ---------- 4. tema scuro ---------- */
{
  const { ctx, page } = await open({ scheme: 'dark', store: { 'drive:map': 'ostia', 'drive:mapSeen': 1 } });
  await openDrive(page);
  await waitMap(page, 'ostia');
  await tapStart(page);
  await goNear(page, (md) => md.pois.find((p) => p.k === 'pier'), [0, 6]);
  await sleep(2200);
  await shot(page, '11-ostia-scuro');
  await page.evaluate(() => document.querySelector('#board')._drive.peek());
  await page.click('.dr-mbtn');
  await sleep(500);
  await shot(page, '12-selettore-scuro');
  await page.click('[data-map="desenzano"]');
  await waitMap(page, 'desenzano');
  await tapStart(page);
  await goNear(page, (md) => md.pois.find((p) => p.k === 'harbour' && /porto vecchio/i.test(p.name)));
  await sleep(1800);
  await shot(page, '13-desenzano-scuro');
  await page.click('.dr-mbtn');
  await sleep(500);
  await page.click('[data-map="ortigia"]');
  await waitMap(page, 'ortigia');
  await tapStart(page);
  await ortigiaTour(page, '-scuro');
  await ctx.close();
}

/* ---------- 5. schermo intero in orizzontale ---------- */
{
  const { ctx, page } = await open({ w: 915, h: 412, store: { 'drive:map': 'ostia', 'drive:mapSeen': 1 } });
  await openDrive(page);
  await waitMap(page, 'ostia');
  if (await page.$('#gFull')) { await page.click('#gFull'); await sleep(900); }
  await tapStart(page);
  await goNear(page, (md, g) => { const e = g.edges.find((q) => /lungomare/i.test(q.name) && q.len > 20); const [x, y] = HH.drive.along(g.center[e.id], e.len / 2); return { x, y }; });
  await sleep(1800);
  await shot(page, '14-ostia-orizzontale');
  await page.click('.dr-mbtn');
  await sleep(500);
  await shot(page, '25-selettore-orizzontale');
  await page.click('[data-map="ortigia"]');
  await waitMap(page, 'ortigia');
  await tapStart(page);
  await goNear(page, (md, g) => { const e = g.edges.find((q) => q.br && /corso umberto/i.test(q.name)); const [x, y] = HH.drive.along(g.center[e.id], e.len / 2); return { x, y }; }, [0, 0]);
  await sleep(1800);
  await shot(page, '26-ortigia-orizzontale-ponti');
  await goNear(page, (md) => md.pois.find((p) => p.k === 'fountain'), [0, 0]);
  await sleep(1600);
  await shot(page, '27-ortigia-orizzontale-fonte');
  await page.evaluate(() => document.querySelector('#board')._drive.peek());
  // e la città di Hari, ancora com'era
  await page.click('.dr-mbtn');
  await sleep(400);
  await page.click('[data-map="hari"]');
  await page.waitForFunction(() => { const s = document.querySelector('#board')._drive.state(); return s && !s.mapId; });
  await sleep(900);
  await shot(page, '15-citta-di-hari-orizzontale');
  await ctx.close();
}

await browser.close();
const real = errors.filter((e) => !/AudioContext/.test(e));
check(!real.length, `nessun errore in console${real.length ? ': ' + real.slice(0, 5).join(' | ') : ''}`);
process.exit(fails ? 1 : 0);
