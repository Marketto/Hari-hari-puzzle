// I brani sono partiture: 8 battute da 8 crome, gradi validi, accordi e basso coerenti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/core/audio.js');
const { TRACKS, deg } = HH.music;

test('brani: menu + uno per gioco', () => {
  assert.deepEqual(Object.keys(TRACKS).sort(), ['binary', 'boba', 'drive', 'fixit', 'flight', 'hedgedoku', 'lantern', 'life', 'memory', 'menu', 'parade', 'pixel', 'rally', 'ropes', 'snack', 'spot', 'sushi', 'yarn']);
});

for (const [name, tr] of Object.entries(TRACKS)) {
  test(`brano ${name}: partitura ben formata`, () => {
    assert.equal(tr.mel.length, 8);
    assert.equal(tr.chords.length, 8);
    tr.melT.forEach((bar, b) => {
      assert.equal(bar.length, 8, `${name} battuta ${b + 1}`);
      assert.notEqual(bar[0], '-', `${name} battuta ${b + 1} inizia con una tenuta`);
      bar.forEach((tok) => assert.ok(tok === '.' || tok === '-' || (+tok >= 1 && +tok <= 14), `${name}: "${tok}"`));
    });
    assert.equal(tr.bassT.length, 8);
    tr.bassT.forEach((tok) => assert.ok(['R', 'F', 'O', '.'].includes(tok)));
    assert.ok(tr.chords.every((c) => c >= 1 && c <= 7));
    assert.ok(tr.bpm >= 60 && tr.bpm <= 140);
    // ultima battuta risolve sulla tonica
    assert.equal(tr.chords[7], 1);
  });
}

test('effetti di Hari Rally: navigatore e power-up (senza audio non fanno niente e non si rompono)', () => {
  const { sfx, engine } = HH.audio;
  for (const k of ['pace', 'gift', 'zoom', 'whee', 'squish', 'puff', 'bubble', 'pop', 'sproing', 'tink', 'plop']) {
    assert.equal(typeof sfx[k], 'function', k);
    assert.doesNotThrow(() => sfx[k](1, 2));
  }
  assert.doesNotThrow(() => engine(true, 0.5, 0.2));
});

test('gradi della scala maggiore', () => {
  const tr = { root: 60 };
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((d) => deg(tr, d)), [60, 62, 64, 65, 67, 69, 71, 72]);
});
