# Hari Colors

Gioco di rapidità e attenzione: **Hari dice ad alta voce il nome di un colore** e sullo schermo ci sono sagome kawaii
(cuore, stella, palloncino, mela, fiore, nuvola, goccia, mochi, pesce, gattino) di colori diversi: si tocca quella del
colore detto il più in fretta possibile. Dai livelli avanzati arrivano le **parole dei colori** e poi l'**effetto
Stroop**: "ROSSO" scritto in blu. Conta sempre l'**inchiostro**, non la parola.

File: `src/games/colors-logic.js` (logica pura, `HH.colors`) · `src/games/colors-voice.js` (sintesi vocale,
`HH.colorsVoice`) · `src/games/colors-ui.js` · `src/games/colors.css` (token `--co-*`, tinta card `--tint-colors`) ·
`tests/colors.test.mjs` · blocco in `tools/selftest.mjs`. Chiave regole `r_colors`, prefisso CSS `co-`, brano `colors`
in `src/core/audio.js`.

## Regole
- Un livello è una serie di **round** (8–12). In ogni round Hari dice un colore e c'è **esattamente un** oggetto con
  quell'inchiostro; i distrattori hanno altri colori (con più oggetti che colori qualche distrattore si ripete, mai il
  colore giusto).
- **Tocco giusto**: punti in base alla rapidità, saltello e "+punti", si passa al round dopo.
- **Tocco sbagliato**: un cuore (3 cuori per livello), la serie si azzera, l'oggetto si spegne e **il round continua**:
  si può ancora trovare quello giusto (a metà punti).
- **Tempo scaduto**: zero punti e serie azzerata, ma **nessun cuore**: Hari dice "Troppo lento! Era questo." e
  l'oggetto giusto si illumina. Così chi è lento arriva comunque in fondo (con meno fragoline): niente frustrazione.
- Finiti i round con almeno un cuore si vince. Tre errori: finestra "cuori finiti" e si riprova lo stesso livello.
- **Annulla** non fa nulla (gioco di rapidità). **Ricomincia** = stessi round dall'inizio; **Nuovo puzzle** = altro seme.
- Si parte con **"Tocca per iniziare"** (serve anche a iOS per sbloccare la voce). La pausa (tutorial dal "?", app in
  background) ferma il tempo; si riprende con un tocco e il round **si rigenera** (contatore `redo`), così fermarsi non
  serve a sbirciare.

## Punteggio e fragoline
- Punti per risposta giusta: `40 + 60 × rapidità` (rapidità = 1 entro i primi `GRACE` = 600 ms, il tempo di sentire il
  nome, poi scende fino a 0 alla fine del tempo), dimezzati per ogni errore nello stesso round (al massimo ÷4),
  più **+5 per ogni risposta giusta di fila** (fino a +50). Ogni 5 di fila: campanelle e Hari contento.
- Fragoline (`rate`): 3 senza errori, senza tempi scaduti e con rapidità media ≥ 0,5; 2 con al massimo un errore e due
  tempi scaduti; altrimenti 1.
- `parTime` = round × (metà del tempo di un round + 1,2 s di passaggio). `progress` = round fatti / round del livello.

## Curva di difficoltà (`config(level)`)
k = colori diversi nel round, n = oggetti sullo schermo, tempo per rispondere.

| Livello | k | n | Tempo | Modalità | |
|---|---|---|---|---|---|
| 1 | 3 | 3 | 7,0 s | sagome | 8 round |
| 2 | 4 | 4 | 6,5 s | sagome | |
| 3 | 5 | 5 | 6,0 s | sagome | 10 round |
| 4 | 6 | 7 | 5,5 s | sagome | |
| 5 | 4 | 4 | 6,5 s | **parole coerenti** ("ROSSO" in rosso) | Nuovo! |
| 6 | 6 | 6 | 5,5 s | parole coerenti | |
| 7 | 4 | 4 | 7,0 s | **Stroop** (tutte incoerenti) | Nuovo! |
| 8 | 7 | 8 | 5,0 s | sagome (respiro) | |
| 9 | 5 | 5 | 6,5 s | Stroop | |
| 10 | 6 | 7 | 6,0 s | **misto** (sagome + coerenti + incoerenti) | Nuovo! |
| 11 | 8 | 9 | 5,0 s | sagome | 12 round |
| 12 | 7 | 7 | 5,5 s | Stroop | |
| 13 | 8 | 9 | 5,0 s | misto | |
| 14 | 9 | 10 | 4,5 s | Stroop | |
| 15+ | 9 → 11 | k+1 (max 12) | −0,15 s a livello, minimo 3 s | sagome / Stroop / misto a rotazione | |

Il passaggio allo Stroop è graduale: prima le parole con il loro colore (si impara a guardare l'inchiostro di una
parola), poi tutte incoerenti con **pochi colori e più tempo**, poi miste. Ogni volta che una modalità entra, la
copertina mostra "Nuovo!" con il suggerimento (`co_words`, `co_stroop`, `co_mixed`). Nei round Stroop e misti c'è
sempre un'**esca**: una parola che *dice* il colore cercato scritta in un altro inchiostro.

## Algoritmo (`round(s)`)
Deterministico dato `seed`, numero del round `i` e ripetizione `redo` (mulberry32 su un hash dei tre).
1. Sceglie k colori dal pool dei primi `k + 3` colori dell'ordine di introduzione (rosso, blu, giallo, verde, arancione,
   viola, rosa, nero, bianco, marrone, grigio); con **k ≤ 5 niente coppie `CLOSE`** (vedi sotto).
2. Bersaglio a caso, mai uguale a quello del round prima (`s.last`).
3. Inchiostri: il bersaglio una volta, ogni altro colore almeno una volta, poi distrattori ripetuti fino a n.
4. Tipo degli oggetti secondo la modalità (sagoma, parola coerente, parola incoerente; esca nei round Stroop/misti).
5. Nessun oggetto identico a un altro (stesso inchiostro e stessa parola/sagoma), poi mescola.

Il test (`tests/colors.test.mjs`) usa un oracolo che conta gli inchiostri: per ogni livello 1–24 e 25 semi, ogni round
ha una sola risposta giusta, le regole della modalità e l'esca; un bot che tocca l'inchiostro giusto vince sempre.

## Colori, contrasto e daltonismo
- **11 colori di base** (Berlin & Kay): le parole che un bambino conosce in quasi tutte le lingue. Il "circa 12"
  della richiesta è diventato 11 colori + fino a 12 oggetti: un dodicesimo colore (azzurro, turchese…) non è una parola
  di base in molte lingue e sarebbe vicino a blu e verde.
- Valori solo come **token** in `colors.css` (`--co-red` …), uguali nei due temi (il colore è la risposta: un rosso deve
  restare lo stesso rosso); cambiano campo, bordo (`--co-edge`, scuro nel tema chiaro e chiaro nel tema scuro) e i
  dettagli `--co-<id>-on` (occhietti e sorriso: scuri sui colori chiari, chiari sugli scuri).
- Il test legge `colors.css` e controlla, in entrambi i temi: ogni colore si stacca dal campo ≥ 3:1 direttamente o grazie
  al bordo (bianco e giallo sul chiaro, nero e marrone sullo scuro hanno il bordo che contrasta); dettagli ≥ 3:1;
  distanza OKLab fra ogni coppia ≥ 15; ogni coppia che con una simulazione di protanopia, deuteranopia o tritanopia
  (Machado 2009) scende sotto 12 è dichiarata in `CLOSE` (rosso/marrone, rosso/verde, rosso/arancione,
  arancione/verde, arancione/rosa, blu/viola, verde/blu, verde/grigio, rosa/grigio, viola/marrone).
- Le parole hanno un alone del colore del bordo, sono MAIUSCOLE nella lingua corrente e hanno **tutte la stessa misura**
  nel round (una parola più piccola non deve suggerire nulla).

### Opzione "simboli"
Pulsante con le formine accanto al "ripeti", salvato in `colors:sym`. Ogni colore ha un segno (rosso ●, blu ✚,
giallo ▲, verde ■, arancione ◆, viola ✖, rosa ○, nero ≡, bianco ☾, marrone •••, grigio ∿) in un tondino sull'oggetto
e anche nel fumetto accanto al nome/onde. **Perché sì**: circa 1 maschio su 12 ha un daltonismo rosso-verde; con le
coppie `CLOSE` sullo schermo insieme (dal livello 4 in su) il gioco diventerebbe a caso per loro. Con i simboli il
gioco resta lo stesso (ascolto + ricerca veloce), solo il canale cambia. È spento di default perché per gli altri
renderebbe il gioco un abbinamento di forme.

## Voce
- `speechSynthesis` del dispositivo, **solo voci locali** (`localService !== false`): le voci "online" di Chrome/Edge
  farebbero chiamate esterne e sono escluse. Lingua = lingua corrente dell'app.
- Scelta (`pickVoice`, testata in Node): stessa lingua (bosniaco accetta anche croato e serbo, norvegese anche bokmål e
  nynorsk; nessun altro ripiego), regione preferita (zh-CN prima di zh-TW, zh-HK in fondo perché spesso cantonese),
  bonus per voci predefinite e "enhanced/premium/neural", **mai** le voci buffe di Apple (Bubbles, Whisper, Zarvox…).
- Caricamento asincrono: `getVoices()` all'avvio, a ogni `voiceschanged` e per Safari/iOS (che spesso non lo manda)
  ogni 250 ms per circa 4 s. iOS: il tocco "Inizia" pronuncia un'enunciazione vuota a volume 0 per sbloccare la voce.
  Chrome: `resume()` prima di `speak()`, riferimento all'enunciazione tenuto in vita.
- Il tempo del round parte quando la voce **inizia** a parlare (`onstart`). Se non parte entro 1,8 s o dà errore, il
  nome compare nel fumetto e il tempo parte da lì; due fallimenti di fila e per la sessione si usa il fumetto.
- **Fumetto di riserva** (nessuna voce per la lingua, sintesi assente, voce fallita, **audio dell'app spento**): il nome
  scritto in `--co-bubble-ink` (neutro, mai il colore da trovare) con un campanellino (`sfx.chime`).
- Mentre Hari parla nel fumetto ci sono le onde del suono, la musica si abbassa (`HH.music.duck`) e torna su alla fine
  (con un tetto di 4 s se `onend` non arriva, come a volte su iOS).
- Pulsante **ripeti** (altoparlante): ridice il colore (o rianima il fumetto) senza fermare il tempo.

## Schermo
- `fill: true`: a schermo intero il gioco usa tutto il riquadro. Il campo è una griglia calcolata con un
  `ResizeObserver` per avere le celle più grandi possibili (celle più larghe se ci sono parole).
- Telefono girato (riquadro largo): Hari, fumetto, pulsanti e indicatori in colonna a sinistra, campo a destra.
- `prefers-reduced-motion`: niente animazioni di entrata, scossa e saltelli.

## Limiti noti
- Le voci disponibili dipendono dal telefono: su Android servono i dati della lingua di Sintesi vocale Google (o di un
  altro motore) installati; altrimenti si gioca con il fumetto. Da provare su telefoni veri (TODO).
- I nomi dei colori nelle 41 lingue diverse da EN e IT sono per ora in inglese (da tradurre: `col_*` e le altre chiavi
  `co_*`, `tu_colors_*`, `r_colors`); finché non tradotti la voce di quella lingua leggerebbe parole inglesi.
