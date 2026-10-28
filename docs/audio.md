# Audio, musica e voce di Hari

Tutto è sintetizzato in `src/core/audio.js` con WebAudio: niente file, niente rete, funziona offline e pesa pochi KB.
L'audio parte al primo tocco (regola dei browser) e si mette in pausa quando l'app va in background.
Pulsanti separati in alto per **musica** e **effetti**, ricordati tra le sessioni.

## Brani
| Brano | Carattere | Strumento solista | Tempo | Tonalità |
|---|---|---|---|---|
| menu | ninna nanna da carillon | carillon | 84 | Fa |
| hedgedoku | saltellante, giocoso | marimba | 104 | Do |
| boba | frizzante, con swing e bollicine | synth pizzicato | 112 | Sol |
| lantern | notte giapponese, pentatonica | koto + campanelle | 76 | Re |
| drive | giro in città con lo shuffle, basso che cammina | synth pizzicato + marimba | 128 | Mi |
| rally | galoppo energico nel bosco con le sincopi, basso sulle ottave | synth pizzicato + marimba | 138 | Re |

## Musica dinamica
Il gioco calcola `progress` (0 → 1) a ogni mossa e la musica aggiunge strati man mano:

| Progresso | Cosa entra |
|---|---|
| 0 | melodia + pad |
| ≥ 0,12 | basso |
| ≥ 0,38 | percussioni (stile del gioco) |
| ≥ 0,62 | arpeggio in semicrome + melodia raddoppiata all'ottava |
| ≥ 0,86 | campanelle e tempo +6%: manca pochissimo! |

Progresso per gioco: Hedgedoku = ricci giusti / ricci da trovare; Boba = strati uguali alla base dei bicchieri;
Lantern = lanterne accese in più rispetto all'inizio. In vittoria e a cuori finiti la musica si abbassa.

## Effetti
Intonati sulla scala del brano in corso: riccio messo (boing + marimba), segno ✕ (legnetto), errore (due note che scendono),
cuore perso (campanelle discendenti), bicchiere scelto (din), travaso (gorgoglio di bolle), bicchiere completato (arpeggio),
lanterna accesa (campanella che sale con il numero di lanterne accese), stelle, record, fanfara di vittoria, risatina di Hari,
clacson "bip bip" (`honk`, il traffico di Hari Taxi) e "bonk" di gomma (`boing`), bip del navigatore di Hari Rally
(`pace(dir, g)`: nell'orecchio del verso della curva, più gravi per le curve strette) e motore continuo
(`HH.audio.engine(on, rpm, grit)`: ronzio leggero che segue i giri, ghiaia quando si scivola; spento in pausa e all'uscita), e "ding-dong" di cabina (`chime`, segnale delle cinture di Hari Airlines).

## Messaggi di Hari
Fumetto con Hari animato in basso: all'inizio, a metà, quando manca poco, dopo un errore, dopo 30 s senza mosse,
toccandolo nella home e nella finestra di vittoria. 14 frasi × 43 lingue.

**Hari allenatore** (`coach: true` nella registrazione del gioco, es. Hari Sudoku): durante la partita il fumetto in basso
tace per `start`, `good`, `half`, `almost`, `oops`, `idle` (filtro in `say()` di `app.js`, solo senza testo esplicito) e parla
il Hari del gioco, accanto alla griglia, con pool di frasi proprie che riusano anche le chiavi `m_*` (vedi `docs/games/sudoku.md`).
Restano i messaggi con testo esplicito (aggiornamenti, condivisione) e la frase della finestra di vittoria.
