/* Generatore pseudo-casuale con seme (mulberry32): HH.rng(seed) -> () => [0,1).
 * Serve per test riproducibili e per il futuro "puzzle del giorno". */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
