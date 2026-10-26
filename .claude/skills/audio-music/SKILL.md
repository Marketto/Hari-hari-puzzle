---
name: audio-music
description: Musiche generative, effetti sonori e messaggi di Hari. Usala per nuovi brani, strumenti, suoni o frasi della mascotte.
---

# Audio e voce di Hari

Tutto in `src/core/audio.js`, sintetizzato con WebAudio: nessun file audio, funziona offline.

## Brani (`TRACKS`)
Partitura compatta: `mel` = 8 battute da 8 crome con gradi della scala maggiore (`1`..`14`, `.` pausa, `-` tenuta),
`chords` = grado della triade per battuta (l'ultima deve essere `1`), `bass` = 8 simboli `R` tonica, `F` quinta, `O` ottava, `.`.
Campi: `bpm`, `root` (MIDI), `lead`/`arp` (strumento), `swing` (0..0.3), `perc` (`lullaby` | `pop` | `bubbly` | `night`).
Un brano per gioco con lo stesso `id` del gioco; `menu` per la home. Verifica con `node --test tests/music.test.mjs`.

## Musica dinamica
`HH.music.setIntensity(p)` con p = `game.progress(snapshot)` (0 = inizio, 1 = risolto). Strati:
0 melodia + pad · .12 basso · .38 percussioni · .62 arpeggio + melodia all'ottava · .86 campanelle + tempo +6%.
Ogni gioco DEVE esporre `progress(s)`. Vittoria e "cuori finiti" abbassano la musica (`duck`).

## Effetti (`HH.audio.sfx`)
Intonati sulla scala del brano in corso (`sc(grado)`). Esistenti: tap, mark, place, bad, heart, lose, pick, pour(ms), cupDone,
lightOn(i), lightOff, star(i), giggle, blip, milestone, open, win, record.

## Messaggi di Hari (`say(kind)` in `app.js`)
Categorie: start, good, half, almost, oops, idle, poke, cheer → chiavi `m_*` in tutte le 43 lingue (skill `i18n`).
Massimo un messaggio ogni 4,5 s, tranne i traguardi (metà, quasi fatto) che hanno la precedenza.
