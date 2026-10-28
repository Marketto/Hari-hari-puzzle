# Hari Taxi

Gioco di guida in tempo reale **visto dall'alto**: la camera segue il veicolo di Hari (non ruota, sopra è sempre nord)
in una città a griglia con isolati, incroci con semafori, strisce pedonali, marciapiedi, tetti colorati e parchi.
Ogni livello chiede **N consegne** entro un tempo limite, con tre mestieri a rotazione. Grafica originale kawaii:
l'impostazione (città dall'alto, camera che segue l'auto) è quella dei classici top-down, nessun asset o nome ripreso.
**Niente violenza**: chi viene urtato fa "bonk" (nuvoletta con stelline) o un salto spaventato con "!", mai danni.

- id `drive`, brand **Hari Taxi** (non tradotto), regole `r13`, brano `drive`, tinta `--tint-drive`, token `--dr-*`.
- File: `src/games/drive-logic.js` (logica pura), `src/games/drive-ui.js` (canvas), `src/games/drive.css`,
  `tests/drive.test.mjs` + `tests/_drive-bot.mjs` (bot), blocco "Hari Taxi" in `tools/selftest.mjs`.
- Effetti nuovi in `src/core/audio.js`: `honk` (clacson "bip bip" del traffico) e `boing` (il "bonk" di gomma).

## Regole
- **Controlli** (un pollice): tocca e trascina ovunque sulla città = levetta che compare sotto il dito. Hari va nella
  direzione indicata (assoluta sullo schermo), più lontano = più veloce; se punti all'indietro da fermo fa retromarcia;
  lasci il dito = frena. Tastiera: frecce/WASD (su = gas, giù = freno e retromarcia, destra/sinistra = sterzo).
  Spazio/P/Esc o ⏸ = pausa; "Annulla" = pausa/riprendi. Si parte dopo "Pronti?… Via!" al **primo tocco/freccia**;
  in pausa (anche automatica a pagina nascosta) e alla ripresa da salvataggio si riparte di nuovo al primo input.
- **Missioni** (livello 1 taxi, 2 cibo, 3 pacchi, poi di nuovo):

  | Mestiere | Veicolo | Ritiro | Consegna |
  |---|---|---|---|
  | taxi | taxi giallo (equilibrato) | un animaletto aspetta alla fermata col fumetto della casa | lo porti a destinazione (il passeggero viaggia dietro) |
  | cibo | scooter rosa col bauletto (veloce, agile, fragile) | sacchetto fumante al ristorante (tendina a righe sul tetto) | 1 ordine, 2 dal livello 8 |
  | pacchi | furgone azzurro (lento, largo, robusto) | al deposito (portone sul tetto): 2 pacchi, 3 dal livello 6, 4 dal 10 | a indirizzi diversi, in qualsiasi ordine |

- **Fermate**: anello rosa tratteggiato sulla strada davanti al marciapiede (raggio 1,2 caselle) e segnalino col disegno
  della consegna. Si carica/scarica **fermandosi** (sotto 1,2 caselle/s) dentro l'anello; vanno bene entrambe le corsie.
  Freccia gialla attorno al veicolo = prossima svolta del percorso più breve su strada; segnalini sul bordo = mete fuori
  schermo; minimappa in alto a destra (tocca per nasconderla/mostrarla, scelta salvata).
- **Tempo limite**: parte al ritiro (barra in alto, orologio; per il cibo una ciotola fumante: "si raffredda"). Con più
  consegne a bordo il limite è unico per tutto il giro. Se scade: le consegne a bordo sono perse (passeggero che scende
  imbronciato, cibo freddo con fiocchi azzurri), **−1 cuore** (uno solo anche con più pacchi) e arriva subito una nuova
  corsa: il livello si vince sempre completando N consegne, ma i cuori sono 3 (`lives: 3`).
- **Incidenti** (−1 cuore, poi 2,2 s di invulnerabilità lampeggiante): urtare un'auto, un autobus o una bici andandogli
  addosso (velocità verso l'altro veicolo ≥ soglia del mezzo: taxi 1,2 · scooter 0,9 · furgone 1,6 caselle/s);
  toccare un pedone che attraversa a ≥ 0,8 caselle/s (il pedone salta via verso il marciapiede più vicino con "!" e
  stelline). A passo d'uomo o di striscio è solo "bonk", nessun cuore. **Muri ed edifici**: rimbalzo morbido, il
  veicolo scivola lungo il bordo, mai cuori. Gli ostacoli grossi della città sono solo isolati e parchi (morbidi).
- **Traffico**: auto (6 colori), autobus (dal livello 2), bici con un animaletto in sella. Seguono le corsie (si guida
  a destra), svoltano agli incroci (dritto più probabile), si fermano col rosso alla linea prima delle strisce, dietro
  a chi le precede, davanti ai pedoni sulle strisce e **sempre davanti a Hari** (dopo 1,6 s suonano il clacson; se Hari
  è fermo contromano davanti a loro fanno un po' di retromarcia). Semafori a ciclo fisso (6,5 s verde, 1,4 s tutto
  rosso) sugli incroci con 3–4 strade, sfasati tra loro. Hari non è obbligato a rispettarli (nessuna multa), ma chi
  passa col rosso rischia gli incroci affollati.
- **Pedoni** (coniglietti, pulcini, maialini, orsetti, pecorelle, gattini, ranocchie, paperelle con la maglietta)
  camminano sui marciapiedi attorno agli isolati e agli angoli a volte attraversano sulle strisce, **solo col loro
  verde** e se Hari non sta arrivando a tutta velocità.

## Stelle e punteggio
3 senza cuori persi, 2 con uno, 1 oltre. "Mosse" (zampette) = consegne fatte.
`parTime` = consegne × (8 s + distanza media / metà della velocità massima), diviso √(consegne per giro).
`progress` = (consegne fatte + 0,4 × consegne a bordo) / N (guida la musica a strati).

## Curva di difficoltà (`config(level)`, monotona)
Gradini (`tier`): 0 = livelli 1–2 · 1 = 3–5 · 2 = 6–9 · 3 = 10–13 · 4 = 14+.

| | L1 | L3 | L6 | L10 | L14+ |
|---|---|---|---|---|---|
| Isolati | 3×3 da 4 | 4×4 da 3–4 | 5×4 da 3–5 | 5×5 da 3–5 | 6×6 da 3–5 |
| Città (caselle, seme 1) | 22×22 | 27×27 | 35×28 | 35×35 | 40×42 |
| Tratti chiusi (parchi) | 1 | 2 | 3 | 4 | 5 |
| Consegne per vincere | 4 | 4 | 5 | 7 | 8 |
| Veicoli del traffico | 3 | 6 | 12 | 18 | 25 (max 28) |
| Pedoni | 5 | 9 | 16 | 25 | 34 (max 40) |
| Margine sul tempo (`slack`) | 2,6 | 2,43 | 2,17 | 1,83 | 1,65 |
| Secondi regalati (`base`) | 12 | 11 | 9,5 | 7,5 | 6 |
| Distanza ritiro → consegna | 10–22 | 12–26 | 15–32 | 19–40 | 20–44 |

Tempo limite = `base` + percorso su strada (giro "più vicino per primo") / `refV` × `slack` + 2,5 s per fermata in più,
con `refV` = min(0,55 × velocità massima, 2,3) caselle/s: nel traffico conta la velocità delle auto più che quella
del mezzo, così lo scooter veloce non viene penalizzato.
Livello 1: città piccola con 3 auto e 5 pedoni, 4 corse col taxi; il bot lo finisce in 60–120 s.

## Algoritmo
- **Città** (`buildCity`): linee delle strade (`vx`, `hy`) con isolati di lato casuale nel range del gradino, bordo di
  1 casella di alberi; poi alcuni **tratti interni chiusi** che uniscono due isolati in un parco, accettati solo se
  ogni incrocio resta con almeno 2 strade (niente vicoli ciechi) e la rete resta connessa (BFS sugli incroci); ogni
  isolato al massimo in una fusione, quindi gli isolati restano rettangoli. Qualche parco in più (12%).
- **Stato** JSON puro: mappa come stringa (`.` strada, `#` edifici, `p` parco, `~` bordo) + `vx`/`hy`; isolati,
  incroci (con vicini e semaforo), fermate e distanze su strada (BFS a 4 vicini) si ricavano con `geo(s)`/`field(s)`
  e stanno in cache fuori dallo stato. Generatore casuale nello stato (`rs`, mulberry32), passi fissi da 1/60 s:
  stesso seme + stessi comandi = stessa partita, anche ripartendo da un salvataggio.
- **Traffico**: ogni veicolo è su un segmento (corsia tra due incroci, poi svolta come curva di Bézier quadratica
  nel quadrato dell'incrocio). Velocità = minimo tra limite del mezzo, frenata per il rosso, e frenata per chi c'è
  davanti (cono in avanti con una griglia spaziale a celle di 2 caselle). Ingorghi tra auto che si aspettano a
  vicenda: dopo 4 s una passa (mai se in fondo alla fila c'è Hari).
- **Pedoni**: parametro lungo il perimetro del marciapiede dell'isolato; agli angoli con un incrocio semaforizzato
  possono attraversare verso l'isolato di fronte col verde e con abbastanza secondi rimasti.
- **Guida di Hari**: velocità sempre lungo il muso (niente derapate), sterzo che dipende dalla velocità (si gira anche
  quasi fermi), levetta assoluta o tasti relativi; collisione con cerchi lungo il veicolo contro le caselle piene
  (spinta fuori, rimbalzo morbido o scivolata) e contro i cerchi degli altri veicoli.
- **Corse**: taxi = fermata a 6–(0,6 × dmax) caselle da Hari; cibo = un ristorante diverso dal precedente (2 o 3 in
  città, lontani tra loro); pacchi = sempre il deposito, vicino al centro. Destinazioni su isolati diversi, a distanza
  su strada nel range del livello, distanti tra loro almeno 4 caselle.

## Test (`tests/drive.test.mjs`, bot in `tests/_drive-bot.mjs`)
Il bot legge solo lo stato pubblico e rifà da sé grafo degli incroci (dalla mappa), percorsi su corsia (Dijkstra con
penalità di svolta, senza inversioni a U), pure pursuit, curve più lente a destra, frenata per ostacoli lungo il
percorso (anche dove saranno tra 0,5 s) contando il tempo di reazione, stop col rosso, manovre per uscire dagli stalli.
- vince i livelli 1–12 su 4 semi (reazione ~0,22 s): tutti fino al 6, al massimo 2 sconfitte su 48; livello 1 in
  40–150 s con al massimo un cuore perso; un bot lento (0,4 s) che ignora i semafori vince i livelli 1–4;
- città connessa e fermate raggiungibili (livelli 1–16), tempi limite rispettabili andando al 60% della velocità
  massima con 1,5 s per fermata (oracolo che prova tutti gli ordini di consegna);
- determinismo e ripresa da JSON; incidenti (auto: un cuore e invulnerabilità; piano piano solo "bonk"; pedone: un
  cuore e salto; muri: nessun cuore e mai dentro un isolato); scadenza = un cuore anche con più pacchi; traffico che
  entra negli incroci solo col suo verde, pedoni solo col loro verde; curva monotona; generazione < 10 ms.
In CI i limiti di tempo valgono il triplo (`SLOW`).

## Interfaccia (`drive-ui.js`)
- Città fissa dipinta a blocchi di 8×8 caselle in canvas fuori schermo (al massimo 16 in cache, risoluzione
  min(dpr, 1,5)); a ogni fotogramma: semafori, anelli e segnalini, pedoni, ombre e veicoli (sprite SVG cotti in
  bitmap alla risoluzione giusta), fari di notte (gradienti in "lighter"), particelle, freccia, minimappa, levetta.
- Hari al volante è un adesivo sempre dritto sopra il veicolo (cappellino da tassista, casco da scooter, berretto da
  corriere); il passeggero viaggia dietro, i pacchi sul tetto del furgone.
- Tema scuro = notte: lampioni accesi (bagliore cotto nei blocchi), fari, tetti e strade più scuri.
- Schermo intero del riquadro: la città occupa tutto lo spazio rimasto (`.board:has(> .dr-wrap)` in colonna).
- `el._drive.state()` sul `#board` restituisce lo stato vivo della partita (per i controlli con Playwright).
