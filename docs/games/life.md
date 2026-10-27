# Hari Home

Simulazione di vita isometrica in stile Sims, **senza livelli né fine e senza violenza**: Hari, a 20 anni, si trasferisce
in un **monolocale decadente** con 300 ghiande. Lo ripara, lo arreda, avvia un'attività, fa la spesa, va dal dottore,
fa sport e invita gli amici. Lo scopo è la crescita: Hari invecchia (giovane → adulto → maturo → nonno), raggiunge
traguardi, va in pensione e, se si vuole, lascia la casa a un nipotino (nuova generazione). Non si muore mai.

- id `life`, brand **Hari Home** (non tradotto), regole `r12`, brano `life`, tinta `--tint-life`, token `--lh-*`, `endless: true`.
- File (ordine di caricamento nel catalogo): `life.css`, `life-data.js` (catalogo e numeri), `life-logic.js` (simulazione pura),
  `life-art.js` (SVG: icone, Hari alle 4 età, amici, mappa, card), `life-draw.js` (canvas isometrico), `life-ui.js` (interfaccia).
- Test: `tests/life.test.mjs` (+ bot in `tests/_life-bot.mjs`), blocco in `tools/selftest.mjs`.

## Tempo
| | |
|---|---|
| Velocità | 4 minuti di gioco al secondo a ×1 (×2, ×3 dai pulsanti); **dormendo il tempo va ×6** |
| Un giorno | 16 h sveglio ≈ 4 min reali + 8 h di sonno ≈ 20 s → **≈ 4,3 min reali a ×1** |
| Stagioni | 2 giorni ciascuna (primavera, estate, autunno, inverno: si vedono dalla finestra e dagli alberi della mappa) |
| Un anno | **8 giorni di gioco** (≈ 35 min reali a ×1) |
| Età | 20 → 35 adulto (giorno 120, ≈ 9 h) → 50 maturo (giorno 240, ≈ 17 h) → 65 nonno e pensione (giorno 360, ≈ 26 h a ×1, ≈ 9 h a ×3) |

Il tempo scorre solo mentre si gioca: si ferma in "Costruisci", con l'app nascosta (pausa automatica), nel tutorial e
con la conferma "Ricomincia". Ripresa da salvataggio = in pausa, tocca per continuare.

## Bisogni (0..1, sempre visibili)
Umore, salute, energia, pancia, pulizia, svago, amici; lo **stress** è al contrario (0 = sereno, la barra mostra 1 − stress).
Consumo di base all'ora: pancia −0,05, energia −0,035, pulizia −0,035, svago −0,03, amici −0,02.

- **Stress** all'ora: +0,006 (vita di città; +0,002 in pensione), +0,014 per ogni bisogno sotto 0,2, −0,012 se i bisogni
  sono in media sopra 0,55, +0,0025 per ogni guasto in casa, **−0,03 × bellezza della casa**, lavoro +0,06·(1,3 − 0,6·umore),
  debiti +0,01, malanni +0,01. Sport (−0,2/h in casa, −0,2 al parco, −0,26 in palestra), relax, lettura, bagno, visite e
  sonno lo abbassano.
- **Salute** insegue un obiettivo: massimo dell'età − 0,45·fame − 0,4·sonno − 0,15·sporco − stress oltre 0,6 − muffa/perdita;
  scende di 0,022/h (più in fretta da anziani), sale di 0,014/h; lo sport aggiunge +0,03..0,05/h.
  Massimo dell'età: 1 fino a 50 anni, poi −0,012 l'anno (min 0,68), +0,08 per 10 giorni dopo un check-up.
- **Umore** insegue: 0,1 + 0,8·(media pesata dei bisogni) + **0,24·bellezza** (0,6 fuori casa) − 0,38·stress − malanni − debiti
  (+0,05 in pensione), al massimo ±0,3 all'ora; cibo buono e visite danno piccoli sorrisi immediati.
- Bisogno sotto 0,18 (o stress sopra 0,82): Hari lo dice in un fumetto ("Mi brontola il pancino…"), una volta finché non si riprende.
- **Rete di sicurezza gentile**: sfinito (energia < 0,04) si addormenta da solo; salute < 0,06 → "si sente poco bene" e
  il **dottore se ne prende cura** (6 h, al massimo 40 ghiande, salute ≥ 0,5); senza soldi e col frigo vuoto arriva un
  **pacco di cibo da casa**. I soldi non vanno mai sotto zero: le bollette non pagate diventano un debito che si ripaga
  coi guadagni successivi.

## Comandi (come dire a Hari cosa fare)
- **Indicatori in alto = azioni rapide**: luna → dorme (letto migliore, o pisolino), pancia → cucina/mangia (frigo vuoto:
  lo dice e apre il quartiere per la spesa), goccia → vasca o doccia (senza: apre Costruisci), stella → TV/libri/acquario/
  divano (senza: parco), amici → invita (o telefona se non ha amici), cuore → dottore, nuvola (stress) → allenamento/vasca/
  divano/parco, faccina (umore) → il bisogno più urgente. `HH.life.quick(s, need)` = `plan()` + `order()`.
- **Menu radiale su Hari**: sempre dormire, mangiare, lavarsi, svago, amici, lavoro (banchetto o negozio) e città, più
  "basta" se sta facendo qualcosa; ogni voce usa l'oggetto migliore (`plan`). Su un **mobile** le sue azioni, su un
  **guasto** la riparazione; il pavimento lo fa camminare (e svuota la coda).
- **Coda delle azioni** (stile The Sims, in basso a sinistra): l'azione in corso con l'anello del tempo e quelle in attesa
  (max `QMAX` = 4); tocca per annullare (la successiva parte subito). Un comando mentre Hari fa qualcosa *di sua
  iniziativa* (badge verde con la fogliolina) la interrompe; mentre esegue un comando del giocatore va in coda. Se una cosa
  in coda non si può più fare (soldi, oggetto venduto) viene saltata con un avviso (`qfail`).
- **Bisogno critico** (< 0,18, stress > 0,82): l'indicatore lampeggia di rosso e, se Hari è libero, sopra di lui pulsa un
  fumetto con l'icona del bisogno; toccarlo = azione rapida.
- Primo avvio: un fumetto sotto gli indicatori spiega che si toccano (`s.tips.needs`); tutorial `tu_life_1/2`.

## Libero arbitrio (`think`, in `life-logic.js`)
Quando non ci sono comandi né attività, non è fuori casa e non è appena stato fermato dal giocatore (`calm`: 40 min di
gioco), Hari guarda i bisogni sotto soglia (`D.FREE`): energia 0,25 (**di notte, 22–5, 0,85**: va a letto la sera),
pancia 0,35, pulizia 0,3, svago 0,28, amici 0,25, stress > 0,7. Urgenza = (soglia − valore)/soglia + spinta (notte +0,6
al sonno, pancia +0,1) + un pizzico di casualità (0..0,15, dal generatore salvato: resta deterministico). Prova le
scelte in ordine con la casa (`plan(s, k, true)`: niente città né spese) e parte con la prima possibile (`act.auto`).
**Isteresi**: le attività vanno fino in fondo e riportano il bisogno ben sopra la soglia, quindi niente oscillazioni; se non
c'è niente da fare riprova dopo 30 min. Frigo vuoto / niente doccia né vasca → un solo fumetto (`hint`) e il pulsante
Quartiere/Costruisci pulsa, finché il problema non si risolve. Si spegne da "Vita" (Libero arbitrio, `s.free`).
Test: da solo per 4 giorni con frigo pieno e letto energia/pancia/pulizia restano > 0,15, dorme la sera, mangia, si lava,
≤ 14 scelte al giorno e non spende ghiande; col frigo vuoto avvisa una volta.

## Attività
Ogni attività ha la sua icona in un fumetto sopra Hari con l'anello del tempo che manca (e nella coda).

| Attività | Dove | Durata | Effetti principali |
|---|---|---|---|
| Dormi | letto (qualità 0,72 → 1,15) | fino a energia piena (max 11 h) | energia +0,15·qualità/h, stress −0,035/h; perdita e finestra rotta disturbano |
| Spuntino / Cucina | frigo / fornelli o forno | 30 / 50 min | pancia + porzione (semplice 0,42, gustoso 0,55, gourmet 0,68) + fornelli; con un tavolo +0,06 |
| Doccia / Vasca | doccia / vasca | 20 / 45 min | pulizia; la vasca rilassa |
| Relax, TV, Leggi, Acquario | divano, TV, libreria, acquario | 40–60 min | svago, stress giù (qualità dell'oggetto) |
| Allenati | tappetino o cyclette | 60 min | stress −0,2/h, salute +, energia e pulizia − |
| Lavora | postazione dell'attività (banchetto) o negozio in città | 3 h | guadagno, bravura, fama; stanca e stressa |
| Telefona / Invita | ovunque / casa | 15 min / 2 h | amici +; la visita conta di più in una **casa bella** (×0,6..1,2) e usa uno spuntino dal frigo |
| Ripara | guasto | 20–70 min | costa ghiande, toglie il guasto |
| Spesa, dottore, parco, palestra, caffè, negozio | quartiere (+40 min di strada) | 70–220 min | vedi sotto |

**Quartiere** (mappa isometrica a cartolina): supermercato (cibo semplice 6, gustoso 14, gourmet 28; posti in frigo
4/8/14 secondo il frigo), dottore (40: cura i malanni, salute +0,3, check-up), parco (gratis: sport, a volte un amico),
palestra (12), caffè (10: amici, svago; il primo amico si conosce qui, poi 45%), negozio di mobili (apre il catalogo),
il mio negozio (dal livello 2 dell'attività). Il caffè fa chiacchierare con un amico (65%) e a metà visita si può
conoscerne uno nuovo (il primo sempre, poi 45%; al parco 15%): l'evento arriva *durante* la scena.

**Scene animate** (`HH.lifeArt.scene(kind, o)`, vignette SVG 320×220 inquadrate più alte, animazioni solo CSS `.lh-a-*`,
token `--lh-*`, velo `--lh-sc-dim` nel tema scuro e velo notturno con l'ora del gioco): per tutta la durata della
commissione, al posto della mappa, con nome del luogo, barra di avanzamento, pulsante mappa e casetta per tornare.
Supermercato (Hari col carrello tra gli scaffali, la frutta salta nel cestino, coniglietta alla cassa), parco (corsa sul
posto con alberi e fiori che scorrono, farfalla; l'amico nuovo corre con lui), palestra (bilanciere, sudore e stelline,
orsetto allenatore), caffè (tavolino, tazze fumanti, fumetti con cuoricini ed emoji; "Nuovo amico!" con l'amico che
compare), dottore (lettino, gattina col camice e lo stetoscopio, cerotto colorato a metà visita; da malato: a letto con
le zzz), il mio negozio secondo l'attività (pasticceria: cappello da cuoco, forno, vetrina che si riempie, pulcino
cliente; bottega d'arte: cavalletto che si colora; vivaio: annaffiatoio e piantine che crescono), negozio di mobili
(Hari che salta sul divano, orsetto commesso, pulsante Costruisci). Gli elementi `[data-k]` compaiono col progresso.
`prefers-reduced-motion` ferma tutto. Nessun canvas: costo trascurabile.

**Malanni** (raffreddore, mal di pancia, acciacchi da 55 anni) estratti a mezzanotte: 2% + salute bassa, stress alto,
inverno, muffa/perdita in casa, e **dopo i 50 anni senza check-up da 12 giorni**. Passano da soli dopo 4 giorni se la
salute regge; il dottore li cura subito.

## Casa e costruzione
- **Monolocale decadente** 6×6: crepa nel muro, carta da parati scollata, muffa "carina" (coi puntini d'occhi),
  ragnatela col ragnetto, perdita dal soffitto con pozzanghera e gocce, assi del pavimento rotte, lampadina che sfarfalla,
  vetro rotto col nastro adesivo; mobili scassati (materasso a terra, frigo ammaccato, TV a tubo, cassetta come tavolo,
  doccia arrugginita). Riparazioni da 0 (ragnatela) a 60 ghiande, 275 in tutto. Carta da parati nuova toglie lo scollato,
  pavimento nuovo le assi rotte.
- **Costruisci** (il tempo si ferma): schede Ripara · Letto e bagno · Cucina · Soggiorno · Lavoro e sport · Decorazioni ·
  Pavimenti e pareti · Casa. Si compra, si posiziona (trascinando il fantasma verde/rosso), si ruota, si sposta e si
  vende a metà prezzo. Regole: dentro la casa, niente sovrapposizioni, porta libera, nessun oggetto o guasto reso
  irraggiungibile; tappeti sotto i mobili; quadri, orologio e mensola sui muri (non su finestre, porta, guasti).
- 42 oggetti (37 in catalogo + 5 vecchi iniziali; letti, doccia, vasca, frighi, fornelli, forni, tavoli, divani, TV, libreria, acquario, scrivanie, banchi
  delle piante, tappetino, cyclette, piante, fiori, lampade, tappeti, poster, quadri, orologio, mensola) con 1–3 stelline;
  5 pavimenti e 5 carte da parati (prezzo che scala con la superficie).
- **Bellezza** 0..1 = (pavimento + pareti + Σ oggetti − 1,25 per guasto + 3) / (10 + 0,6·caselle), con rendimenti
  decrescenti per oggetti dello stesso tipo (×0,6 ciascuno). Monolocale iniziale 0; ristrutturato con poco ≈ 0,35;
  traguardi "casa accogliente" 0,5 e "casa da sogno" 0,85.
- **Traslochi**: 8×6 (2 500, affitto 90/sett.), 8×8 (7 000, 130), casa 10×8 tutta tua (18 000, niente affitto).
  I mobili restano al loro posto; i quadri finiti sotto una finestra nuova si spostano o vengono rimborsati.

## Attività (business) ed economia
Si sceglie una volta: **pasticceria** (forno), **bottega d'arte** (scrivania) o **vivaio** (banco delle piante).

| Livello | Dove | Guadagno base / turno | Per arrivarci | Affitto/sett. | Aiutanti |
|---|---|---|---|---|---|
| 1 banchetto in casa | postazione a casa | 90 | — | 0 | 0 |
| 2 negozio | in città | 170 | 2 000 | 60 | 1 |
| 3 boutique | in città | 270 | 8 000 | 140 | 2 |
| 4 catena | in città | 450 | 25 000 | 280 | 3 |

Guadagno = base · (0,55 + 0,45·bravura) · (0,75 + 0,5·fama) · (0,7 + 0,3·umore) · qualità della postazione (solo
banchetto). Un turno fa crescere bravura (+2% del mancante) e fama (di più se Hari è di buon umore); senza lavorare la
fama cala un po' ogni giorno. Aiutanti: 60 ghiande a settimana, rendono ogni giorno il 40% della base. Bollette ogni
7 giorni: affitto della casa + locale + aiutanti + 10 di luce e acqua. In pensione: 30 + 20·livello al giorno.

Bilanciamento verificato dal "bot giudizioso" (`tests/_life-bot.mjs`, 3 semi): ripara tutto entro pochi giorni,
negozio verso il giorno 25–30 (≈ 2 h di gioco), boutique verso il 50, catena verso il 75–80 (≈ 6 h); umore medio ≈ 0,6.

## Traguardi
Prima riparazione (+20), niente più guasti (+60), primo amico (+20), tre amici (+50), primo turno (+20), un vero
negozio (+100), una catena (+500), casa accogliente (+50), casa da sogno (+200), casa più grande (+100), una casa tutta
mia (+300). Più gli eventi di vita: compleanni di fase, pensione (da 65), **nuova generazione** facoltativa (da 75: il
nipotino riccio torna a 20 anni ed eredita casa, ghiande, amici e attività con metà della bravura).

## Grafica
- Canvas isometrico 2.5D: pavimento con spessore, muri con spessore e testate, battiscopa, finestre col cielo dell'ora
  (notte, alba/tramonto, giorno, stelle) e la stagione (petali, foglie, neve), tendine, raggi di sole sul pavimento che
  si inclinano con l'ora, velo notturno, luci calde additive (lampade, lampadina, TV accesa), ombre e contorni cel.
- Mobili disegnati in coordinate locali (larghezza/profondità) e ruotabili; tappeti sotto, oggetti e personaggi
  ordinati per profondità; fondale (pavimento, muri, guasti) in cache. ~30 fotogrammi al secondo.
- Hari e gli amici (coniglietta, orsetto, pulcino, gattina, maialino) sono SVG cel "cotti" in bitmap con i token risolti.
  Età: giovane col fiore di sakura, adulto col foulard, maturo con occhiali e aculei brizzolati, nonno con aculei grigi,
  sopracciglia bianche, cardigan e bastone. Pose: normale (2 passi), felice, triste/malato, addormentato (nel letto).
- Colori **solo** da `--lh-*` (life.css, tema chiaro e scuro); il ciclo giorno/notte del gioco è indipendente dal tema.

## Integrazione con l'app
- `endless: true` (catalogo e `HH.games`): header con chip età/giorno/ghiande (`meta`), niente livello/fragoline/cuori/
  mosse/tempo; "Ricomincia" chiede conferma ("è una vita intera!"); niente "Annulla" e "Nuovo".
- `snapshot()` = stato puro JSON con `v` (versione 2: `queue`, `free`, `calm`, `tips`; `MIG[1]` li aggiunge ai salvataggi v1); `HH.life.migrate` porta le versioni vecchie (tabella `MIG`),
  riempie i campi mancanti, scarta oggetti sconosciuti e rifiuta versioni future (l'app tiene una copia di riserva).
- `ctx.changed()` ogni ~2,5 s di gioco e dopo ogni azione; `progress(s)` = 0,08 + 0,85·umore (musica a strati).
- Musica `life`: carillon e marimba a 88 bpm, swing leggero, percussioni "lullaby".

## Test
`tests/life.test.mjs`: invarianti a ogni ora (bisogni in 0..1, soldi interi ≥ 0), bot giudizioso su 3 semi (soldi, casa
riparata, attività ≥ 2, umore medio ≥ 0,55, traguardi), trascuratezza → salute/umore giù e il dottore lo rimette in
sesto, dottore a pagamento, casa bella → umore su e stress giù, sport in casa e al parco → stress giù, amici al caffè,
visite e telefonate, invecchiamento monotono con le 4 fasi, pensione e nuova generazione, determinismo e ripresa da
JSON, migrazione, regole di costruzione e trasloco, bollette e debito, attività dal banchetto al negozio, prestazioni
(un giorno simulato < 10 ms), libero arbitrio (da solo per giorni, frigo vuoto → avviso una volta, interruttore),
comandi e coda (precedenza al giocatore, annulla, azioni rapide, menu di Hari completo), migrazione v1 → v2.
