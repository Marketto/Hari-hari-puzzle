// Prova dell'avviso legale e della pagina "Privacy e condizioni" con Playwright (vedi docs/legal.md):
//   node tools/serve.mjs 5206 &  npm run build  &&  node tools/legal-e2e.mjs [--port 5206] [--shots DIR]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pw = null;
for (const m of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright/index.mjs']) {
  if (!m) continue;
  try { pw = await import(m); break; } catch (e) { /* prossimo */ }
}
if (!pw) { console.error('Playwright non trovato (npm i -D playwright, oppure PLAYWRIGHT_MODULE=…)'); process.exit(2); }
const { chromium } = pw;
const PORT = +arg('port', 5206);
const URL = `http://localhost:${PORT}/`;
const SHOTS = path.join(arg('shots', path.join(os.tmpdir(), 'hh-legal-shots')), '/');
fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const errors = [];
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  NO  ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open({ lang, w = 360, h = 760, scheme = 'light', store = {}, sw = 'block' }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme, serviceWorkers: sw });
  const page = await ctx.newPage();
  const tag = `${lang}/${w}x${h}/${scheme}`;
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  await page.addInitScript(([l, st]) => {
    if (sessionStorage.getItem('init')) return;
    sessionStorage.setItem('init', '1');
    localStorage.setItem('harihari:lang', JSON.stringify(l));
    for (const [k, v] of Object.entries(st)) localStorage.setItem('harihari:' + k, JSON.stringify(v));
  }, [lang, store]);
  await page.goto(URL);
  await page.waitForFunction(() => window.HH && HH.legal);
  return { ctx, page };
}
const fits = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5; }, sel);

for (const lang of ['it', 'ja', 'ar']) {
  console.log('== ' + lang);
  const { ctx, page } = await open({ lang });
  await page.waitForSelector('#legalDlg');
  await sleep(500);
  ok(await page.evaluate(() => document.activeElement && !!document.activeElement.closest('#legalDlg')), 'focus nella modale');
  ok(await page.evaluate(() => document.querySelector('.app').inert === true), 'app dietro inerte');
  ok(await fits(page, '.lg-sheet'), 'modale dentro lo schermo (verticale)');
  await page.screenshot({ path: `${SHOTS}${lang}_360_light.png` });
  ok(await page.isDisabled('#lgAccept'), 'pulsante disattivato all\'inizio');
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  ok(await page.isVisible('#legalDlg'), 'Esc e clic fuori non la chiudono');
  await page.check('#lgChk-terms');
  ok(await page.isDisabled('#lgAccept'), 'una sola casella: ancora disattivato');
  await page.check('#lgChk-privacy');
  ok(!(await page.isDisabled('#lgAccept')), 'due caselle: attivo');
  // testo completo e ritorno
  await page.click('.lg-main [data-doc="terms"]');
  await page.waitForSelector('.lg-sub:not([hidden]) .lg-doc h4');
  await sleep(250);
  await page.screenshot({ path: `${SHOTS}${lang}_360_terms.png` });
  ok(await page.evaluate(() => document.querySelectorAll('.lg-doc section').length === 7), '7 sezioni nelle condizioni');
  await page.click('.lg-tab[data-tab="licenses"]');
  await page.waitForSelector('.lg-comp');
  await page.click('.lg-comp details summary');
  await sleep(200);
  await page.screenshot({ path: `${SHOTS}${lang}_360_licenses.png` });
  await page.keyboard.press('Escape');                          // Esc nella sotto-vista = indietro
  ok(await page.isVisible('.lg-main') && await page.isChecked('#lgChk-terms') && await page.isChecked('#lgChk-privacy'), 'ritorno: caselle conservate');
  // tasto indietro del browser: la modale resta
  await page.goBack().catch(() => {});
  await sleep(300);
  ok(await page.isVisible('#legalDlg'), 'indietro non la chiude');
  ok(!(await page.isVisible('#anDlg')), 'niente domanda statistiche prima dell\'accettazione');
  await page.click('#lgAccept');
  ok(!(await page.isVisible('#legalDlg')), 'accettata: modale chiusa');
  await page.waitForSelector('#anDlg', { timeout: 6000 }).then(() => ok(true, 'poi compare la domanda statistiche'), () => ok(false, 'poi compare la domanda statistiche'));
  await page.screenshot({ path: `${SHOTS}${lang}_360_stats_after.png` });
  await page.click('[data-an="0"]');
  const acc = await page.evaluate(() => JSON.parse(localStorage.getItem('harihari:legal')));
  ok(acc && acc.v === 1 && acc.at > 0, 'salvata in HH.store {v, at}');
  await page.reload();
  await page.waitForFunction(() => window.HH && HH.legal);
  await sleep(600);
  ok(!(await page.isVisible('#legalDlg')), 'ricarica: non riappare');
  await page.click('#legalLink');
  await page.waitForSelector('#legalPage .lg-doc h4');
  await sleep(250);
  ok(await page.evaluate(() => document.querySelectorAll('#legalPage .lg-tab').length === 3), 'pagina con 3 schede');
  ok(await page.isVisible('.lg-accepted'), 'riga "accettate il …"');
  console.log('     ', await page.textContent('.lg-accepted'));
  await page.screenshot({ path: `${SHOTS}${lang}_360_page.png` });
  await page.click('#legalPage .lg-tab[data-tab="privacy"]');
  await sleep(250);
  await page.screenshot({ path: `${SHOTS}${lang}_360_page_privacy.png` });
  await page.keyboard.press('Escape');
  ok(!(await page.isVisible('#legalPage')), 'la pagina si chiude con Esc');
  // piè di pagina
  await page.evaluate(() => document.querySelector('#legalLink').scrollIntoView({ block: 'center' }));
  await sleep(200);
  await page.screenshot({ path: `${SHOTS}${lang}_360_footer.png` });
  // progressi
  await page.click('#scoreChip');
  await page.click('#statsLegal');
  await page.waitForSelector('#legalPage');
  ok(await page.evaluate(() => document.querySelector('#legalPage .lg-tab[aria-selected="true"]').dataset.tab === 'privacy'), 'da Progressi apre la privacy');
  await ctx.close();

  // scuro e orizzontale
  for (const [w, h, scheme] of [[360, 760, 'dark'], [915, 412, 'light'], [915, 412, 'dark']]) {
    const { ctx: c2, page: p2 } = await open({ lang, w, h, scheme });
    await p2.waitForSelector('#legalDlg');
    await sleep(500);
    ok(await fits(p2, '.lg-sheet'), `modale dentro lo schermo ${w}x${h} ${scheme}`);
    const acc2 = await p2.evaluate(() => { const b = document.querySelector('#lgAccept'); b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
    ok(acc2, 'pulsante raggiungibile (scorrimento interno)');
    await p2.evaluate(() => { const m = document.querySelector('.lg-main'); m.scrollTop = 0; });
    await p2.screenshot({ path: `${SHOTS}${lang}_${w}_${scheme}.png` });
    if (w > h) {
      await p2.click('.lg-main [data-doc="privacy"]');
      await p2.waitForSelector('.lg-sub:not([hidden]) .lg-doc h4');
      await sleep(250);
      ok(await fits(p2, '.lg-sheet'), 'sotto-vista dentro lo schermo in orizzontale');
      await p2.screenshot({ path: `${SHOTS}${lang}_${w}_${scheme}_privacy.png` });
    }
    await c2.close();
  }
}

// partita ripresa: la modale blocca finché non si accetta, poi si torna alla partita
{
  console.log('== partita ripresa');
  const { ctx, page } = await open({ lang: 'it', store: { legal: { v: 1, at: 1 }, anConsent: false, 'tut:boba': 1 } });
  await page.click('.card[data-game="boba"]');
  await page.waitForSelector('#board');
  await sleep(6000);
  ok(await page.evaluate(() => !!localStorage.getItem('harihari:save:boba') && JSON.parse(localStorage.getItem('harihari:screen')) === 'boba'), 'partita salvata');
  await page.evaluate(() => localStorage.removeItem('harihari:legal'));
  await page.reload();
  await page.waitForSelector('#legalDlg');
  await sleep(400);
  ok(await page.isHidden('#game'), 'gioco non aperto prima di accettare');
  await page.check('#lgChk-terms'); await page.check('#lgChk-privacy'); await page.click('#lgAccept');
  await page.waitForSelector('#game:not([hidden]) #board', { timeout: 8000 }).then(() => ok(true, 'dopo l\'accettazione riparte la partita'), () => ok(false, 'dopo l\'accettazione riparte la partita'));
  await ctx.close();
}

// cambio lingua dalla modale: caselle conservate
{
  console.log('== cambio lingua dalla modale');
  const { ctx, page } = await open({ lang: 'it' });
  await page.waitForSelector('#legalDlg');
  await page.check('#lgChk-terms');
  await page.click('#lgLang');
  await page.click('#langList [data-lang="ar"]');
  await sleep(400);
  ok(await page.evaluate(() => document.documentElement.dir === 'rtl' && document.querySelector('#lgTitle').textContent === HH.LOCALES.ar.lg_title), 'testi in arabo');
  ok(await page.isChecked('#lgChk-terms') && !(await page.isChecked('#lgChk-privacy')), 'caselle conservate');
  await page.screenshot({ path: `${SHOTS}it_to_ar.png` });
  await ctx.close();
}

// tutte le lingue a 360 px: la finestra sta nello schermo, "Accetto e gioco" su una riga e dentro la finestra
{
  console.log('== 43 lingue a 360 px');
  const { ctx, page } = await open({ lang: 'en' });
  await page.waitForSelector('#legalDlg');
  const codes = await page.evaluate(() => HH.LANGS.map((l) => l.code));
  const bad = [];
  for (const code of codes) {
    const r = await page.evaluate((c) => {
      HH.i18n.set(c);
      const b = document.querySelector('#lgAccept'), sh = document.querySelector('.lg-sheet'), s = b.querySelector('span');
      const rb = b.getBoundingClientRect(), rs = sh.getBoundingClientRect();
      return { one: s.getClientRects().length === 1 && b.scrollWidth <= b.clientWidth + 1, inside: rb.left >= rs.left && rb.right <= rs.right, fits: rs.bottom <= innerHeight + 0.5 && rs.right <= innerWidth + 0.5, w: Math.round(rb.width) };
    }, code);
    if (!r.one || !r.inside || !r.fits) bad.push(`${code} ${JSON.stringify(r)}`);
  }
  ok(!bad.length, 'pulsante e finestra a posto in tutte le lingue' + (bad.length ? ': ' + bad.join(' · ') : ''));
  for (const code of ['hr', 'fi', 'sr', 'bs']) {
    await page.evaluate((c) => HH.i18n.set(c), code);
    await page.evaluate(() => { const m = document.querySelector('.lg-main'); m.scrollTop = m.scrollHeight; });
    await page.screenshot({ path: `${SHOTS}${code}_360_accept.png` });
  }
  await ctx.close();
}

// file unico (build): testi di tutte le lingue senza rete
{
  console.log('== file unico');
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, offline: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('inline: ' + e.message));
  await page.addInitScript(() => localStorage.setItem('harihari:lang', '"ja"'));
  await page.goto('file://' + path.join(root, 'dist/hari-hari-puzzle.html'));
  await page.waitForSelector('#legalDlg');
  await page.click('.lg-main [data-doc="licenses"]');
  await page.waitForSelector('.lg-comp');
  ok(await page.evaluate(() => Object.keys(HH.LEGAL).length === HH.LANGS.length), 'tutte le lingue nel file unico');
  ok(!(await page.isVisible('.lg-sub .lg-note:first-child:has-text("offline")')), 'giapponese senza avviso offline');
  await ctx.close();
}

await browser.close();
const real = errors.filter((e) => !/fonts\.(googleapis|gstatic)|net::ERR_INTERNET_DISCONNECTED/.test(e));
console.log(real.length ? 'ERRORI console:\n' + real.join('\n') : 'nessun errore in console');
console.log(fails ? `${fails} controlli falliti` : 'tutto ok');
process.exit(fails || real.length ? 1 : 0);
