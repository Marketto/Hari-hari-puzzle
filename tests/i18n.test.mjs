import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './_load.mjs';

const HH = load('src/i18n/locales.js');
test('43 lingue con tutte le chiavi non vuote', () => {
  assert.ok(HH.LANGS.length >= 43);
  for (const l of HH.LANGS) for (const k of HH.I18N_KEYS) assert.ok(String(HH.LOCALES[l.code][k] || '').trim(), `${l.code}.${k}`);
  assert.equal(HH.LANGS.find((l) => l.code === 'ar').dir, 'rtl');
});
