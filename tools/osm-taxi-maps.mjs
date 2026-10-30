// Mappe reali di Hari Taxi: confini e luoghi da cercare nei dati OpenStreetMap (usato da tools/osm-taxi.mjs).
// bbox = [minLon, minLat, maxLon, maxLat] in gradi (area scaricata); crop = parte usata nel gioco; extracted = data del download; m = metri per casella del gioco; water = semi del flood fill
// per il mare / il lago (punti sicuramente in acqua, [lon, lat]); land = un punto sicuramente a terra (controllo).
// marks = luoghi notevoli da tenere anche se il tag OSM non basta (cercati per nome, nel raggio indicato).
export const MAPS = {
  ostia: {
    name: 'Ostia',
    bbox: [12.255, 41.715, 12.335, 41.755],
    crop: [12.255, 41.715, 12.322, 41.755],
    extracted: '2026-10-29',
    m: 9,
    water: [[12.26, 41.718], [12.3, 41.716]],
    land: [12.292, 41.735],
    marks: [
      { k: 'pier', re: /pontile/i },
      { k: 'station', re: /lido centro|stella polare|castel fusano|ostia antica|lido nord/i },
    ],
    start: ['pier', 'station', 'beach', 'square'],
  },
  desenzano: {
    name: 'Desenzano del Garda',
    bbox: [10.49, 45.455, 10.58, 45.485],
    crop: [10.50, 45.455, 10.58, 45.485],
    extracted: '2026-10-29',
    m: 9,
    water: [[10.56, 45.484], [10.575, 45.47]],
    land: [10.538, 45.462],
    marks: [
      { k: 'castle', re: /castello/i },
      { k: 'harbour', re: /porto vecchio|porto di desenzano|porticciolo/i },
      { k: 'station', re: /desenzano/i },
    ],
    start: ['harbour', 'castle', 'station', 'square'],
  },
  // Ortigia (Siracusa): l'isola con i due ponti (Umbertino e Santa Lucia) più il centro sulla terraferma (corso Umberto,
  // Borgata Santa Lucia, stazione, Neapolis con il Teatro Greco); a ovest il Porto Grande. style = edifici in pietra
  // chiara e tetti caldi. special = luoghi con un'icona propria (vedi tools/osm-taxi.mjs).
  ortigia: {
    name: 'Ortigia',
    bbox: [15.255, 37.05, 15.305, 37.085],
    crop: [15.265, 37.05, 15.305, 37.085],
    extracted: '2026-10-30',
    m: 9,
    style: 'stone',
    water: [[15.302, 37.06], [15.28, 37.055], [15.303, 37.08]],
    land: [15.293, 37.06],
    marks: [
      { k: 'harbour', re: /porto grande|porto piccolo/i },
      { k: 'station', re: /siracusa/i },
      { k: 'castle', re: /maniace/i },
      { k: 'duomo', re: /cattedrale/i },
      { k: 'fountain', re: /aretusa/i },
      { k: 'temple', re: /apollo/i },
      { k: 'theatre', re: /teatro greco/i },
      { k: 'market', re: /mercato/i },
    ],
    special: [
      { k: 'duomo', re: /^cattedrale di siracusa$/i },
      { k: 'fountain', re: /^fonte aretusa$/i },
      { k: 'temple', re: /^tempio di apollo$/i, tag: (t) => !!t.historic },
      { k: 'theatre', re: /^teatro greco$/i, tag: (t) => t.amenity === 'theatre' },
      { k: 'market', re: /^mercato di via de benedictis$/i },
      { k: 'harbour', re: /^porto grande$/i, at: [15.2913, 37.0613] },
      { k: 'harbour', re: /^porto piccolo$/i, at: [15.2905, 37.0688] },
    ],
    start: ['duomo', 'harbour', 'station', 'fountain', 'temple', 'castle', 'market', 'theatre'],
  },
};
