// Schermo intero, unica modalità dei giochi (vedi docs/architecture.md, "Schermo intero"), con Playwright Chromium:
//   node tools/serve.mjs 5217 &  node tools/fullscreen-e2e.mjs [--port 5217] [--shots DIR]
// - toccando una card il gioco si apre a schermo intero; niente #gFull né #homeFsExit;
// - uscita a pagina visibile (indietro/Esc) → home con UNA transizione e UN indietro della history (anche con popstate);
// - pagina nascosta + uscita, nei due ordini e con l'uscita notificata al ritorno → velo; il tocco rientra, stessa partita;
// - ripresa all'avvio (senza gesto) → velo → tocco → schermo intero, stessa partita;
// - Rally e Street: orizzontale, Fishing: verticale, bloccati di nuovo al rientro dal velo (screen.orientation.lock finto);
// - Hari Colors: voce ferma sotto il velo;
// - requestFullscreen rifiutato → pseudo-schermo intero senza velo; RTL; nessun errore in console.
import fs from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = +arg('port', 5217), SHOTS = arg('shots', '');
const URL = `http://localhost:${PORT}/`;
let pw;
for (const m of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright/index.mjs']) {
  if (!m) continue;
  try { pw = await import(m); break; } catch (e) { /* prossimo */ }
}
if (!pw) { console.error('Playwright non trovato (npm i -D playwright, oppure PLAYWRIGHT_MODULE=…)'); process.exit(2); }
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'OK  ' : 'FAIL') + ' ' + msg); if (!ok) fails++; };

const INIT = () => {
  localStorage.setItem('harihari:legal', JSON.stringify({ v: 999, at: 1 }));
  // pagina nascosta emulata
  window.__hid = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hid });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__hid ? 'hidden' : 'visible') });
  window.__setHidden = (h) => { window.__hid = h; document.dispatchEvent(new Event('visibilitychange')); };
  window.__trans = 0; window.__pop = 0; window.__locks = 0;
  document.addEventListener('hh:trans', (e) => { if (e.detail && e.detail.phase === 'start') window.__trans++; });
  addEventListener('popstate', () => { window.__pop++; });
  try {
    const so = screen.orientation;
    Object.defineProperty(so, 'lock', { configurable: true, value: () => { window.__locks++; return Promise.resolve(); } });
    Object.defineProperty(so, 'unlock', { configurable: true, value: () => {} });
  } catch (e) { /* */ }
};

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: !!opts.touch, isMobile: !!opts.touch, ...(opts.ctx || {}) });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push(m.text()); });
  page.on('pageerror', (e) => page.errs.push(String(e)));
  await page.addInitScript(INIT);
  if (opts.store) await page.addInitScript((st) => { for (const k in st) localStorage.setItem(k, st[k]); }, opts.store);
  await page.goto(URL + (opts.hash || ''));
  await page.waitForFunction(() => window.HH && document.querySelector('#home .card, #game:not([hidden])'));
  await sleep(1900);
  const an = await page.$('[data-an="0"]'); if (an) { await an.click(); await sleep(300); }
  return { ctx, page };
}
const state = (page) => page.evaluate(() => ({
  full: !!document.fullscreenElement, fsOn: document.documentElement.classList.contains('fs-on'),
  game: !document.querySelector('#game').hidden, home: !document.querySelector('#home').hidden,
  veil: !!document.querySelector('#fsVeil:not([hidden])'), trans: window.__trans, pop: window.__pop,
  hstate: JSON.stringify(history.state), gFull: !!document.querySelector('#gFull'), homeFsExit: !!document.querySelector('#homeFsExit'),
  locks: window.__locks,
}));
async function openGame(page, id) {
  const an = await page.$('[data-an="0"]'); if (an) { await an.click(); await sleep(200); }
  await page.evaluate((id) => { const c = document.querySelector(`[data-game="${id}"]`); c && c.scrollIntoView({ block: 'center' }); }, id);
  await page.click(`[data-game="${id}"]`);
  await page.waitForFunction(() => !document.querySelector('#game').hidden && !document.documentElement.dataset.trans, null, { timeout: 15000 });
  await sleep(500);
  const tut = await page.$('#tutDlg:not([hidden]) #tutSkip'); if (tut) { await tut.click(); await sleep(300); }
}
const snap = (page, id) => page.evaluate((id) => { window.__setHidden(true); window.__setHidden(false); const s = HH.progress.loadGame(id); const so = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o).sort().reduce((a, k) => ((a[k] = so(o[k])), a), {}) : o); if (s && s.state) delete s.state.settled; return s ? JSON.stringify(so(s.state)) : null; }, id);

const browser = await pw.chromium.launch();
  const allErrs = [];
  // 1-2: apertura e indietro a pagina visibile
  {
    const { ctx, page } = await newPage(browser);
    await page.evaluate(() => history.pushState({ sentinel: 1 }, ''));
    await openGame(page, 'hedgedoku');
    let s = await state(page);
    check(s.full && s.fsOn && s.game, 'gioco aperto a schermo intero ' + JSON.stringify(s));
    check(!s.gFull && !s.homeFsExit, 'niente #gFull ne #homeFsExit');
    await shot(page, 'c1-hedgedoku-fs');
    const t0 = s.trans;
    await page.evaluate(() => document.exitFullscreen());
    await sleep(150);
    s = await state(page);
    check(s.game && s.fsOn, 'subito dopo l\'uscita: nessuna vista normale (fs-on resta) ' + JSON.stringify(s));
    await page.waitForFunction(() => !document.querySelector('#home').hidden && !document.documentElement.dataset.trans, null, { timeout: 5000 }).catch(() => {});
    await sleep(400);
    s = await state(page);
    check(s.home && !s.game && !s.fsOn && !s.veil, 'indietro: home ' + JSON.stringify(s));
    check(s.trans - t0 === 1, 'una sola transizione: ' + (s.trans - t0));
    check(s.hstate === '{"sentinel":1}', 'history indietro una volta sola: ' + s.hstate + ' pop=' + s.pop);
    await shot(page, 'c2-home-dopo-indietro');
    // pulsante indietro della barra (#gFsExit / menu home): esce dallo schermo intero, una sola transizione
    await openGame(page, 'hedgedoku');
    const t1 = (await state(page)).trans;
    await page.click('#gFsExit');
    await page.waitForFunction(() => !document.querySelector('#home').hidden && !document.documentElement.dataset.trans, null, { timeout: 5000 }).catch(() => {});
    await sleep(600);
    s = await state(page);
    check(s.home && !s.full && s.trans - t1 === 1 && s.hstate === '{"sentinel":1}', 'tasto home del gioco: home, fuori dallo schermo intero, 1 transizione, 1 indietro ' + JSON.stringify(s));
    // popstate + uscita dallo schermo intero insieme (browser che fanno tutti e due)
    await openGame(page, 'hedgedoku');
    const t2 = (await state(page)).trans;
    await page.evaluate(() => { history.back(); document.exitFullscreen(); });
    await page.waitForFunction(() => !document.querySelector('#home').hidden && !document.documentElement.dataset.trans, null, { timeout: 5000 }).catch(() => {});
    await sleep(800);
    s = await state(page);
    check(s.home && s.trans - t2 === 1 && s.hstate === '{"sentinel":1}', 'popstate + fullscreenchange: un solo indietro ' + JSON.stringify(s));
    allErrs.push(...page.errs);
    await ctx.close();
  }
  // 3: cambio app nei due ordini
  for (const order of ['hidden-prima', 'uscita-prima']) {
    const { ctx, page } = await newPage(browser);
    await openGame(page, 'hedgedoku');
    // una mossa
    await page.evaluate(() => { const c = document.querySelector('#board [data-i], #board button, #board .cell'); c && c.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await page.mouse.click(206, 450);
    await sleep(300);
    const before = await snap(page, 'hedgedoku');
    const boardBefore = await page.evaluate(() => document.querySelector('#board').innerHTML.length);
    if (order === 'hidden-prima') { await page.evaluate(() => { window.__setHidden(true); document.exitFullscreen(); }); }
    else { await page.evaluate(() => { document.exitFullscreen(); setTimeout(() => window.__setHidden(true), 120); }); }
    await sleep(800);
    let s = await state(page);
    check(s.game && s.veil && !s.home, `${order}: resta nel gioco col velo ` + JSON.stringify(s));
    await page.evaluate(() => window.__setHidden(false));
    await sleep(1500);
    s = await state(page);
    check(s.game && s.veil && !s.full, `${order}: al ritorno velo visibile, non a schermo intero`);
    await shot(page, `c3-velo-${order}`);
    await page.click('#fsVeil .fs-veil-go', { force: true });
    await sleep(700);
    s = await state(page);
    check(s.full && !s.veil && s.game, `${order}: il tocco rientra a schermo intero ` + JSON.stringify(s));
    const after = await snap(page, 'hedgedoku');
    check(before && before === after, `${order}: stesso snapshot prima e dopo`);
    check(boardBefore === await page.evaluate(() => document.querySelector('#board').innerHTML.length), `${order}: stessa tavola (nessuna ricarica)`);
    allErrs.push(...page.errs);
    await ctx.close();
  }
  // 3b: uscita notificata in ritardo, al ritorno in primo piano (alcuni Android)
  {
    const { ctx, page } = await newPage(browser);
    await openGame(page, 'lantern');
    await page.evaluate(() => { window.__setHidden(true); });
    await sleep(300);
    await page.evaluate(() => { window.__setHidden(false); document.exitFullscreen(); });
    await sleep(800);
    const s = await state(page);
    check(s.game && s.veil, 'uscita notificata al ritorno: velo, non home ' + JSON.stringify(s));
    allErrs.push(...page.errs);
    await ctx.close();
  }
  // 4: ripresa all'avvio (nessun gesto)
  {
    const { ctx, page } = await newPage(browser);
    await openGame(page, 'binary');
    const cells = await page.$$('#board .mb-cell');
    for (const c of cells) { await c.click({ force: true }); await sleep(120); if (JSON.parse(await snap(page, 'binary')).moves > 0) break; }
    await sleep(300);
    const before = await snap(page, 'binary');
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#game').hidden, null, { timeout: 10000 });
    await sleep(800);
    let s = await state(page);
    check(s.game && s.veil && !s.full && s.fsOn, 'ripresa all\'avvio: velo, pseudo-disposizione ' + JSON.stringify(s));
    await shot(page, 'c4-ripresa-velo');
    await page.click('#fsVeil', { position: { x: 30, y: 30 } });
    await sleep(700);
    s = await state(page);
    check(s.full && !s.veil, 'ripresa: tocco → schermo intero');
    const aft = await snap(page, 'binary');
    check(before === aft, 'ripresa: stessa partita ' + (before === aft ? '' : before + ' VS ' + aft));
    // nuovo livello resta a schermo intero (ricomincia)
    allErrs.push(...page.errs);
    await ctx.close();
  }
  // 4b: link diretto con avviso legale da accettare? (link diretto ?game=)
  // 5: Rally e Street, blocco dell'orientamento riapplicato
  for (const id of ['rally', 'street']) {
    const { ctx, page } = await newPage(browser, { ctx: { viewport: { width: 915, height: 412 } } });
    await openGame(page, id);
    await sleep(800);
    let s = await state(page);
    const l0 = s.locks;
    check(s.full && l0 >= 1, `${id}: a schermo intero e orizzontale bloccato (lock=${l0})`);
    await shot(page, `c5-${id}-fs`);
    await page.evaluate(() => { window.__setHidden(true); document.exitFullscreen(); });
    await sleep(700);
    await page.evaluate(() => window.__setHidden(false));
    await sleep(400);
    s = await state(page);
    check(s.veil && s.game, `${id}: velo dopo cambio app`);
    await shot(page, `c5-${id}-velo`);
    await page.click('#fsVeil', { position: { x: 30, y: 30 } });
    await sleep(900);
    s = await state(page);
    check(s.full && s.locks > l0, `${id}: rientro e blocco riapplicato (lock ${l0} → ${s.locks})`);
    allErrs.push(...page.errs);
    await ctx.close();
  }
  // 5b: Hari Fishing (verticale bloccato, telefono: pointer coarse) e Hari Colors (pausa della voce)
  for (const id of ['fish', 'colors']) {
    const { ctx, page } = await newPage(browser, { touch: true });
    await openGame(page, id);
    await sleep(900);
    let s = await state(page);
    const l0 = s.locks;
    check(s.full && (id !== 'fish' || l0 >= 1), `${id}: a schermo intero (lock=${l0})`);
    await shot(page, `c5-${id}-fs`);
    await page.evaluate(() => { document.exitFullscreen(); setTimeout(() => window.__setHidden(true), 80); });
    await sleep(700);
    await page.evaluate(() => window.__setHidden(false));
    await sleep(400);
    s = await state(page);
    check(s.veil && s.game, `${id}: velo dopo cambio app`);
    if (id === 'colors') check(await page.evaluate(() => !speechSynthesis.speaking), 'colors: voce ferma sotto il velo');
    await page.tap('#fsVeil');
    await sleep(900);
    s = await state(page);
    check(s.full && !s.veil && (id !== 'fish' || s.locks > l0), `${id}: rientro (lock ${l0} → ${s.locks})`);
    await shot(page, `c5-${id}-rientro`);
    allErrs.push(...page.errs);
    await ctx.close();
  }
  // 6: requestFullscreen rifiutato: pseudo-schermo intero
  {
    const { ctx, page } = await newPage(browser);
    await page.evaluate(() => { Element.prototype.requestFullscreen = function () { return Promise.reject(new TypeError('denied')); }; });
    await openGame(page, 'pixel');
    await sleep(500);
    const s = await state(page);
    check(s.game && s.fsOn && !s.full && !s.veil, 'rifiutato: pseudo-schermo intero, niente velo ' + JSON.stringify(s));
    await shot(page, 'c6-pseudo-rifiutato');
    allErrs.push(...page.errs);
    await ctx.close();
  }
  // 7: RTL (arabo): gioco e velo
  {
    const { ctx, page } = await newPage(browser);
    await page.evaluate(() => { HH.i18n.set('ar'); });
    await page.reload(); await page.waitForFunction(() => window.HH && document.querySelector('#home .card')); await sleep(1900);
    await openGame(page, 'yarn');
    const dir = await page.evaluate(() => document.documentElement.dir);
    await shot(page, 'c7-rtl-gioco');
    await page.evaluate(() => { window.__setHidden(true); document.exitFullscreen(); });
    await sleep(600); await page.evaluate(() => window.__setHidden(false)); await sleep(300);
    const s = await state(page);
    check(dir === 'rtl' && s.veil, 'RTL: velo ' + dir);
    await shot(page, 'c7-rtl-velo');
    allErrs.push(...page.errs);
    await ctx.close();
  }
  check(allErrs.length === 0, 'nessun errore in console ' + JSON.stringify(allErrs.slice(0, 5)));
  await browser.close();
  console.log(fails ? `\n${fails} FALLITI` : '\ntutto ok');
  process.exit(fails ? 1 : 0);
