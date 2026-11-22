// Service worker (sw.js) provato per comportamento: i gestori install / activate / fetch / message registrati da sw.js
// sono chiamati davvero, con cache, rete, pagine e registrazione finte (tests/_sw.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSW, online, SCOPE } from './_sw.mjs';

const U = (p) => SCOPE + p;
const plain = (x) => JSON.parse(JSON.stringify(x));   // oggetti creati nel contesto vm

/* ---------- install ---------- */
test('install: tutta la SHELL in cache, scaricata ignorando la cache HTTP', async () => {
  const sw = loadSW({ net: online() });
  await sw.install();
  assert.ok(sw.SHELL.includes('index.html') && sw.SHELL.includes('src/core/usage.js'));
  for (const f of sw.SHELL) assert.ok(await sw.cached(sw.VERSION, U(f === './' ? '' : f)), `${f} non in cache`);
  const shellCalls = sw.calls.filter((r) => sw.SHELL.some((f) => r.url === U(f === './' ? '' : f)));
  assert.equal(shellCalls.length, sw.SHELL.length);
  for (const r of shellCalls) assert.equal(r.cache, 'reload', r.url);
});

test('install: un file della shell che non arriva fa fallire l\'installazione (mai una versione a metà)', async () => {
  const sw = loadSW({ net: (req, R) => (req.url.endsWith('src/app.js') ? new R('', { status: 404 }) : online()(req, R)) });
  await assert.rejects(sw.install());
});

test('install: prima installazione → skipWaiting subito', async () => {
  const sw = loadSW({ net: online(), active: null, pages: [{ reply: () => ({ type: 'can-update', proto: 2 }) }] });
  await sw.install();
  assert.equal(sw.state.skips, 1);
});

test('install: aggiornamento con una pagina che risponde can-update proto 2 → aspetta il via (niente skipWaiting)', async () => {
  const sw = loadSW({ net: online(), active: {}, pages: [{ reply: (m) => (m.type === 'ask-update' ? { type: 'can-update', proto: 2 } : null) }] });
  await sw.install();
  assert.deepEqual(plain(sw.state.posted), [{ type: 'ask-update' }]);
  assert.equal(sw.state.skips, 0);
  // il via arriva dalla pagina
  sw.message({ type: 'skip' });
  assert.equal(sw.state.skips, 1);
});

test('install: aggiornamento senza una pagina capace (proto 1, nessuna risposta, app chiusa) → skipWaiting', async () => {
  for (const pages of [[{ reply: () => ({ type: 'can-update', proto: 1 }) }], [{}], []]) {
    const sw = loadSW({ net: online(), active: {}, pages });
    await sw.install();
    assert.equal(sw.state.skips, 1, JSON.stringify(pages));
  }
});

test('install: i giochi già scaricati con la versione vecchia passano nella cache nuova', async () => {
  const sw0 = loadSW();
  const g = sw0.HH.catalog.find((x) => x.id === 'boba');
  const old = Object.fromEntries(g.files.map((f) => [U(f), 'old:' + f]));
  const sw = loadSW({ net: online(), active: {}, caches: { 'hh-v0.0.1': old } });
  await sw.install();
  for (const f of g.files) assert.equal((await sw.cached(sw.VERSION, U(f))).body, 'net:/app/' + f, f);
  // offline: si tiene la copia vecchia
  const sw2 = loadSW({ net: (req, R) => (sw2.SHELL.some((f) => req.url === U(f === './' ? '' : f)) ? online()(req, R) : (() => { throw new TypeError('offline'); })()), active: {}, caches: { 'hh-v0.0.1': old } });
  await sw2.install();
  for (const f of g.files) assert.equal((await sw2.cached(sw2.VERSION, U(f))).body, 'old:' + f, f);
  // risposta non ok (es. 500 del server): si tiene la copia vecchia, mai l'errore in cache
  const sw3 = loadSW({ net: (req, R) => (sw3.SHELL.some((f) => req.url === U(f === './' ? '' : f)) ? online()(req, R) : new R('err', { status: 500 })), active: {}, caches: { 'hh-v0.0.1': old } });
  await sw3.install();
  for (const f of g.files) assert.equal((await sw3.cached(sw3.VERSION, U(f))).body, 'old:' + f, f);
});

/* ---------- activate ---------- */
test('activate: cancella le cache diverse dalla versione corrente (anche hh-fonts) e prende le pagine', async () => {
  const sw0 = loadSW();
  const sw = loadSW({ caches: { 'hh-v0.1.0': { [U('index.html')]: 'x' }, 'hh-fonts': {}, other: {}, [sw0.VERSION]: { [U('index.html')]: 'cur' } } });
  await sw.activate();
  assert.deepEqual([...sw.store.keys()], [sw.VERSION]);
  assert.equal((await sw.cached(sw.VERSION, U('index.html'))).body, 'cur');
  assert.equal(sw.state.claims, 1);
});

/* ---------- fetch ---------- */
async function installed(net = online()) {
  let n = online();
  const sw = loadSW({ net: (req, R) => n(req, R) });
  await sw.install();
  n = net;
  sw.calls.length = 0;
  return sw;
}
const offline = () => { throw new TypeError('offline'); };

test('fetch: un file della shell arriva dalla cache, senza rete (anche con ?query)', async () => {
  const sw = await installed((req, R) => new R('fresh'));
  for (const f of ['src/app.js', 'src/core/core.js', 'index.html']) {
    const r = await sw.fetch(U(f) + '?v=2');
    assert.equal(r.body, 'net:/app/' + f);
  }
  assert.equal(sw.calls.length, 0, 'nessuna richiesta di rete');
});

test('fetch: un file di gioco preso dalla rete va in cache (senza query) e poi funziona offline', async () => {
  const sw = await installed();
  const g = sw.HH.catalog.find((x) => x.id === 'sushi');
  const f = g.files.find((x) => x.endsWith('-ui.js'));
  assert.equal(await sw.cached(sw.VERSION, U(f)), undefined);
  const r = await sw.fetch(U(f) + '?v=9');
  assert.equal(r.body, 'net:/app/' + f);
  assert.equal(sw.calls.length, 1);
  assert.equal(sw.calls[0].cache, 'reload');
  assert.ok(await sw.cached(sw.VERSION, U(f)), 'in cache senza la query');
  // anche i file extra (mappe reali) e i testi legali delle altre lingue
  const extra = sw.HH.catalog.flatMap((x) => x.extra || [])[0];
  for (const p of [extra, 'src/i18n/legal/it.js', 'assets/fonts/fonts-ja.css', 'assets/fonts/mochiy-0-400.woff2'].filter(Boolean)) {
    await sw.fetch(U(p));
    assert.ok(await sw.cached(sw.VERSION, U(p)), p);
  }
  const sw2 = await installed(offline);
  sw2.store.get(sw2.VERSION).m.set(U(f), new sw2.Response('cached-game'));
  assert.equal((await sw2.fetch(U(f))).body, 'cached-game');
});

test('fetch offline: una navigazione riceve index.html', async () => {
  const sw = await installed(offline);
  const r = await sw.fetch(U('qualcosa/che/non/esiste?game=boba'), { mode: 'navigate' });
  assert.equal(r.body, 'net:/app/index.html');
});

test('fetch offline: un JS o CSS che non è in cache riceve Response.error(), mai index.html', async () => {
  const sw = await installed(offline);
  for (const p of ['src/core/nuovo.js', 'src/nuovo.css']) {
    const r = await sw.fetch(U(p));
    assert.equal(r.type, 'error', p);
    assert.notEqual(r.body, 'net:/app/index.html');
  }
});

test('fetch: le risposte non ok dei file di gioco e dei font non vanno in cache; gli altri file non si mettono mai in cache', async () => {
  const sw = await installed((req, R) => new R('missing', { status: 404 }));
  const g = sw.HH.catalog.find((x) => x.id === 'boba').files[0];
  for (const p of [g, 'assets/fonts/mochiy-1-400.woff2', 'src/i18n/legal/fr.js']) {
    const r = await sw.fetch(U(p));
    assert.equal(r.status, 404, p);            // la risposta arriva comunque alla pagina
    assert.equal(await sw.cached(sw.VERSION, U(p)), undefined, `${p}: 404 in cache`);
  }
  // un file né della shell né di un gioco: passa dalla rete, anche se ok non resta in cache
  const sw2 = await installed(online());
  const r = await sw2.fetch(U('docs/qualcosa.json'));
  assert.equal(r.body, 'net:/app/docs/qualcosa.json');
  assert.equal(await sw2.cached(sw2.VERSION, U('docs/qualcosa.json')), undefined);
  // un nome di font non valido non è un "file di gioco"
  await sw2.fetch(U('assets/fonts/../x.woff2'));
  await sw2.fetch(U('assets/fonts/Strano_Nome.woff2'));
  assert.equal(await sw2.cached(sw2.VERSION, U('assets/fonts/Strano_Nome.woff2')), undefined);
});

test('fetch: non intercetta altre origini (GoatCounter) né richieste non GET', async () => {
  const sw = await installed();
  assert.equal(await sw.fetch('https://harihari.goatcounter.com/count?p=%2Fopen%2Fboba'), null);
  assert.equal(await sw.fetch(U('src/app.js'), { method: 'POST' }), null);
  assert.equal(sw.calls.length, 0);
});

/* ---------- message ---------- */
test('message: skip → skipWaiting; version → risponde con VERSION; altri messaggi ignorati', () => {
  const sw = loadSW();
  sw.message({ type: 'other' });
  sw.message(null);
  assert.equal(sw.state.skips, 0);
  sw.message({ type: 'skip' });
  assert.equal(sw.state.skips, 1);
  const got = [];
  sw.message({ type: 'version' }, { postMessage: (m) => got.push(m) });
  assert.deepEqual(plain(got), [{ type: 'version', version: sw.VERSION }]);
});
