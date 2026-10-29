// Modem acustico di Hari: Reed-Solomon, melodia, e il giro completo byte → PCM → stanza simulata → byte
// (rumore, riverbero leggero, deriva di clock ±0,5 %, volume basso), con il tasso di successo misurato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';
import { room, rng } from './_channel.mjs';

const SLOW = process.env.CI ? 3 : 1;
const HH = load('src/net/sonic.js');
const S = HH.sonic, RS = HH.rs;
const SR = 48000;
const randBytes = (n, seed) => { const r = rng(seed); return Uint8Array.from({ length: n }, () => Math.floor(r() * 256)); };
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);

test('Reed-Solomon: corregge fino a nsym/2 errori o nsym cancellazioni, rifiuta il resto', () => {
  const r = rng(1);
  for (let trial = 0; trial < 200; trial++) {
    const k = 5 + Math.floor(r() * 60), nsym = 2 * (2 + Math.floor(r() * 8)), msg = Array.from(randBytes(k, trial + 1));
    const cw = msg.concat(RS.encode(msg, nsym));
    const errs = Math.floor(r() * (nsym / 2 + 1)), pos = new Set();
    while (pos.size < errs) pos.add(Math.floor(r() * cw.length));
    const bad = cw.slice();
    for (const p of pos) bad[p] ^= 1 + Math.floor(r() * 255);
    assert.deepEqual(RS.decode(bad, nsym), msg, `errori ${errs}/${nsym}`);
    // solo cancellazioni (posizioni note): fino a nsym
    const er = new Set();
    while (er.size < nsym) er.add(Math.floor(r() * cw.length));
    const bad2 = cw.slice();
    for (const p of er) bad2[p] = Math.floor(r() * 256);
    assert.deepEqual(RS.decode(bad2, nsym, [...er]), msg, 'cancellazioni');
  }
  // troppi errori: null oppure un'altra parola (che il CRC del modem scarta), mai un'eccezione
  const msg = Array.from(randBytes(30, 3)), cw = msg.concat(RS.encode(msg, 8));
  for (let i = 0; i < 9; i++) cw[i * 3] ^= 0x5a;
  const out = RS.decode(cw, 8);
  assert.ok(out === null || !same(out, msg));
});

test('CRC-16/CCITT-FALSE: vettore noto', () => {
  assert.equal(S.crc16(Array.from('123456789', (c) => c.charCodeAt(0))), 0x29b1);
});

test('melodia: note della pentatonica di Do (Do5–Do8), durata 5–10 s per un\'offerta di 40 byte, niente clipping', () => {
  const PENTA = new Set([0, 2, 4, 7, 9]);
  for (const f of S.TONES) {
    const midi = Math.round(69 + 12 * Math.log2(f / 440));
    assert.ok(PENTA.has(midi % 12), `${f} Hz fuori scala`);
    assert.ok(f >= 520 && f <= 4200);
  }
  const d = S.duration(40);
  assert.ok(d >= 5 && d <= 10, `durata ${d}`);
  const pcm = S.encode(randBytes(40, 2), { sampleRate: SR });
  assert.ok(Math.abs(pcm.length / SR - d) < 0.01);
  let peak = 0;
  for (const v of pcm) peak = Math.max(peak, Math.abs(v));
  assert.ok(peak <= 0.65 && peak > 0.3, 'picco ' + peak);
  // le stesse note in fila sono rare (sbiancamento): suona come una melodia, non come un allarme
  const sy = S.frameSymbols(randBytes(40, 2));
  let rep = 0;
  for (let i = 1; i < sy.length; i++) if (sy[i] === sy[i - 1]) rep++;
  assert.ok(rep / sy.length < 0.15);
});

test('ricezione a pezzetti da 128 campioni (come un AudioWorklet), due trame di fila, nessun falso allarme', () => {
  const a = randBytes(40, 5), b = randBytes(46, 6), got = [];
  const rx = S.receiver({ sampleRate: SR, onFrame: (x) => got.push(x) });
  const pcm = room(Float32Array.from([...S.encode(a, { sampleRate: SR }), ...new Float32Array(SR * 0.4), ...S.encode(b, { sampleRate: SR })]), SR, { noise: 0.01, seed: 4 });
  for (let i = 0; i < pcm.length; i += 128) rx.push(pcm.subarray(i, i + 128));
  assert.equal(got.length, 2);
  assert.ok(same(got[0], a) && same(got[1], b));
  // solo rumore e musica che non è la nostra: nessuna trama
  const r = rng(8), noise = new Float32Array(SR * 6);
  for (let i = 0; i < noise.length; i++) noise[i] = (r() - 0.5) * 0.2 + 0.3 * Math.sin(2 * Math.PI * S.TONES[(i / 2400 | 0) % 16] * i / SR);
  let n = 0;
  S.receiver({ sampleRate: SR, onFrame: () => n++ }).push(noise);
  assert.equal(n, 0);
  // trama tagliata a metà: niente
  const half = S.encode(a, { sampleRate: SR }).subarray(0, SR * 3);
  assert.equal(S.decode(half, SR), null);
});

const CONDS = {
  'pulito': {},
  'rumore (SNR banda larga ~0 dB)': { gain: 0.1, noise: 0.04 },
  'riverbero leggero (RT60 0,4 s)': { reverb: 0.4, wet: 0.35 },
  'riverbero medio (RT60 0,8 s)': { reverb: 0.8, wet: 0.5 },
  'deriva +0,5 %': { drift: 0.005 },
  'deriva −0,5 %': { drift: -0.005 },
  'volume basso (−30 dB) e fruscio': { gain: 0.03, noise: 0.004 },
  'tutto insieme +0,5 %': { drift: 0.005, reverb: 0.3, wet: 0.3, gain: 0.1, noise: 0.012, hum: 0.02 },
  'tutto insieme −0,5 %': { drift: -0.005, reverb: 0.4, wet: 0.35, gain: 0.05, noise: 0.01, hum: 0.03 },
};
for (const [name, c] of Object.entries(CONDS)) {
  test(`stanza simulata: ${name}`, (t) => {
    const N = 8;
    let ok = 0, ms = 0;
    for (let i = 0; i < N; i++) {
      const data = randBytes(40 + (i % 3) * 6, 100 + i);
      const pcm = room(S.encode(data, { sampleRate: i % 2 ? 44100 : SR }), i % 2 ? 44100 : SR, Object.assign({ seed: 50 + i }, c));
      const t0 = performance.now();
      if (same(S.decode(pcm, i % 2 ? 44100 : SR), data)) ok++;
      ms += performance.now() - t0;
    }
    t.diagnostic(`successo ${ok}/${N}, ${(ms / N).toFixed(0)} ms per ~7 s di audio`);
    assert.ok(ok / N >= 0.875, `successo ${ok}/${N}`);
    assert.ok(ms / N < 1500 * SLOW, 'decodifica più veloce del tempo reale');
  });
}
