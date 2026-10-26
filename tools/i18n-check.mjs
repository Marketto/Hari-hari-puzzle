// Verifica che ogni lingua abbia tutte le chiavi e nessun valore vuoto:
//   node tools/i18n-check.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'src/i18n/locales.js'), 'utf8'));
const { I18N_KEYS, _I18N_ROWS } = globalThis.HH;
const REQUIRED = ['bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fi', 'fr', 'ga', 'hr', 'hu', 'it', 'lt', 'lv', 'mt', 'nl', 'pl', 'pt', 'ro', 'sk', 'sl', 'sv', 'ru', 'zh', 'ar', 'ja', 'ko'];
let bad = 0;
const codes = new Set();
for (const row of _I18N_ROWS) {
  const [code, , dir, ...vals] = row;
  if (codes.has(code)) { console.log(`✘ ${code}: duplicata`); bad++; }
  codes.add(code);
  if (!['ltr', 'rtl'].includes(dir)) { console.log(`✘ ${code}: direzione "${dir}"`); bad++; }
  if (vals.length !== I18N_KEYS.length) { console.log(`✘ ${code}: ${vals.length} valori, attesi ${I18N_KEYS.length}`); bad++; }
  vals.forEach((v, i) => { if (!String(v || '').trim()) { console.log(`✘ ${code}.${I18N_KEYS[i]} vuoto`); bad++; } });
}
REQUIRED.filter((c) => !codes.has(c)).forEach((c) => { console.log(`✘ manca la lingua obbligatoria ${c}`); bad++; });
console.log(bad ? `\n${bad} problemi` : `✔ ${codes.size} lingue × ${I18N_KEYS.length} chiavi complete`);
process.exit(bad ? 1 : 0);
