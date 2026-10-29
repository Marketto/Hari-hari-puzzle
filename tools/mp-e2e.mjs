// Prova reale del multigiocatore in Chromium (Playwright): due "telefoni" (due contesti separati) si abbinano davvero.
//   node tools/serve.mjs 5196 &  node tools/mp-e2e.mjs [--port 5196] [--shots DIR] [--only sound|qr|code]
// - Microfono finto: getUserMedia restituisce un MediaStream prodotto da un AudioContext della pagina; lo script prende il
//   PCM che l'altra pagina canta (AudioBufferSourceNode.start) e lo suona in quel microfono (più un po' di fruscio e,
//   più piano, la propria voce: come in una stanza). Si chiama comunque il getUserMedia vero (dispositivi finti di
//   Chromium) così il browser espone gli IP host reali invece dei nomi mDNS.
// - Fotocamera finta: un canvas.captureStream() su cui lo script disegna lo screenshot del QR dell'altro telefono.
// - Controlli: si arriva ai 4 frutti uguali sui due schermi, al DataChannel aperto e a una partita della demo;
//   percorso suono, QR (host col suono spento) e codice testuale; nessun errore in console.
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = +arg('port', 5196), SHOTS = arg('shots', ''), ONLY = arg('only', '');
const URL = `http://localhost:${PORT}/tools/mp-demo.html`;
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

async function phone(name, scheme) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, colorScheme: scheme });
  await ctx.grantPermissions(['microphone', 'camera'], { origin: `http://localhost:${PORT}` });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  return { name, ctx, page };
}
function wireAudio(a, b, o = {}) {
  // a canta → b sente forte, a sente sé stesso più piano (stessa stanza)
  const relay = (from, to) => async (pcm, sr) => {
    if (o.mute && o.mute(from)) return;
    try { await to.page.evaluate(([p, s, g]) => window.__mic.play(p, s, g), [pcm, sr, o.gain || 0.5]); } catch (e) { /* pagina chiusa */ }
    try { await from.page.evaluate(([p, s]) => window.__mic.play(p, s, 0.3), [pcm, sr]); } catch (e) { /* pagina chiusa */ }
  };
  return Promise.all([a.page.exposeFunction('__mpTx', relay(a, b)), b.page.exposeFunction('__mpTx', relay(b, a))]);
}
const shot = async (ph, file, theme) => {
  if (!SHOTS) return;
  if (theme) await ph.page.emulateMedia({ colorScheme: theme });
  await ph.page.waitForTimeout(650);
  await ph.page.screenshot({ path: path.join(SHOTS, file) });
};
const both = async (ph, file) => { await shot(ph, file + '-light.png', 'light'); await shot(ph, file + '-dark.png', 'dark'); await ph.page.emulateMedia({ colorScheme: 'light' }); };
const fruits = (ph) => ph.page.$$eval('.mp-fruit', (e) => e.map((x) => x.textContent).join(''));
async function finishPair(A, B, tag) {
  await Promise.all([A.page.waitForSelector('.mp-sas', { timeout: 30000 }), B.page.waitForSelector('.mp-sas', { timeout: 30000 })]);
  const fa = await fruits(A), fb = await fruits(B);
  ok(fa.length > 0 && fa === fb, `${tag}: stessi frutti sui due schermi ${fa} = ${fb}`);
  await both(A, `mp-${tag}-sas-host`); await both(B, `mp-${tag}-sas-guest`);
  await A.page.click('[data-act="sas-yes"]');
  await A.page.waitForSelector('.mp-wait');
  await both(A, `mp-${tag}-wait-friend`);
  await B.page.click('[data-act="sas-yes"]');
  await Promise.all([A.page.waitForFunction(() => window.__demo.link && window.__demo.link.open), B.page.waitForFunction(() => window.__demo.link && window.__demo.link.open)]);
  ok(true, `${tag}: DataChannel aperto, dialogo chiuso`);
  // si gioca un po': l'ospite si muove, l'host vede il movimento; eventi e rtt
  await B.page.evaluate(() => { const b = document.querySelector('[data-k="r"]'); b.dispatchEvent(new PointerEvent('pointerdown')); });
  await A.page.waitForTimeout(1200);
  await B.page.evaluate(() => { const b = document.querySelector('[data-k="r"]'); b.dispatchEvent(new PointerEvent('pointerup')); });
  const hx = await A.page.evaluate(() => window.__demo.state().p[1].x);
  const gv = await B.page.evaluate(() => window.__demo.view() && window.__demo.view().p[1].x);
  ok(hx > 280 && gv > 280, `${tag}: l'host muove il P2 secondo l'input dell'ospite (${hx.toFixed(0)}) e l'ospite lo vede (${gv && gv.toFixed(0)})`);
  const rtt = await A.page.evaluate(() => window.__demo.link.rtt);
  ok(rtt > 0 && rtt < 200, `${tag}: rtt ${rtt.toFixed(1)} ms`);
  await shot(A, `mp-${tag}-playing-host.png`); await shot(B, `mp-${tag}-playing-guest.png`);
  await A.page.evaluate(() => window.__demo.link.close());
  await B.page.waitForFunction(() => window.__demo.closed === 'remote', null, { timeout: 5000 });
  ok(true, `${tag}: la chiusura dell'host arriva all'ospite`);
}

async function soundPath() {
  console.log('percorso SUONO');
  const A = await phone('host', 'light'), B = await phone('guest', 'light');
  await wireAudio(A, B);
  await Promise.all([A.page.goto(URL), B.page.goto(URL)]);
  await B.page.click('#pair');
  await B.page.waitForSelector('.mp-choose');
  await both(B, 'mp-choose');
  await B.page.click('[data-act="join"]');
  await B.page.waitForSelector('.mp-listen', { timeout: 8000 });
  await A.page.click('#pair');
  await A.page.click('[data-act="host"]');
  await A.page.waitForSelector('.mp-sing', { timeout: 8000 });
  await A.page.waitForTimeout(1500);
  await both(A, 'mp-sound-host-singing');
  await both(B, 'mp-sound-guest-listening');
  const t0 = Date.now();
  await B.page.waitForSelector('.mp-sing, .mp-wait, .mp-sas', { timeout: 20000 });
  ok(true, `l'ospite ha capito la canzone in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await B.page.waitForTimeout(1200);
  await both(B, 'mp-sound-guest-answering');
  await finishPair(A, B, 'sound');
  await A.ctx.close(); await B.ctx.close();
}

async function qrSnap(ph) {
  const el = await ph.page.waitForSelector('.mp-qr-box', { timeout: 15000 });
  return 'data:image/png;base64,' + (await el.screenshot()).toString('base64');
}
async function qrPath() {
  console.log('percorso QR (host col suono spento)');
  const A = await phone('host', 'dark'), B = await phone('guest', 'dark');
  await wireAudio(A, B, { mute: () => true });
  await Promise.all([A.page.goto(URL), B.page.goto(URL)]);
  await A.page.evaluate(() => HH.audio.sfx.setMuted(true));
  await A.page.click('#pair');
  await A.page.click('[data-act="host"]');
  await A.page.waitForSelector('.mp-qr .mp-qr-box', { timeout: 8000 });
  ok(await A.page.$eval('.mp-hint', (e) => e.textContent.length > 0), 'host muto: compare subito il QR con la spiegazione');
  await both(A, 'mp-qr-host-offer');
  await B.page.click('#pair');
  await B.page.click('[data-act="join"]');
  await B.page.waitForSelector('[data-act="scan"]');
  await B.page.click('[data-act="scan"]');
  await B.page.waitForSelector('.mp-scan video');
  await B.page.waitForTimeout(800);
  await both(B, 'mp-qr-guest-scanning');
  await B.page.evaluate((u) => window.__cam.show(u), await qrSnap(A));
  await B.page.waitForSelector('.mp-qr .mp-qr-box', { timeout: 15000 });
  ok(true, 'l\'ospite ha letto il QR dell\'offerta col decoder locale e mostra la risposta');
  await both(B, 'mp-qr-guest-answer');
  await A.page.click('[data-act="scan-answer"]');
  await A.page.waitForSelector('.mp-scan video');
  await A.page.evaluate((u) => window.__cam.show(u), await qrSnap(B));
  await finishPair(A, B, 'qr');
  await A.ctx.close(); await B.ctx.close();
}

async function codePath() {
  console.log('percorso CODICE TESTUALE');
  const A = await phone('host', 'light'), B = await phone('guest', 'light');
  await Promise.all([A.page.goto(URL), B.page.goto(URL)]);
  await A.page.evaluate(() => HH.audio.sfx.setMuted(true));
  await A.page.click('#pair'); await A.page.click('[data-act="host"]');
  await A.page.waitForSelector('.mp-qr');
  await A.page.click('.mp-trouble summary'); await A.page.click('[data-act="code"]');
  const offer = await A.page.$eval('.mp-code[readonly]', (e) => e.value);
  ok(/^HH[A-Za-z0-9_-]{50,60}$/.test(offer), `codice dell'offerta: ${offer.length} caratteri`);
  await both(A, 'mp-code-host');
  await B.page.click('#pair'); await B.page.click('[data-act="join"]');
  await B.page.waitForSelector('.mp-listen');
  await B.page.click('.mp-trouble summary'); await B.page.click('[data-act="code"]');
  await B.page.fill('.mp-paste', 'HHnonvalido');
  await B.page.click('[data-act="paste"]');
  ok(await B.page.$eval('.mp-paste', (e) => e.classList.contains('bad')), 'codice sbagliato: segnalato gentilmente');
  await B.page.fill('.mp-paste', offer);
  await B.page.click('[data-act="paste"]');
  await B.page.waitForSelector('.mp-code[readonly]');
  const answer = await B.page.$eval('.mp-code[readonly]', (e) => e.value);
  await A.page.fill('.mp-paste', answer);
  await A.page.click('[data-act="paste"]');
  await finishPair(A, B, 'code');
  await A.ctx.close(); await B.ctx.close();
}

try {
  if (!ONLY || ONLY === 'sound') await soundPath();
  if (!ONLY || ONLY === 'qr') await qrPath();
  if (!ONLY || ONLY === 'code') await codePath();
} catch (e) { console.error(e); failed++; }
await browser.close();
const real = errors.filter((e) => !/favicon/.test(e));
ok(real.length === 0, 'nessun errore in console' + (real.length ? ':\n    ' + real.join('\n    ') : ''));
console.log(failed ? `FALLITO (${failed})` : 'TUTTO OK');
process.exit(failed ? 1 : 0);
