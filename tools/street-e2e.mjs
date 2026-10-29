// Prova reale di Hari Snack Street a due in Chromium (Playwright), col modulo vero HH.mp:
//   node tools/serve.mjs 5197 &  node tools/street-e2e.mjs [--port 5197] [--shots DIR]
// Due "telefoni" (contesti separati) aprono il gioco, scelgono "Gioca insieme", si abbinano COL SUONO (microfono finto
// che riceve il PCM cantato dall'altra pagina, come tools/mp-e2e.mjs), confermano i 4 frutti e giocano:
// - l'ospite muove Kiki e porge: l'host lo vede nello stato vero, l'ospite vede la stessa scena (viste coerenti);
// - si arriva alla vittoria: finestra di vittoria su entrambi;
// - l'ospite esce: sull'host Kiki diventa CPU e la partita continua; nessun errore in console.
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

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
let failed = 0;
const ok = (c, msg) => { console.log((c ? '  ok  ' : '  NO  ') + msg); if (!c) failed++; };
const W = 800, H = 400;

async function phone(name, scheme) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: scheme });
  await ctx.grantPermissions(['microphone', 'camera'], { origin: `http://localhost:${PORT}` });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(URL);
  await page.evaluate(() => {
    for (const [k, v] of Object.entries({ 'tut:street': 1, 'street:picked': 1, 'street:mode': 'solo', lang: 'en', anConsent: false, 'prog:street': { level: 2 } })) localStorage.setItem('harihari:' + k, JSON.stringify(v));
  });
  await page.goto(URL);
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.card[data-game="street"]').click());
  await page.waitForSelector('.st-cv');
  await page.waitForTimeout(500);
  return { name, ctx, page };
}
function wireAudio(a, b) {
  const relay = (from, to) => async (pcm, sr) => {
    try { await to.page.evaluate(([p, s]) => window.__mic.play(p, s, 0.5), [pcm, sr]); } catch (e) { /* pagina chiusa */ }
    try { await from.page.evaluate(([p, s]) => window.__mic.play(p, s, 0.3), [pcm, sr]); } catch (e) { /* pagina chiusa */ }
  };
  return Promise.all([a.page.exposeFunction('__mpTx', relay(a, b)), b.page.exposeFunction('__mpTx', relay(b, a))]);
}
const st = (ph) => ph.page.evaluate(() => document.querySelector('#board')._street);
const host = (A, fn, arg) => A.page.evaluate(fn, arg);
const shot = (ph, file) => (SHOTS ? ph.page.screenshot({ path: path.join(SHOTS, file) }) : null);
const lanMode = (ph) => ph.page.evaluate(() => { document.querySelector('.st-who').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });

const A = await phone('host', 'light'), B = await phone('guest', 'dark');
try {
  await wireAudio(A, B);
  // "Gioca insieme": prima l'ospite si mette in ascolto, poi l'host canta
  await lanMode(B); await B.page.click('.st-mode[data-mode="lan"]');
  await B.page.waitForSelector('.mp-choose'); await B.page.click('[data-act="join"]');
  await B.page.waitForSelector('.mp-listen', { timeout: 8000 });
  await lanMode(A); await A.page.click('.st-mode[data-mode="lan"]');
  await A.page.waitForSelector('.mp-choose'); await A.page.click('[data-act="host"]');
  await A.page.waitForSelector('.mp-sing', { timeout: 8000 });
  await A.page.waitForTimeout(1200);
  await shot(A, 'street-mp-host-singing.png'); await shot(B, 'street-mp-guest-listening.png');
  await Promise.all([A.page.waitForSelector('.mp-sas', { timeout: 40000 }), B.page.waitForSelector('.mp-sas', { timeout: 40000 })]);
  const fa = await A.page.$$eval('.mp-fruit', (e) => e.map((x) => x.textContent).join('')), fb = await B.page.$$eval('.mp-fruit', (e) => e.map((x) => x.textContent).join(''));
  ok(fa.length > 0 && fa === fb, `abbinamento col suono: stessi frutti ${fa} = ${fb}`);
  await shot(A, 'street-mp-sas-host.png'); await shot(B, 'street-mp-sas-guest.png');
  await A.page.click('[data-act="sas-yes"]'); await B.page.click('[data-act="sas-yes"]');
  await Promise.all([A.page.waitForFunction(() => { const n = document.querySelector('#board')._street.net(); return n && n.role === 'host'; }, null, { timeout: 15000 }),
    B.page.waitForFunction(() => { const n = document.querySelector('#board')._street.net(); return n && n.role === 'guest'; }, null, { timeout: 15000 })]);
  ok(true, 'partita in rete: host = Hari, ospite = Kiki');
  await B.page.waitForFunction(() => !!document.querySelector('#board')._street.view(), null, { timeout: 10000 });
  await A.page.waitForTimeout(1800);                       // "Pronti?"
  // l'ospite muove Kiki (tastiera) e porge
  const x0 = await host(A, () => document.querySelector('#board')._street.state().players[1].x);
  await B.page.keyboard.down('ArrowRight'); await B.page.waitForTimeout(1300); await B.page.keyboard.up('ArrowRight');
  for (let i = 0; i < 4; i++) { await B.page.keyboard.press('KeyC'); await B.page.waitForTimeout(250); }
  await A.page.waitForTimeout(900);
  const hs = await host(A, () => { const s = document.querySelector('#board')._street.state(); return { x: s.players.map((p) => p.x), t: s.t, pc: s.players[1].pc[2] }; });
  const gv = await B.page.evaluate(() => { const v = document.querySelector('#board')._street.view(); return { x: v.players.map((p) => p.x), t: v.t }; });
  ok(hs.x[1] > x0 + 1.5, `l'input dell'ospite arriva: Kiki ${x0.toFixed(2)} → ${hs.x[1].toFixed(2)} m sull'host`);
  ok(hs.pc >= 4, `le pressioni dell'ospite arrivano tutte (salti: ${hs.pc})`);
  ok(Math.abs(gv.x[1] - hs.x[1]) < 0.15 && Math.abs(gv.x[0] - hs.x[0]) < 0.15 && Math.abs(gv.t - hs.t) < 0.4, `viste coerenti: ospite ${gv.x.map((v) => v.toFixed(2))} · host ${hs.x.map((v) => v.toFixed(2))} (t ${gv.t.toFixed(2)} / ${hs.t.toFixed(2)})`);
  // avanti fino all'ondata (eventi inoltrati all'ospite), foto affiancate
  await host(A, () => document.querySelector('#board')._street.ff(9));
  await A.page.waitForTimeout(900);
  const cmp = await Promise.all([host(A, () => document.querySelector('#board')._street.state().animals.map((a) => a.id).sort().join()), B.page.evaluate(() => document.querySelector('#board')._street.view().animals.map((a) => a.id).sort().join())]);
  ok(cmp[0] === cmp[1], `stessi animali sui due schermi (${cmp[0] || 'nessuno'})`);
  await Promise.all([shot(A, 'street-mp-play-host.png'), shot(B, 'street-mp-play-guest.png')]);
  // vittoria
  await host(A, () => document.querySelector('#board')._street.ff(400));
  await Promise.all([A.page.waitForSelector('#winDlg:not([hidden])', { timeout: 10000 }), B.page.waitForSelector('#winDlg:not([hidden])', { timeout: 10000 })]);
  ok(true, 'vittoria su entrambi i telefoni');
  await Promise.all([shot(A, 'street-mp-win-host.png'), shot(B, 'street-mp-win-guest.png')]);
  // livello successivo: l'host riparte, l'ospite lo segue
  await A.page.click('#winNext'); await B.page.click('#winNext');
  await A.page.waitForTimeout(2500);
  const lv = await Promise.all([host(A, () => document.querySelector('#board')._street.state().level), B.page.evaluate(() => document.querySelector('#board')._street.view().level)]);
  ok(lv[0] === 3 && lv[1] === 3, `livello successivo su entrambi (${lv})`);
  // l'ospite esce (sceglie "da solo"): sull'host Kiki diventa CPU e si continua
  await lanMode(B); await B.page.click('.st-mode[data-mode="solo"]');
  await A.page.waitForFunction(() => { const S = document.querySelector('#board')._street; return !S.net() && S.state().players[1].cpu === 1; }, null, { timeout: 10000 });
  const t1 = await host(A, () => document.querySelector('#board')._street.state().t);
  await A.page.waitForTimeout(1500);
  const t2 = await host(A, () => document.querySelector('#board')._street.state().t);
  ok(t2 > t1 + 1, `caduta del link: sull'host Kiki è CPU e la partita continua (t ${t1.toFixed(1)} → ${t2.toFixed(1)})`);
  await shot(A, 'street-mp-left-host.png');
  ok(await B.page.evaluate(() => { const S = document.querySelector('#board')._street; return !S.net() && S.mode() === 'solo' && !!S.state(); }), 'l\'ospite gioca da solo in locale');
} catch (e) { console.error(e); failed++; }
await browser.close();
const real = errors.filter((e) => !/favicon/.test(e));
ok(real.length === 0, 'nessun errore in console' + (real.length ? ':\n    ' + real.join('\n    ') : ''));
console.log(failed ? `FALLITO (${failed})` : 'TUTTO OK');
process.exit(failed ? 1 : 0);
