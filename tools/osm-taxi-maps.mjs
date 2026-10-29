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
};
