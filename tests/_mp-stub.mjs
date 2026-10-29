// Stub di HH.mp per i test in Node (vm) + orologio virtuale per far correre il tempo a piacere.
import { load } from './_load.mjs';

export function loadStub() { return load('tests/_mp-stub.js'); }
// orologio virtuale: now() in ms, after(ms, fn) mette in coda, advance(ms) esegue in ordine i messaggi in scadenza
export function virtualClock() {
  let t = 0, seq = 0;
  const q = [];
  return {
    now: () => t,
    after(ms, fn) { q.push({ at: t + Math.max(0, ms), seq: seq++, fn }); },
    advance(ms) {
      const end = t + ms;
      for (;;) {
        let bi = -1;
        for (let i = 0; i < q.length; i++) if (q[i].at <= end && (bi < 0 || q[i].at < q[bi].at || (q[i].at === q[bi].at && q[i].seq < q[bi].seq))) bi = i;
        if (bi < 0) break;
        const it = q.splice(bi, 1)[0];
        t = Math.max(t, it.at);
        it.fn();
      }
      t = end;
    },
  };
}
