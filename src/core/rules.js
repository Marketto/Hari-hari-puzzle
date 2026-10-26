/* Regole condivise per i giochi a mosse contate (Boba Sort, Lantern Glow).
 * HH.rules.extraMoves(min)            mosse in più concesse: 15% del minimo, almeno 2, al massimo 6
 * HH.rules.rateMoves(moves, min, max) fragoline: 3 col minimo esatto,
 *                                     2 se usi al massimo il 70% delle mosse in più concesse (per difetto), 1 oltre
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const extraMoves = (min) => Math.max(2, Math.min(6, Math.ceil(min * 0.15)));
  function rateMoves(moves, min, max) {
    const extra = (max == null ? min + extraMoves(min) : max) - min;
    const used = moves - min;
    return used <= 0 ? 3 : used <= Math.floor(extra * 0.7) ? 2 : 1;
  }
  HH.rules = { extraMoves, rateMoves };
})(typeof globalThis !== 'undefined' ? globalThis : window);
