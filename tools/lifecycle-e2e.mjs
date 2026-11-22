// Ciclo di vita dei giochi con Playwright Chromium (vedi docs/architecture.md, "Ciclo di vita"):
//   node tools/serve.mjs 5240 &  node tools/lifecycle-e2e.mjs [--port 5240] [--shots DIR]
// 1. Hari Memory risolta, uscita DURANTE il ritardo prima di ctx.win: il salvataggio è la griglia finita; riaprendo
//    la vittoria viene assegnata subito, una volta sola (livello +1, wins +1); una seconda riapertura non la ripete.
// 2. Uscendo da Hari Fishing e da Hari Colors, destroy() ferma subito RAF, sensori e voce (spie su
//    cancelAnimationFrame / removeEventListener('deviceorientation') / speechSynthesis.cancel), prima che #game si svuoti.
import fs from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = +arg('port', 5240), SHOTS = arg('shots', '');
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
  if (sessionStorage.getItem('lc-init')) return;
  sessionStorage.setItem('lc-init', '1');
  localStorage.setItem('harihari:legal', JSON.stringify({ v: 999, at: 1 }));
  localStorage.setItem('harihari:anConsent', 'false');
  localStorage.setItem('harihari:wizard', JSON.stringify({ v: '999' }));   // guida della home già vista
  for (const id of ['memory', 'fish', 'colors']) localStorage.setItem('harihari:tut:' + id, '1');
};
// spie: istante (performance.now) delle chiamate che contano e di quando #game si svuota
const SPY = () => {
  const log = (window.__spy = { caf: [], orient: [], motion: [], speech: [], gameEmpty: [] });
  const caf = window.cancelAnimationFrame.bind(window);
  window.cancelAnimationFrame = (id) => { log.caf.push(performance.now()); return caf(id); };
  const rel = window.removeEventListener.bind(window);
  window.removeEventListener = function (type, fn, o) {
    if (type === 'deviceorientation') log.orient.push(performance.now());
    if (type === 'devicemotion') log.motion.push(performance.now());
    return rel(type, fn, o);
  };
  try {
    const ss = window.speechSynthesis, c = ss.cancel.bind(ss);
    Object.defineProperty(ss, 'cancel', { configurable: true, value: () => { log.speech.push(performance.now()); return c(); } });
  } catch (e) { /* niente sintesi vocale */ }
  document.addEventListener('DOMContentLoaded', () => {
    const g = document.getElementById('game');
    new MutationObserver(() => { if (g.hidden && !g.firstChild) log.gameEmpty.push(performance.now()); }).observe(g, { childList: true, attributes: true });
  });
};

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push(m.text()); });
  page.on('pageerror', (e) => page.errs.push(String(e)));
  await page.addInitScript(INIT);
  await page.addInitScript(SPY);
  await page.goto(URL);
  await page.waitForFunction(() => window.HH && document.querySelector('#home .card, #game:not([hidden])'));
  await sleep(1500);
  return { ctx, page };
}
const toHome = async (page) => {
  await page.waitForFunction(() => !document.querySelector('#home').hidden && !document.documentElement.dataset.trans, null, { timeout: 8000 }).catch(() => {});
  await sleep(300);
};
async function openGame(page, id) {
  const an = await page.$('[data-an="0"]'); if (an) { await an.click(); await sleep(200); }
  await page.evaluate((id) => { const c = document.querySelector(`#home [data-game="${id}"]`); c && c.scrollIntoView({ block: 'center' }); }, id);
  await page.click(`#home [data-game="${id}"]`);
  await page.waitForFunction(() => !document.querySelector('#game').hidden && !document.documentElement.dataset.trans && document.querySelector('#board').firstChild, null, { timeout: 20000 });
  await sleep(500);
  const veil = await page.$('#fsVeil:not([hidden])'); if (veil) { await veil.click(); await sleep(300); }
}
const leave = (page) => page.evaluate(() => document.querySelector('#gBack').click());
const prog = (page, id) => page.evaluate((id) => HH.progress.get(id), id);

const browser = await pw.chromium.launch();
const allErrs = [];

/* ---------- 1. Memory: vittoria assegnata alla riapertura, una volta sola ---------- */
{
  const { ctx, page } = await newPage(browser);
  await openGame(page, 'memory');
  const p0 = await prog(page, 'memory');
  // coppie calcolate su una copia dello stato salvato (HH.memory.flip): solo tocchi giusti, niente scambi
  for (let guard = 0; guard < 80; guard++) {
    const pair = await page.evaluate(() => {
      const sv = HH.progress.loadGame('memory');
      if (!sv) return null;
      const s = sv.state, i = s.found.findIndex((x) => !x);
      if (i < 0) return null;
      for (let j = 0; j < s.deck.length; j++) {
        if (j === i || s.found[j]) continue;
        const c = JSON.parse(JSON.stringify(s));
        c.up = [];
        HH.memory.flip(c, i);
        if (HH.memory.flip(c, j).type === 'match') return [i, j];
      }
      return null;
    });
    if (!pair) break;
    for (const k of pair) { await page.click(`#board .mm-card[data-i="${k}"]`); await sleep(60); }
    await sleep(120);
  }
  const saved = await page.evaluate(() => HH.progress.loadGame('memory'));
  check(saved && saved.state.found.every(Boolean), 'griglia risolta e salvata prima di ctx.win');
  check(await page.evaluate(() => document.querySelector('#winDlg').hidden), 'nessuna vittoria ancora (ritardo in corso)');
  await leave(page);                        // dentro i 1500 ms del ritardo
  await toHome(page);
  await sleep(1800);                        // il timer di vittoria del gioco chiuso non deve scattare
  let p1 = await prog(page, 'memory');
  check(p1.wins === p0.wins && p1.level === p0.level, `uscito durante il ritardo: nessuna vittoria (wins ${p1.wins}, livello ${p1.level})`);
  const kept = await page.evaluate(() => HH.progress.loadGame('memory'));
  check(kept && kept.state.found.every(Boolean), 'salvataggio = partita risolta');
  await openGame(page, 'memory');
  await page.waitForSelector('#winDlg:not([hidden])', { timeout: 5000 }).catch(() => {});
  check(await page.evaluate(() => !document.querySelector('#winDlg').hidden), 'riapertura: finestra di vittoria');
  await shot(page, 'm1-memory-vittoria-ripresa');
  p1 = await prog(page, 'memory');
  check(p1.wins === p0.wins + 1 && p1.level === p0.level + 1, `vittoria assegnata una volta: wins ${p0.wins}→${p1.wins}, livello ${p0.level}→${p1.level}`);
  check(!(await page.evaluate(() => HH.progress.loadGame('memory'))), 'salvataggio pulito dopo la vittoria');
  await sleep(1500);
  const p2 = await prog(page, 'memory');
  check(p2.wins === p1.wins && p2.level === p1.level, 'nessun doppione dopo il ritardo');
  // via dalla finestra di vittoria senza "Avanti", poi di nuovo dentro: nessuna seconda vittoria
  await page.click('#winHome');
  await toHome(page);
  await openGame(page, 'memory');
  await sleep(800);
  const p3 = await prog(page, 'memory');
  check(await page.evaluate(() => document.querySelector('#winDlg').hidden), 'seconda riapertura: partita nuova, niente vittoria');
  check(p3.wins === p1.wins && p3.level === p1.level, `seconda riapertura: wins ${p3.wins}, livello ${p3.level} invariati`);
  await leave(page); await toHome(page);
  allErrs.push(...page.errs.map((e) => 'memory: ' + e));
  await ctx.close();
}

/* ---------- 2. Fishing e Colors: destroy() ferma tutto subito ---------- */
for (const id of ['fish', 'colors']) {
  const { ctx, page } = await newPage(browser);
  await openGame(page, id);
  if (id === 'colors') {             // copertina: il tocco fa partire il round (e la voce)
    const go = await page.$('#board .co-go, #board [data-go], #board .co-cover button');
    if (go) { await go.click().catch(() => {}); await sleep(600); }
  } else await sleep(1200);
  await page.evaluate(() => { for (const k in window.__spy) window.__spy[k] = []; window.__t0 = performance.now(); });
  await leave(page);
  await toHome(page);
  const sp = await page.evaluate(() => {
    const s = window.__spy, t0 = window.__t0, empty = s.gameEmpty[0];
    const first = (a) => (a.length ? +(a[0] - t0).toFixed(0) : null);
    return { caf: first(s.caf), orient: first(s.orient), motion: first(s.motion), speech: first(s.speech), empty: empty == null ? null : +(empty - t0).toFixed(0) };
  });
  console.log(`   ${id}: ms dall'uscita ${JSON.stringify(sp)}`);
  const before = (v) => v != null && sp.empty != null && v <= sp.empty + 1;
  check(before(sp.caf), `${id}: cancelAnimationFrame prima che #game si svuoti`);
  if (id === 'fish') check(before(sp.orient) && before(sp.motion), 'fish: sensori (deviceorientation/devicemotion) staccati subito');
  if (id === 'colors') check(before(sp.speech), 'colors: speechSynthesis.cancel subito');
  allErrs.push(...page.errs.map((e) => id + ': ' + e));
  await ctx.close();
}

await browser.close();
const errs = allErrs.filter((e) => !/WebGL|GPU|favicon|Failed to load resource/i.test(e));
check(!errs.length, 'nessun errore in console' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
console.log(fails ? `\n${fails} controlli falliti` : '\nTutto ok');
process.exit(fails ? 1 : 0);
