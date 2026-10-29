// Canale acustico simulato per i test del modem: deriva di clock, riverbero leggero, rumore, volume.
// Tutto deterministico dato un seme (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r) => { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// deriva: il trasmettitore ha il clock più veloce/lento di `drift` (es. 0.005 = +0,5 %): ricampionamento lineare
export function resample(x, drift) {
  const ratio = 1 + drift, n = Math.floor(x.length * ratio), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = i / ratio, j = Math.floor(p), f = p - j; out[i] = (x[j] || 0) * (1 - f) + (x[j + 1] || 0) * f; }
  return out;
}
// riverbero di Schroeder (4 comb + 2 allpass), RT60 ~ rt secondi, mescolato a `wet`
export function reverb(x, sr, rt = 0.3, wet = 0.25) {
  const combs = [0.0297, 0.0371, 0.0411, 0.0437].map((d) => Math.round(d * sr));
  const out = new Float32Array(x.length);
  for (const d of combs) {
    const g = Math.pow(10, -3 * d / sr / rt), buf = new Float32Array(d);
    let p = 0;
    for (let i = 0; i < x.length; i++) { const y = buf[p]; buf[p] = x[i] + y * g; p = (p + 1) % d; out[i] += y / 4; }
  }
  for (const [d, g] of [[Math.round(0.005 * sr), 0.7], [Math.round(0.0017 * sr), 0.7]]) {
    const buf = new Float32Array(d);
    let p = 0;
    for (let i = 0; i < out.length; i++) { const b = buf[p], y = -g * out[i] + b; buf[p] = out[i] + g * y; p = (p + 1) % d; out[i] = y; }
  }
  const res = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) res[i] = x[i] * (1 - wet) + out[i] * wet;
  return res;
}
// il microfono: silenzio prima e dopo, guadagno, rumore bianco + ronzio a bassa frequenza
export function room(pcm, sr, o = {}) {
  const r = rng(o.seed || 1);
  let x = o.drift ? resample(pcm, o.drift) : pcm;
  if (o.reverb) x = reverb(x, sr, o.reverb, o.wet || 0.25);
  const pre = Math.round(sr * (o.pre != null ? o.pre : 0.2 + r() * 0.6)), post = Math.round(sr * 0.4);
  const out = new Float32Array(pre + x.length + post), g = o.gain != null ? o.gain : 1, sn = o.noise || 0;
  for (let i = 0; i < out.length; i++) {
    const s = i >= pre && i < pre + x.length ? x[i - pre] * g : 0;
    out[i] = s + sn * gauss(r) + (o.hum || 0) * Math.sin(2 * Math.PI * 100 * i / sr);
  }
  return out;
}
