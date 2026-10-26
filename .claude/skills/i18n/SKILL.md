---
name: i18n
description: Aggiungere o modificare stringhe UI e lingue (43 lingue, RTL arabo). Usala per ogni testo visibile.
---

# Traduzioni

File unico: `src/i18n/locales.js`. Ogni riga = `[codice, nome nativo, 'ltr'|'rtl', ...valori]` nell'ordine di `HH.I18N_KEYS`.

## Aggiungere una chiave
1. Aggiungi il nome in fondo a `HH.I18N_KEYS`.
2. Aggiungi il valore in fondo a **ognuna** delle 43 righe.
3. Usa `HH.i18n.t('chiave')` nel codice. Il fallback è l'inglese, ma la CI fallisce se manca una lingua.
4. `node tools/i18n-check.mjs`.

## Aggiungere una lingua
Nuova riga con codice ISO 639-1; per RTL metti `'rtl'` (il layout usa proprietà logiche, le griglie di gioco restano `ltr`).
Se lo script non è latino/cirillico/greco/CJK, aggiungi un font Google adatto in `index.html` e nella catena `--font-body`.

## Lingue attuali (43)
UE: bg cs da de el en es et fi fr ga hr hu it lt lv mt nl pl pt ro sk sl sv ·
Altre europee: be bs ca cy eu gl is lb mk no sq sr tr uk · Extra: ru zh ja ko ar

## Stile
Frasi brevi, tono affettuoso, niente giochi di parole intraducibili. I nomi dei giochi non si traducono.
