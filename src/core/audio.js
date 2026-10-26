/* Audio di Hari Hari Puzzle — tutto sintetizzato con WebAudio: nessun file, funziona offline.
 *
 * HH.audio.unlock()            al primo tocco (i browser bloccano l'audio prima di un gesto)
 * HH.music.play(track, p)      'menu' | 'hedgedoku' | 'boba' | 'lantern'
 * HH.music.setIntensity(p)     0..1 = quanto manca alla soluzione; gli strumenti entrano a strati:
 *                                 0    melodia + pad
 *                                 .12+ basso          .38+ percussioni
 *                                 .62+ arpeggio e melodia all'ottava
 *                                 .86+ campanelle e tempo +6% (manca pochissimo!)
 * HH.music.duck(on) · setOn(on) · isOn()
 * HH.audio.sfx.*               effetti intonati sulla scala del brano in corso (pick/set = vetro sollevato/appoggiato)
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  let ac = null, sfxBus, musicBus, noise;
  let sfxOn = true, musicOn = true, ducked = false, unlocked = false;
  const MUSIC_VOL = 0.42;

  function init() {
    if (ac) return ac;
    const AC = G.AudioContext || G.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { return null; }
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    const master = ac.createGain(); master.gain.value = 0.9;
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0;
    musicBus = ac.createGain(); musicBus.gain.value = 0;
    sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }
  function busVolume(fast) {
    if (!ac) return;
    const v = musicOn ? (ducked ? MUSIC_VOL * 0.25 : MUSIC_VOL) : 0;
    musicBus.gain.cancelScheduledValues(ac.currentTime);
    musicBus.gain.setTargetAtTime(v, ac.currentTime, fast ? 0.05 : 0.35);
  }
  function unlock() {
    if (!init()) return;
    if (ac.state === 'suspended') ac.resume();
    if (!unlocked) { unlocked = true; M.next = ac.currentTime + 0.15; busVolume(); }
    if (!M.timer) M.timer = setInterval(tick, 50);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!ac || !unlocked) return;
      if (document.hidden) ac.suspend(); else { ac.resume(); M.next = ac.currentTime + 0.1; }
    });
  }

  /* ---------- strumenti ---------- */
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function env(dest, t, a, peak, end) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    g.connect(dest);
    return g;
  }
  function osc(dest, type, f, t, end, detune = 0, f2 = 0, slide = 0) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + slide);
    if (detune) o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(end + 0.05);
  }
  function lowpass(dest, f, q = 0.7) { const b = ac.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = q; b.connect(dest); return b; }
  function noiseHit(dest, t, dur, v, type, f, q = 1) {
    const s = ac.createBufferSource(); s.buffer = noise;
    const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q;
    s.connect(b); b.connect(env(dest, t, 0.002, v, t + dur)); s.start(t); s.stop(t + dur + 0.05);
  }

  const V = {
    musicbox(d, f, t, dur, v) {
      const e = t + 1.3 + dur;
      osc(env(d, t, 0.004, v, e), 'sine', f, t, e);
      osc(env(d, t, 0.003, v * 0.3, t + 0.35), 'sine', f * 2, t, t + 0.35);
      osc(env(d, t, 0.002, v * 0.1, t + 0.12), 'sine', f * 5.4, t, t + 0.12);
    },
    marimba(d, f, t, dur, v) {
      const e = t + 0.45 + dur * 0.3;
      osc(env(d, t, 0.004, v, e), 'sine', f, t, e);
      osc(env(d, t, 0.002, v * 0.3, t + 0.07), 'sine', f * 3.9, t, t + 0.07);
      osc(env(d, t, 0.003, v * 0.22, t + 0.22), 'triangle', f * 2, t, t + 0.22);
    },
    pluck(d, f, t, dur, v) {
      const e = t + 0.32 + dur * 0.5;
      const b = ac.createBiquadFilter(); b.type = 'lowpass'; b.Q.value = 5;
      b.frequency.setValueAtTime(3400, t); b.frequency.exponentialRampToValueAtTime(520, t + 0.28);
      b.connect(env(d, t, 0.004, v, e));
      osc(b, 'square', f, t, e);
      osc(b, 'triangle', f * 2, t, e, 6);
    },
    koto(d, f, t, dur, v) {
      const e = t + 1.2 + dur * 0.4;
      const b = lowpass(env(d, t, 0.003, v, e), 2400);
      osc(b, 'triangle', f * 0.985, t, e, 0, f, 0.05);
      osc(env(b, t, 0.002, 0.6, t + 0.12), 'sawtooth', f, t, t + 0.12);
    },
    bell(d, f, t, dur, v) {
      const e = t + 2;
      osc(env(d, t, 0.003, v, e), 'sine', f, t, e);
      osc(env(d, t, 0.002, v * 0.4, t + 0.9), 'sine', f * 2.76, t, t + 0.9);
      osc(env(d, t, 0.002, v * 0.16, t + 0.3), 'sine', f * 5.4, t, t + 0.3);
    },
    pad(d, f, t, dur, v) {
      const e = t + dur + 0.9;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.35);
      g.gain.setValueAtTime(v, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, e);
      g.connect(d);
      const b = lowpass(g, 1100);
      osc(b, 'triangle', f, t, e, -7);
      osc(b, 'triangle', f, t, e, 7);
    },
    bass(d, f, t, dur, v) {
      const e = t + Math.min(0.6, dur * 0.9) + 0.08;
      const g = env(d, t, 0.006, v, e);
      osc(lowpass(g, 700), 'triangle', f, t, e);
      osc(g, 'sine', f, t, e);
    },
    kick(d, t, v) { osc(env(d, t, 0.002, v, t + 0.22), 'sine', 150, t, t + 0.22, 0, 45, 0.12); },
    hat(d, t, v) { noiseHit(d, t, 0.045, v, 'highpass', 7500); },
    shaker(d, t, v) { noiseHit(d, t, 0.08, v, 'bandpass', 5200, 1.2); },
    wood(d, t, v, f = 900) {
      osc(env(d, t, 0.001, v, t + 0.06), 'triangle', f, t, t + 0.06);
      osc(env(d, t, 0.001, v * 0.5, t + 0.03), 'sine', f * 2.3, t, t + 0.03);
    },
    bubble(d, t, v) {
      const f = 380 + Math.random() * 220;
      osc(env(d, t, 0.004, v, t + 0.12), 'sine', f, t, t + 0.12, 0, f * 3.2, 0.1);
    },
  };

  /* ---------- brani ----------
   * mel: 8 battute × 8 crome; numeri = gradi della scala maggiore (1 = tonica, 8 = ottava), "." pausa, "-" tenuta
   * chords: grado della triade per battuta · bass: R tonica, F quinta, O ottava */
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const TRACKS = {
    menu: {
      bpm: 84, root: 65, lead: 'musicbox', arp: 'musicbox', swing: 0, perc: 'lullaby',
      chords: [1, 6, 4, 5, 1, 6, 4, 1], bass: 'R . . . F . . .',
      mel: ['5 . 6 5 3 . 1 .', '2 . 3 4 3 . 1 .', '4 . 5 6 5 . 4 3', '2 . 3 2 5 - - .',
        '8 . 7 6 5 . 3 .', '6 . 5 4 3 . 1 .', '4 3 4 5 6 . 5 4', '3 . 2 . 1 - - .'],
    },
    hedgedoku: {
      bpm: 104, root: 60, lead: 'marimba', arp: 'marimba', swing: 0, perc: 'pop',
      chords: [1, 2, 1, 5, 1, 4, 5, 1], bass: 'R . F . R . F O',
      mel: ['1 3 5 3 6 5 3 .', '2 4 6 4 5 . 3 .', '1 3 5 8 7 5 6 .', '5 4 3 2 1 . . .',
        '3 5 8 5 9 8 6 .', '4 6 8 6 7 . 5 .', '6 5 4 3 4 5 6 7', '8 . 5 . 8 - - .'],
    },
    boba: {
      bpm: 112, root: 67, lead: 'pluck', arp: 'pluck', swing: 0.2, perc: 'bubbly',
      chords: [1, 4, 2, 1, 1, 4, 5, 1], bass: 'R . O . F . O .',
      mel: ['5 . 5 6 5 . 3 .', '6 . 6 8 6 . 5 .', '4 . 4 5 4 . 2 .', '3 2 1 2 3 . 5 .',
        '5 . 5 6 5 . 8 .', '9 . 8 6 5 . 3 .', '4 . 6 . 5 . 2 .', '1 . 3 5 8 . . .'],
    },
    lantern: {
      bpm: 76, root: 62, lead: 'koto', arp: 'koto', swing: 0, perc: 'night',
      chords: [6, 4, 6, 1, 1, 6, 5, 1], bass: 'R . . F . . R .',
      mel: ['6 . 5 . 3 . 5 6', '8 - 6 . 5 - - .', '3 . 5 . 6 5 3 2', '1 - - . 2 3 - .',
        '5 . 6 . 8 . 9 8', '6 - 5 . 3 - - .', '2 . 3 5 6 . 5 3', '2 - 1 - - - - .'],
    },
  };
  Object.values(TRACKS).forEach((tr) => {
    tr.melT = tr.mel.map((b) => b.split(' '));
    tr.bassT = tr.bass.split(' ');
  });
  const deg = (tr, d) => { const i = d - 1, o = Math.floor(i / 7); return tr.root + o * 12 + MAJOR[((i % 7) + 7) % 7]; };
  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

  /* ---------- sequencer ---------- */
  const M = { tr: TRACKS.menu, name: 'menu', step: 0, next: 0, level: 0.45, target: 0.45, bpmMul: 1, timer: 0 };
  const stepDur = () => 60 / (M.tr.bpm * M.bpmMul) / 2;

  function perc(style, d, pos, t, l, sd) {
    if (style === 'lullaby') {
      if (pos % 2 === 0) V.wood(d, t, 0.045 * l, 1500);
      else V.shaker(d, t, 0.022 * l);
    } else if (style === 'pop') {
      if (pos === 0 || pos === 4) V.kick(d, t, 0.28 * l);
      if (pos === 2 || pos === 6) V.wood(d, t, 0.1 * l, 700);
      V.hat(d, t, (pos % 2 ? 0.025 : 0.045) * l);
    } else if (style === 'bubbly') {
      if (pos === 0 || pos === 4) V.kick(d, t, 0.26 * l);
      V.shaker(d, t, 0.035 * l);
      if (pos === 3 || (pos === 7 && Math.random() < 0.7)) V.bubble(d, t, 0.07 * l);
    } else if (style === 'night') {
      if (pos === 0) V.kick(d, t, 0.15 * l);
      if (pos === 4) V.wood(d, t, 0.07 * l, 520);
      if (pos % 2 === 0) V.wood(d, t + sd * 0.5, 0.022 * l, 2100);
    }
  }

  function playStep(s, t) {
    const tr = M.tr, bar = (s >> 3) % 8, pos = s & 7, sd = stepDur(), I = M.level;
    const L = [1, smooth(0.12, 0.3, I), smooth(0.38, 0.55, I), smooth(0.62, 0.78, I), smooth(0.86, 0.96, I)];
    if (pos & 1) t += tr.swing * sd;
    const d = musicBus;
    const row = tr.melT[bar], tok = row[pos];
    if (tok !== '.' && tok !== '-') {
      let len = 1;
      while (pos + len < 8 && row[pos + len] === '-') len++;
      const f = mtof(deg(tr, +tok));
      V[tr.lead](d, f, t, len * sd, 0.17);
      if (L[3] > 0.02) V[tr.lead](d, f * 2, t + 0.012, len * sd, 0.055 * L[3]);
    }
    const c = tr.chords[bar];
    if (pos === 0) [c, c + 2, c + 4].forEach((x) => V.pad(d, mtof(deg(tr, x) - 12), t, 8 * sd, 0.028));
    if (L[1] > 0.02) {
      const b = tr.bassT[pos];
      if (b !== '.') V.bass(d, mtof((b === 'F' ? deg(tr, c + 4) : deg(tr, c)) - 24 + (b === 'O' ? 12 : 0)), t, 2 * sd, 0.2 * L[1]);
    }
    if (L[2] > 0.02) perc(tr.perc, d, pos, t, L[2], sd);
    if (L[3] > 0.02) {
      const pat = [0, 1, 2, 1, 2, 3, 2, 1];
      for (let k = 0; k < 2; k++) {
        const i = pat[(pos * 2 + k) % 8];
        V[tr.arp](d, mtof(deg(tr, c + i * 2) + 12), t + (k * sd) / 2, sd / 2, 0.045 * L[3]);
      }
    }
    if (L[4] > 0.02 && (pos === 0 || pos === 4)) V.bell(d, mtof(deg(tr, c + 4) + 24), t, sd, 0.05 * L[4]);
  }

  function tick() {
    if (!ac || !musicOn || ac.state !== 'running') return;
    if (M.next < ac.currentTime) M.next = ac.currentTime + 0.05;
    while (M.next < ac.currentTime + 0.2) {
      M.level += (M.target - M.level) * 0.1;
      M.bpmMul += (1 + 0.06 * smooth(0.86, 0.96, M.level) - M.bpmMul) * 0.08;
      playStep(M.step, M.next);
      M.next += stepDur();
      M.step = (M.step + 1) % 64;
    }
  }

  const music = {
    play(name, p) {
      const tr = TRACKS[name];
      if (!tr) return;
      if (p != null) M.target = Math.max(0, Math.min(1, p));
      if (M.name === name) return;
      M.name = name; M.tr = tr; M.step = 0; M.level = M.target; M.bpmMul = 1;
      if (ac && unlocked) {
        M.next = ac.currentTime + 0.3;
        musicBus.gain.cancelScheduledValues(ac.currentTime);
        musicBus.gain.setValueAtTime(musicBus.gain.value, ac.currentTime);
        musicBus.gain.linearRampToValueAtTime(0.02, ac.currentTime + 0.2);
        busVolume();
      }
    },
    setIntensity(p) { M.target = Math.max(0, Math.min(1, p)); },
    intensity: () => M.level,
    duck(on) { ducked = on; busVolume(); },
    setOn(on) { musicOn = on; if (ac) { M.next = ac.currentTime + 0.1; busVolume(true); } },
    isOn: () => musicOn,
    current: () => M.name,
    TRACKS, deg,
  };

  /* ---------- effetti ---------- */
  const S = (fn) => (...a) => { if (!sfxOn || !init()) return; fn(ac.currentTime + 0.01, ...a); };
  const sc = (d) => mtof(deg(M.tr, d) + 12);
  const sfx = {
    tap: S((t) => osc(env(sfxBus, t, 0.003, 0.12, t + 0.09), 'sine', 620, t, t + 0.09, 0, 940, 0.06)),
    mark: S((t) => V.wood(sfxBus, t, 0.14, 1400)),
    place: S((t) => {
      osc(env(sfxBus, t, 0.004, 0.14, t + 0.16), 'sine', 330, t, t + 0.16, 0, 760, 0.11);
      V.marimba(sfxBus, sc(5), t + 0.06, 0.2, 0.13);
      V.marimba(sfxBus, sc(8), t + 0.13, 0.2, 0.1);
    }),
    bad: S((t) => {
      V.marimba(sfxBus, mtof(64), t, 0.1, 0.14);
      V.marimba(sfxBus, mtof(60), t + 0.14, 0.1, 0.14);
      osc(env(sfxBus, t + 0.28, 0.01, 0.06, t + 0.6), 'triangle', 330, t + 0.28, t + 0.6, 0, 220, 0.3);
    }),
    heart: S((t) => { [76, 72, 67].forEach((m, i) => V.bell(sfxBus, mtof(m), t + i * 0.12, 0.1, 0.07)); }),
    lose: S((t) => { [67, 65, 64, 60].forEach((m, i) => V.marimba(sfxBus, mtof(m), t + i * 0.22, 0.2, 0.14)); }),
    // bicchiere sollevato: fruscio d'aria che sale + leggero "tink" di vetro (niente campanella)
    pick: S((t) => {
      const s0 = ac.createBufferSource(); s0.buffer = noise;
      const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = 1.4;
      b.frequency.setValueAtTime(700, t); b.frequency.exponentialRampToValueAtTime(2600, t + 0.16);
      s0.connect(b); b.connect(env(sfxBus, t, 0.03, 0.05, t + 0.18)); s0.start(t); s0.stop(t + 0.2);
      osc(env(sfxBus, t + 0.01, 0.002, 0.03, t + 0.09), 'sine', 2350, t + 0.01, t + 0.09);
      osc(env(sfxBus, t + 0.01, 0.001, 0.012, t + 0.04), 'sine', 5900, t + 0.01, t + 0.04);
    }),
    // bicchiere riappoggiato: "tok" morbido sul tavolo + vetro appena accennato
    set: S((t) => {
      osc(env(sfxBus, t, 0.002, 0.09, t + 0.08), 'sine', 210, t, t + 0.08, 0, 140, 0.06);
      noiseHit(sfxBus, t, 0.03, 0.03, 'lowpass', 900);
      osc(env(sfxBus, t + 0.005, 0.001, 0.015, t + 0.05), 'sine', 2100, t + 0.005, t + 0.05);
    }),
    pour: S((t, ms = 500) => {
      const n = Math.max(4, Math.round(ms / 80));
      for (let i = 0; i < n; i++) V.bubble(sfxBus, t + (i * ms) / n / 1000, 0.08);
      noiseHit(sfxBus, t, ms / 1000, 0.025, 'bandpass', 1800, 0.8);
    }),
    cupDone: S((t) => [1, 3, 5, 8].forEach((d, i) => V.bell(sfxBus, sc(d), t + i * 0.07, 0.1, 0.08))),
    lightOn: S((t, i = 0) => V.bell(sfxBus, sc([1, 2, 3, 5, 6, 8, 9, 10][i % 8]), t, 0.2, 0.09)),
    lightOff: S((t) => V.koto(sfxBus, sc(1) / 2, t, 0.2, 0.1)),
    star: S((t, i = 0) => { V.bell(sfxBus, sc(5 + i * 2), t, 0.1, 0.1); V.bell(sfxBus, sc(8 + i * 2), t + 0.07, 0.1, 0.07); }),
    giggle: S((t) => [9, 10, 9, 11, 12].forEach((d, i) => {
      const s0 = t + i * 0.075, f = sc(d);
      osc(env(sfxBus, s0, 0.004, 0.07, s0 + 0.08), 'triangle', f, s0, s0 + 0.08, 0, f * 1.12, 0.06);
    })),
    blip: S((t) => { V.marimba(sfxBus, sc(5), t, 0.05, 0.06); V.marimba(sfxBus, sc(8), t + 0.07, 0.05, 0.06); }),
    milestone: S((t) => [1, 3, 5].forEach((d, i) => V.bell(sfxBus, sc(d + 7), t + i * 0.09, 0.1, 0.07))),
    open: S((t) => {
      const s = ac.createBufferSource(); s.buffer = noise;
      const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = 2;
      b.frequency.setValueAtTime(400, t); b.frequency.exponentialRampToValueAtTime(3500, t + 0.3);
      s.connect(b); b.connect(env(sfxBus, t, 0.08, 0.07, t + 0.35)); s.start(t); s.stop(t + 0.4);
    }),
    win: S((t) => {
      [1, 3, 5, 8].forEach((d, i) => V.marimba(sfxBus, sc(d), t + i * 0.1, 0.1, 0.16));
      [1, 3, 5, 8].forEach((d) => V.bell(sfxBus, sc(d), t + 0.45, 0.5, 0.045));
      V.bell(sfxBus, sc(12), t + 0.55, 0.5, 0.08);
    }),
    record: S((t) => [5, 6, 8, 10, 12].forEach((d, i) => V.bell(sfxBus, sc(d), t + i * 0.08, 0.1, 0.08))),
    setMuted(m) { sfxOn = !m; if (sfxBus) sfxBus.gain.value = sfxOn ? 1 : 0; },
    isMuted: () => !sfxOn,
  };

  HH.audio = { unlock, sfx, ready: () => !!ac && ac.state === 'running' };
  HH.music = music;
})(typeof globalThis !== 'undefined' ? globalThis : window);
