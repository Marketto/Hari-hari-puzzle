/* Regole condivise per i giochi a mosse contate (Boba Sort, Lantern Glow).
 * HH.rules.extraMoves(min)            mosse in più concesse: 15% del minimo, almeno 2, al massimo 6
 * HH.rules.rateMoves(moves, min, max) fragoline: 3 col minimo esatto,
 *                                     2 se usi al massimo il 70% delle mosse in più concesse (per difetto), 1 oltre
 * HH.rules.solvedOnResume(g, state)   la partita salvata è già vinta? (vittoria assegnata alla riapertura)
 * HH.rules.slotOf(g) · resumeSlot(id, get) · resumable(games, get, load)   quale partita riprendere (vedi sotto)
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const extraMoves = (min) => Math.max(2, Math.min(6, Math.ceil(min * 0.15)));
  function rateMoves(moves, min, max) {
    const extra = (max == null ? min + extraMoves(min) : max) - min;
    const used = moves - min;
    return used <= 0 ? 3 : used <= Math.floor(extra * 0.7) ? 2 : 1;
  }
  /* Partita salvata già risolta? (uscita durante il ritardo tra la soluzione e ctx.win: alla riapertura l'app assegna
   * la vittoria). Mai per i giochi endless. Controllo preciso g.solved(s) se il gioco lo dichiara; altrimenti
   * progress(s) >= 1 senza cuori finiti. Un errore nel controllo vale "no" (la partita si riapre come prima). */
  function solvedOnResume(g, state) {
    if (!g || !state || typeof state !== 'object' || g.endless) return false;
    try {
      if (typeof g.solved === 'function') return g.solved(state) === true;
      if (typeof g.progress !== 'function' || !(g.progress(state) >= 1)) return false;
      return !(g.lives && (state.mistakes || 0) >= g.lives);
    } catch (e) { return false; }
  }
  /* Ripresa delle partite (card «Riprendi», card dei giochi, avvio dell'app). Ogni gioco salva nel suo "posto":
   * l'id, oppure g.slot() se il gioco ne ha più d'uno (es. Hari Taxi: drive@ostia, una mappa reale); app.js ricorda in
   * slot:<id> il posto che si riaprirà. Funzioni pure: get(k) legge lo store, load(posto) dà il salvataggio o null.
   * slotOf(g)                    posto attuale del gioco (salvataggio e save-bak:<posto>)
   * resumeSlot(id, get)          posto da riprendere: quello ricordato in slot:<id>, altrimenti l'id
   * resumable(games, get, load)  [{ g, s }] dei giochi con una partita in sospeso, la più recente (s.ts) per prima */
  const slotOf = (g) => (g && typeof g.slot === 'function' ? g.slot() : g.id);
  const resumeSlot = (id, get) => get('slot:' + id) || id;
  const resumable = (games, get, load) => games.map((g) => ({ g, s: load(resumeSlot(g.id, get)) })).filter((x) => x.s).sort((a, b) => b.s.ts - a.s.ts);
  HH.rules = { extraMoves, rateMoves, solvedOnResume, slotOf, resumeSlot, resumable };

/* Manina dei tutorial (SVG): punta del dito in (x, y). cls = animazione (tut-tap, tut-go…), style per le variabili CSS. */
HH.tutHand = (x, y, cls = 'tut-tap', style = '') => `<g transform="translate(${x} ${y})"><g class="${cls}" style="${style}">
  <circle class="tut-ripple" cx="0.5" cy="0" r="7" fill="none" stroke="var(--accent)" stroke-width="2.4"/>
  <g transform="rotate(-18)"><rect x="-3.4" y="0" width="7.8" height="20" rx="3.9" fill="var(--card-solid)" stroke="var(--ink)" stroke-width="1.8"/>
  <path d="M-7 15h17a6 6 0 0 1 6 6v5a10 10 0 0 1-10 10h-3a10 10 0 0 1-10-10z" fill="var(--card-solid)" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M3 15v6M9 16v5" stroke="var(--ink)" stroke-width="1.4" stroke-linecap="round" opacity=".5"/></g></g></g>`;
})(typeof globalThis !== 'undefined' ? globalThis : window);
