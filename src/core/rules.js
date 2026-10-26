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

/* Manina dei tutorial (SVG): punta del dito in (x, y). cls = animazione (tut-tap, tut-go…), style per le variabili CSS. */
HH.tutHand = (x, y, cls = 'tut-tap', style = '') => `<g transform="translate(${x} ${y})"><g class="${cls}" style="${style}">
  <circle class="tut-ripple" cx="0.5" cy="0" r="7" fill="none" stroke="var(--accent)" stroke-width="2.4"/>
  <g transform="rotate(-18)"><rect x="-3.4" y="0" width="7.8" height="20" rx="3.9" fill="var(--card-solid)" stroke="var(--ink)" stroke-width="1.8"/>
  <path d="M-7 15h17a6 6 0 0 1 6 6v5a10 10 0 0 1-10 10h-3a10 10 0 0 1-10-10z" fill="var(--card-solid)" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M3 15v6M9 16v5" stroke="var(--ink)" stroke-width="1.4" stroke-linecap="round" opacity=".5"/></g></g></g>`;
})(typeof globalThis !== 'undefined' ? globalThis : window);
