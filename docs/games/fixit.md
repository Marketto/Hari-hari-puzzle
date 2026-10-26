# Fix-It House

Una tempesta ha messo sottosopra la casetta: ripara i guasti **nell'ordine giusto** e con **l'attrezzo giusto**.
Gioco di pianificazione (ordinamento topologico) per bambini e adulti, senza testo nella scena.

## Regole
- Tocca un guasto nella scena (si illumina), poi un attrezzo della cassetta. Si può anche scegliere prima l'attrezzo e poi il guasto.
- **Attrezzo giusto + prerequisiti già riparati** → il guasto si ripara (pop + scintille, il disegno cambia nello stato "a posto").
- **Ordine sbagliato** (attrezzo giusto, ma manca un prerequisito) → perdi un cuore. Per ~1,5 s i guasti che bloccano
  hanno un anello rosso pulsante e una freccia tratteggiata li collega al guasto scelto. La dipendenza resta scoperta:
  freccina punteggiata + catenella sul guasto finché non viene riparato.
- **Attrezzo sbagliato** → scossa e suono "no", nessun cuore (conta come "slip" per le fragoline).
  L'attrezzo si controlla per primo: con attrezzo sbagliato e ordine sbagliato vale "attrezzo sbagliato".
- 3 cuori: a 0 l'app mostra "cuori finiti" e il livello ricomincia (stesso puzzle, dipendenze scoperte azzerate).
- Vittoria quando tutti i guasti sono riparati (arcobaleno, sole che salta).
- **Annulla** toglie solo l'ultima riparazione; i cuori persi non tornano.
- Fragoline: 3 senza errori né slip; 2 se errori + slip ≤ 2; altrimenti 1. Tempo di riferimento: 15 s per guasto.

## Catalogo (`CATALOG` in `src/games/fixit-logic.js`)
| Guasto | Attrezzo | Prerequisiti | Idea |
|---|---|---|---|
| `ladder` scala rotta | martello `hammer` | — | |
| `roof` tegole volate | tegola `tile` | ladder | serve la scala per salire |
| `chimney` camino con fuliggine | scovolo `brush` | ladder | |
| `branch` ramo sulla finestra | sega `saw` | — | il ramo segato diventa legna |
| `fire` camino spento | fiammiferi `matches` | chimney, branch | canna pulita + legna nel focolare |
| `glass` vetro rotto | lastra `pane` | branch | prima togli il ramo |
| `curtains` tende cadute | tenda `curtain` | glass | |
| `crack` crepa nel muro | cazzuola `trowel` | — | |
| `paint` vernice scrostata | rullo `roller` | crack | prima stucca, poi pittura |
| `valve` acqua aperta | volantino `valve` | — | |
| `pipe` tubo che perde | chiave inglese `wrench` | valve | chiudi l'acqua prima |
| `puddle` pozzanghera | mocio `mop` | pipe | asciuga quando non gocciola più |
| `fuse` corrente accesa | interruttore `fuse` | — | |
| `wires` fili penzolanti | cacciavite `screwdriver` | fuse | stacca la corrente prima |
| `lamp` lampada rotta | lampadina `bulb` | wires, puddle | fili a posto e pavimento asciutto |
| `leaves` mucchio di foglie | rastrello `rake` | — | |
| `flowers` aiuola vuota | fiori `seeds` | leaves | |

Un attrezzo diverso per ogni guasto. Gli indizi sono visivi: l'acqua scorre nel tubo finché la valvola è aperta,
la perdita smette di spruzzare quando l'acqua è chiusa, i fili fanno scintille finché c'è corrente, i ceppi compaiono
nel camino quando il ramo è stato segato, la leva del quadro torna su quando la lampada si accende.

## Difficoltà (`sizeFor`, `shapeFor`)
| Livello | Guasti | Forma |
|---|---|---|
| 1–2 | 3 | un solo gruppo collegato (catena o "a V") |
| 3 | 4 | niente guasti isolati |
| 4–5 | 5 | almeno 2 catene in parallelo |
| 6 | 6 | catena più lunga ≥ 3 |
| 7–9 | 6–7 | + almeno un guasto con 2 prerequisiti (`fire` o `lamp`) |
| 10–13 | 8–9 | idem |
| 14+ | 10 | idem |

Attrezzi "esca" nella cassetta: 1 + ⌊livello/4⌋, al massimo 3.

## Generatore
1. Aggiunge a caso la **chiusura** di un guasto (lui + tutti i prerequisiti) finché si arriva alla taglia, preferendo chiusure
   più grandi (catene più profonde). Il sotto-grafo è quindi sempre chiuso verso il basso e aciclico → sempre risolvibile.
2. Rifiuta i tentativi che non rispettano la forma del livello (gruppi, isolati, profondità, guasto doppio); max 400 tentativi,
   poi tiene il più vicino (nei test non succede mai).
3. Cassetta = attrezzi dei guasti + esche, mescolati con `rnd`.
Deterministico dato `rnd`; ~0,1 ms per livello.

## Test (`tests/fixit.test.mjs`)
- Catalogo: DAG, attrezzi unici, prerequisiti esistenti.
- Livelli 1–20 × 30 semi: taglia, guasti del catalogo con gli stessi prerequisiti, tutti i prerequisiti inclusi, attrezzi in cassetta,
  nessun ciclo, **risolvibile per un oracolo indipendente** (ricerca esaustiva sugli insiemi riparati), ordine del solver accettato
  dall'oracolo, forma dei livelli 1–2 e ≥ 7.
- Difficoltà crescente (taglia monotona con ≥ 4 gradini, archi medi crescenti, più catene ai livelli alti).
- `apply`: `order` con i blocchi diretti esatti e dipendenze scoperte senza duplicati; `tool` senza cuori; `fixed` / `already`.
- `undo`, `rate`, `progress`, `validate` (salvataggi manomessi rifiutati). Generazione < 10 ms medi.

## Grafica (v0.6.1)
Scena a strati con ombre "cel" e riflessi. Il meteo segue il progresso: `--storm` (frazione di guasti rimasti) regola l'opacità di nuvoloni,
lampo e pioggia, che si diradano a ogni riparazione fino all'arcobaleno. Hari col caschetto dietro la cassetta degli attrezzi salta a ogni
riparazione (`.yay`) e trema all'errore (`.oops`). Colori solo tramite token `--fi-*`.

## Scenari ed episodi (v0.7)
Ogni livello è un **episodio** in un ambiente diverso (`HH.fixit.sceneFor(level)`, a rotazione):
1 casetta · 2 cucina · 3 cameretta · 4 bagno · 5 giardino con serra · 6 di nuovo la casetta…
Ogni scenario ha il suo catalogo di guasti (DAG con un attrezzo diverso per guasto) in `SCENES` di `fixit-logic.js`;
lo stato salvato ha `scene` (i salvataggi vecchi senza scenario valgono come casetta).

File: `fixit-kit.js` (helper di disegno, icone attrezzi, `addTool`), `fixit-scene-<id>.js` + `.css` (uno per scenario, contratto
nel commento di `fixit-scene-house.js`), `fixit-ui.js` (interfaccia comune).

A inizio livello compare il **cartellone dell'episodio** ("Episodio N" + nome dello scenario, `episode` / `fis_<id>`); in alto a sinistra
resta l'etichetta "Ep. N" (`epTag`).

## Stile shoujo anni '90 (v0.7)
Scelto tra le proposte in `design/proposte-anime.html` (n. 1): contorni prugna, palette rosa/lilla/menta, retino a puntini nel cielo,
bolle e stelline che fluttuano (`.fi-deco`), cornice di pizzo (`.fi-scene::after`), scintille e cuoricini a ogni riparazione.
Negli interni il temporale è fuori dalla finestra e una penombra (`.fi-gloom`) si schiarisce col progresso.
