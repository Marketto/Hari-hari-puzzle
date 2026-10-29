// Prova reale di Hari Rally a due in Chromium (Playwright), col modulo vero HH.mp:
//   node tools/serve.mjs 5197 &  node tools/rally-e2e.mjs [--port 5197] [--shots DIR]
// Due "telefoni" (contesti separati, uno col tema chiaro e uno scuro) aprono il rally, scelgono "Gioca insieme" →
// "Due telefoni", si abbinano COL SUONO (microfono finto che riceve il PCM cantato dall'altra pagina, come
// tools/mp-e2e.mjs), confermano i 4 frutti; l'ospite sceglie il kart (Volpe sul mandarino) e si corre:
// - stessa pista (solo il seme viaggia), l'input dell'ospite arriva all'host, viste coerenti (foto affiancate);
// - pausa dall'ospite → anche l'host; ripresa dall'host → anche l'ospite;
// - traguardo: stessa classifica su entrambi, vittoria di squadra (se uno dei due è primo) su entrambi;
// - l'ospite esce: sull'host il suo kart passa all'IA e la gara continua; l'ospite torna alla sua gara da solo;
// - secondo abbinamento, poi la pagina dell'ospite si chiude di colpo: il link cade (lost) e sull'host il suo kart va all'IA;
// - nessun errore in console.
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = +arg('port', 5197), SHOTS = arg('shots', '');
const URL = `http://localhost:${PORT}/`;
let pw;
for (const m of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright/index.mjs']) {
  if (!m) continue;
  try { pw = await import(m); break; } catch (e) { /* prossimo */ }
}
if (!pw) { console.error('Playwright non trovato (npm i -D playwright, oppure PLAYWRIGHT_MODULE=…)'); process.exit(2); }
const { chromium } = pw;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const INIT = () => {
  const realGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  let mic = null, cam = null;
  const keep = [];
  function makeMic() {
    const ctx = new AudioContext({ sampleRate: 48000 }), dest = ctx.createMediaStreamDestination();
    // fruscio di fondo a −46 dB
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.005;
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; ns.connect(dest); ns.start();
    return {
      ctx, stream: dest.stream,
      play(b64, sr, gain) {
        const bin = atob(b64), n = bin.length >> 1, buf = ctx.createBuffer(1, n, sr), ch = buf.getChannelData(0);
        for (let i = 0; i < n; i++) { let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (v > 32767) v -= 65536; ch[i] = v / 32768; }
        const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = gain; s.buffer = buf; s.connect(g); g.connect(dest); s.start();
      },
    };
  }
  function makeCam() {
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const x = c.getContext('2d'); let img = null;
    const paint = () => {
      x.fillStyle = '#6d6a66'; x.fillRect(0, 0, 640, 480);
      if (img) { x.save(); x.translate(320, 240); x.rotate(0.06); const s = Math.min(380 / img.width, 380 / img.height); x.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s); x.restore(); }
      for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},.08)`; x.fillRect(Math.random() * 640, Math.random() * 480, 3, 3); }
    };
    setInterval(paint, 100); paint();
    return { stream: c.captureStream(10), show(url) { const i = new Image(); i.onload = () => { img = i; }; i.src = url; } };
  }
  navigator.mediaDevices.getUserMedia = async (c) => {
    // il permesso e la cattura "vera" (dispositivi finti) sbloccano gli IP host al posto dei nomi .local
    const real = await realGUM(c);
    keep.push(real);
    if (c && c.video) { cam = cam || makeCam(); window.__cam = cam; return cam.stream.clone(); }
    mic = mic || makeMic(); window.__mic = mic; return mic.stream.clone();
  };
  window.__mic = { play() {} };
  window.__cam = { show() {} };
  // ciò che la pagina canta va allo script (PCM a 16 bit, base64)
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    const b = this.buffer;
    if (b && b.duration > 2 && b.numberOfChannels === 1 && window.__mpTx && !(mic && this.context === mic.ctx)) {
      const ch = b.getChannelData(0), u = new Uint8Array(ch.length * 2);
      for (let i = 0; i < ch.length; i++) { const v = Math.max(-32768, Math.min(32767, Math.round(ch[i] * 32767))); u[2 * i] = v & 255; u[2 * i + 1] = (v >> 8) & 255; }
      let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      window.__mpTx(btoa(s), b.sampleRate);
    }
    return start.apply(this, a);
  };
};

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const errors = [];
let failed = 0;
const ok = (c, msg) => { console.log((c ? '  ok  ' : '  NO  ') + msg); if (!c) failed++; };
const W = +arg('w', 800), H = +arg('h', 400);

async function phone(name, scheme) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.grantPermissions(['microphone', 'camera'], { origin: `http://localhost:${PORT}` });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(URL);
  await page.evaluate(() => {
    for (const [k, v] of Object.entries({ 'tut:rally': 1, lang: 'en', anConsent: false, 'prog:rally': { level: 1 } })) localStorage.setItem('harihari:' + k, JSON.stringify(v));
  });
  await page.goto(URL);
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.card[data-game="rally"]').click());
  await page.waitForFunction(() => { const r = (document.querySelector('#board') || {})._rally; return r && r.three(); });
  await page.waitForTimeout(800);
  return { name, ctx, page };
}
function wireAudio(a, b) {
  const relay = (from, to) => async (pcm, sr) => {
    try { await to.page.evaluate(([p, s]) => window.__mic.play(p, s, 0.5), [pcm, sr]); } catch (e) { /* pagina chiusa */ }
    try { await from.page.evaluate(([p, s]) => window.__mic.play(p, s, 0.3), [pcm, sr]); } catch (e) { /* pagina chiusa */ }
  };
  return Promise.all([a.page.exposeFunction('__mpTx', relay(a, b)), b.page.exposeFunction('__mpTx', relay(b, a))]);
}
const RY = (ph, fn, arg) => ph.page.evaluate(fn, arg);
const shot = (ph, file) => (SHOTS ? ph.page.screenshot({ path: path.join(SHOTS, file) }) : null);
const view = (ph) => RY(ph, () => { const r = document.querySelector('#board')._rally, s = r.state(); return { t: s.t, hu: s.hu || null, ps: s.ps, fin: s.fin, mp: r.mp(), cars: s.cars.map((c) => [c.s, c.d]) }; });
const openNet = async (ph) => {
  await RY(ph, () => document.querySelector('#board')._rally.menu());
  await ph.page.waitForSelector('.ry-mpv:not([hidden]) [data-mp="net"]:not([disabled])');
  await ph.page.click('[data-mp="net"]');
};

const A = await phone('host', 'light'), B = await phone('guest', 'dark');
try {
  await wireAudio(A, B);
  // "Gioca insieme" → "Due telefoni": prima l'ospite si mette in ascolto, poi l'host canta
  await openNet(B);
  await B.page.waitForSelector('.mp-choose'); await B.page.click('[data-act="join"]');
  await B.page.waitForSelector('.mp-listen', { timeout: 8000 });
  await openNet(A);
  await A.page.waitForSelector('.mp-choose'); await A.page.click('[data-act="host"]');
  await A.page.waitForSelector('.mp-sing', { timeout: 8000 });
  await Promise.all([A.page.waitForSelector('.mp-sas', { timeout: 40000 }), B.page.waitForSelector('.mp-sas', { timeout: 40000 })]);
  const fa = await A.page.$$eval('.mp-fruit', (e) => e.map((x) => x.textContent).join('')), fb = await B.page.$$eval('.mp-fruit', (e) => e.map((x) => x.textContent).join(''));
  ok(fa.length > 0 && fa === fb, `abbinamento col suono: stessi frutti ${fa} = ${fb}`);
  await A.page.click('[data-act="sas-yes"]'); await B.page.click('[data-act="sas-yes"]');
  // l'host aspetta l'amico; l'ospite sceglie il kart
  await B.page.waitForSelector('.ry-pick', { timeout: 15000 });
  await A.page.waitForSelector('.ry-mpv:not([hidden]) .ry-dots', { timeout: 15000 });
  await shot(A, 'rally-e2e-wait-host.png'); await shot(B, 'rally-e2e-pick-guest.png');
  if (arg('debug', '')) for (const ph of [A, B]) await RY(ph, () => { const t0 = performance.now(); window.__ryLong = []; window.__ryDbg = () => JSON.stringify({ t0: Math.round(t0), long: window.__ryLong.slice(-6) }); new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ryLong.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); });
  await B.page.click('[data-mp="pick:fox"]');
  await Promise.all([A, B].map((ph) => ph.page.waitForFunction(() => { const r = document.querySelector('#board')._rally; return r.state().hu && r.mp().net; }, null, { timeout: 120000 })));
  if (arg('debug', '')) for (let i = 0; i < 6; i++) { console.log(JSON.stringify(await Promise.all([A, B].map((ph) => RY(ph, () => { const r = document.querySelector('#board')._rally, s = r.state(); return { drop: r.lastDrop, mp: r.mp(), hu: s.hu, seed: s.seed, t: s.t, msg: document.querySelector('.ry-msg').innerText }; }))))); await A.page.waitForTimeout(700); }
  const seeds = await Promise.all([A, B].map((ph) => RY(ph, () => document.querySelector('#board')._rally.state().seed)));
  ok(seeds[0] === seeds[1], `stessa pista dal seme (${seeds[0]})`);
  const who = await RY(B, () => document.querySelector('#board')._rally.state().who.join());
  ok(who.startsWith('hari,fox,'), `l'ospite guida la Volpe (${who}), 2 avversari`);
  // l'ospite guida (tastiera: gas e sterzo) → l'host lo vede
  await A.page.waitForFunction(() => document.querySelector('#board')._rally.state().ready <= 0, null, { timeout: 30000 });
  const s0 = (await view(A)).cars[1][0];
  // (in headless il disegno è lento e la simulazione va più piano del tempo reale: si aspetta il tempo di gara)
  const tg = (await view(A)).t;
  await B.page.keyboard.down('ArrowUp');
  await A.page.waitForFunction((t) => document.querySelector('#board')._rally.state().t > t + 3, tg, { timeout: 60000 });
  await B.page.keyboard.up('ArrowUp');
  const s1 = (await view(A)).cars[1][0];
  ok(s1 > s0 + 5, `l'input dell'ospite arriva: kart 1 da ${s0.toFixed(1)} a ${s1.toFixed(1)} m sull'host`);
  // autopilota su entrambi (stesso percorso dei comandi), poi foto coerenti: si ferma l'host, l'ospite raggiunge
  // l'ultima istantanea, si ferma anche lui
  await Promise.all([A, B].map((ph) => RY(ph, () => document.querySelector('#board')._rally.auto2(true))));
  const ta = (await view(A)).t;
  await A.page.waitForFunction((t) => document.querySelector('#board')._rally.state().t > t + 5, ta, { timeout: 90000 });
  await RY(A, () => document.querySelector('#board')._rally.hold(true)); await B.page.waitForTimeout(800); await RY(B, () => document.querySelector('#board')._rally.hold(true));
  const [hv, gv] = await Promise.all([view(A), view(B)]);
  const dOther = Math.max(...[0, 2, 3].map((i) => Math.hypot(hv.cars[i][0] - gv.cars[i][0], hv.cars[i][1] - gv.cars[i][1])));
  const dMe = Math.hypot(hv.cars[1][0] - gv.cars[1][0], hv.cars[1][1] - gv.cars[1][1]);
  ok(dOther < 1.5 && dMe < 6 && Math.abs(hv.t - gv.t) < 0.6, `viste coerenti: altri kart entro ${dOther.toFixed(2)} m, il proprio (predetto) ${dMe.toFixed(2)} m, tempo ${gv.t.toFixed(2)}/${hv.t.toFixed(2)}`);
  await Promise.all([shot(A, 'rally-e2e-play-host.png'), shot(B, 'rally-e2e-play-guest.png')]);
  await Promise.all([A, B].map((ph) => RY(ph, () => document.querySelector('#board')._rally.hold(false))));
  // pausa dall'ospite → host; ripresa dall'host → ospite
  await B.page.click('.ry-pbtn');
  await A.page.waitForSelector('.ry-pause:not([hidden])', { timeout: 15000 });
  ok(true, 'pausa dall\'ospite anche sull\'host');
  await A.page.click('.ry-pause');
  await B.page.waitForSelector('.ry-pause', { state: 'hidden', timeout: 15000 });
  ok(true, 'ripresa dall\'host anche sull\'ospite');
  // traguardo (avanti veloce sull'host: gli eventi e la classifica arrivano all'ospite dalla sessione)
  await A.page.waitForFunction(() => document.querySelector('#board')._rally.state().ready <= 0, null, { timeout: 30000 });
  await Promise.all([A, B].map((ph) => RY(ph, () => { document.querySelector('#board')._rally.winDelay = 1500; })));
  for (let i = 0; i < 40; i++) { const f = await RY(A, () => { const r = document.querySelector('#board')._rally; r.ff(8); return r.state().fin >= 0; }); if (f) break; await A.page.waitForTimeout(150); }
  await B.page.waitForFunction(() => document.querySelector('#board')._rally.state().fin >= 0, null, { timeout: 20000 });
  const [ra, rb] = await Promise.all([A, B].map((ph) => RY(ph, () => { const s = document.querySelector('#board')._rally.state(); return JSON.stringify({ res: s.res, ps: s.ps, won: s.won }); })));
  ok(ra === rb, `stessa classifica su entrambi ${ra}`);
  await A.page.waitForTimeout(700);
  await Promise.all([shot(A, 'rally-e2e-end-host.png'), shot(B, 'rally-e2e-end-guest.png')]);
  if (JSON.parse(ra).won) {
    await Promise.all([A.page.waitForSelector('#winDlg:not([hidden])', { timeout: 10000 }), B.page.waitForSelector('#winDlg:not([hidden])', { timeout: 10000 })]);
    ok(true, 'vittoria di squadra su entrambi i telefoni (fragoline per ciascuno)');
    await A.page.click('#winNext');
    await B.page.waitForFunction(() => { const s = document.querySelector('#board')._rally.state(); return s.hu && s.fin < 0 && s.t < 2; }, null, { timeout: 20000 });
    const lv = await Promise.all([A, B].map((ph) => RY(ph, () => document.querySelector('#board')._rally.state().level)));
    ok(lv[0] === 2 && lv[1] === 2, `gara successiva su entrambi (livelli ${lv})`);
  } else {
    await A.page.click('.ry-end .ry-retry');
    await B.page.waitForFunction(() => { const s = document.querySelector('#board')._rally.state(); return s.hu && s.fin < 0 && s.t < 2; }, null, { timeout: 20000 });
    ok(true, 'rivincita: nuova gara anche sull\'ospite');
  }
  // l'ospite esce ("Da solo"): sull'host il suo kart passa all'IA e la gara continua
  await A.page.waitForFunction(() => document.querySelector('#board')._rally.state().ready <= 0, null, { timeout: 30000 });
  await RY(B, () => document.querySelector('#board')._rally.solo());
  await A.page.waitForFunction(() => { const r = document.querySelector('#board')._rally; return !r.mp().net && r.state().hu && r.state().hu.length === 1; }, null, { timeout: 15000 });
  const t1 = (await view(A)).t; await A.page.waitForTimeout(4000); const t2 = (await view(A)).t;
  ok(t2 > t1 + 0.3, `sull'host il kart dell'ospite è dell'IA e la gara continua (t ${t1.toFixed(1)} → ${t2.toFixed(1)})`);
  const gb = await view(B);
  ok(!gb.hu && gb.mp.mode === '', 'l\'ospite gioca da solo');
  await Promise.all([shot(A, 'rally-e2e-left-host.png'), shot(B, 'rally-e2e-left-guest.png')]);
  // il link cade davvero: secondo abbinamento, poi la pagina dell'ospite si chiude di colpo a metà gara
  await RY(A, () => document.querySelector('#board')._rally.ff(0.1));
  await openNet(B);
  await B.page.waitForSelector('.mp-choose'); await B.page.click('[data-act="join"]');
  await B.page.waitForSelector('.mp-listen', { timeout: 8000 });
  await openNet(A);
  await A.page.waitForSelector('.mp-choose'); await A.page.click('[data-act="host"]');
  await Promise.all([A.page.waitForSelector('.mp-sas', { timeout: 60000 }), B.page.waitForSelector('.mp-sas', { timeout: 60000 })]);
  await A.page.click('[data-act="sas-yes"]'); await B.page.click('[data-act="sas-yes"]');
  await B.page.waitForSelector('.ry-pick', { timeout: 15000 });
  await B.page.click('[data-mp="pick:kitty"]');
  await A.page.waitForFunction(() => { const r = document.querySelector('#board')._rally, s = r.state(); return s.hu && s.hu.length === 2 && r.mp().net && s.ready <= 0; }, null, { timeout: 120000 });
  const tk = (await view(A)).t;
  await A.page.waitForFunction((t) => document.querySelector('#board')._rally.state().t > t + 1, tk, { timeout: 60000 });
  await B.ctx.close();
  await A.page.waitForFunction(() => { const r = document.querySelector('#board')._rally; return !r.mp().net && r.state().hu && r.state().hu.length === 1; }, null, { timeout: 40000 });
  const why = await RY(A, () => document.querySelector('#board')._rally.lastDrop);
  const msg = await RY(A, () => document.querySelector('.ry-msg').innerText);
  await shot(A, 'rally-e2e-drop-host.png');
  const t3 = (await view(A)).t; await A.page.waitForTimeout(3000); const v4 = await view(A);
  ok(v4.t > t3 + 0.3 && v4.hu.join() === '0', `link caduto (${why}): sull'host Micia passa all'IA, la gara continua (t ${t3.toFixed(1)} → ${v4.t.toFixed(1)}), messaggio "${msg.trim()}"`);
} catch (e) { console.error(e); failed++; }
await browser.close();
const real = errors.filter((e) => !/favicon/.test(e));
ok(real.length === 0, 'nessun errore in console' + (real.length ? ':\n    ' + real.join('\n    ') : ''));
console.log(failed ? `FALLITO (${failed})` : 'TUTTO OK');
process.exit(failed ? 1 : 0);
