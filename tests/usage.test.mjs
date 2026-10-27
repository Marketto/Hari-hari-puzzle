// Tempo di gioco locale e statistiche anonime facoltative (GoatCounter): niente invii senza codice e consenso.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, load } from './_load.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const sent = [];
globalThis.fetch = (url) => { sent.push(url); return Promise.resolve({}); };
const HH = load('src/core/core.js', 'src/core/usage.js');
const U = HH.usage;
const tick = () => new Promise((r) => setTimeout(r, 400));

test('tempo di gioco e partite restano sul telefono', () => {
  U.open('boba');
  for (let i = 0; i < 125; i++) U.tick('boba');
  const u = U.get('boba');
  assert.equal(u.sessions, 1);
  assert.equal(u.sec, 125);
  assert.equal(U.total(['boba', 'sushi']), 125);
  assert.equal(sent.length, 0, 'nessun invio');
});

test('senza codice GoatCounter non si chiede il consenso e non parte nulla', () => {
  assert.equal(U.CODE, '', 'il codice nel repo pubblico resta vuoto finché non viene configurato');
  assert.equal(U.canAsk(), false);
  U.setConsent(true);
  U.event('open/boba');
  assert.equal(sent.length, 0);
});

test('con codice: solo dopo il sì, solo eventi anonimi, coda offline', async () => {
  U.CODE = 'prova';
  U.setConsent(false);
  U.open('sushi');
  assert.equal(sent.length, 0, 'senza consenso niente');
  U.setConsent(true);
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true, writable: true });
  U.open('sushi');
  for (let i = 0; i < 60; i++) U.tick('sushi');
  assert.equal(sent.length, 0, 'offline: in coda');
  assert.deepEqual(HH.store.get('anQueue', []), ['open/sushi', 'minute/sushi']);
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
  U.flush();
  await tick(); await tick();
  assert.equal(sent.length, 2);
  for (const u of sent) {
    assert.match(u, /^https:\/\/prova\.goatcounter\.com\/count\?p=%2F(open|minute)%2Fsushi&e=true&rnd=[a-z0-9]+$/);
  }
  assert.deepEqual(HH.store.get('anQueue', []), []);
  // revoca: la coda si svuota e non parte più nulla
  U.setConsent(false);
  U.open('sushi');
  await tick();
  assert.equal(sent.length, 2);
  U.CODE = '';
});

test('il service worker non intercetta GoatCounter e la shell include usage.js', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /'src\/core\/usage\.js'/);
  assert.match(sw, /if \(url\.origin !== location\.origin\) return;/);
});
