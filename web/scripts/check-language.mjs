// T-06: no accusatory words in the interface. Scans source copy and, if present, the built
// site. The methodology page may name the words only to say they are not used.
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {join, relative, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const WORDS_CSV = resolve(ROOT, '../sql/seeds/palabras_prohibidas.csv');
const ALLOWED = new Set(['src/pages/Metodologia.tsx']);

export function loadWords(path = WORDS_CSV) {
  return readFileSync(path, 'utf8').split(/\r?\n/).slice(1).map((w) => w.trim()).filter(Boolean);
}

const fold = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Returns the forbidden words found in `text` as whole words. */
export function findForbidden(text, words) {
  const t = fold(text);
  return words.filter((w) => new RegExp(`(^|[^\\p{L}])${fold(w)}([^\\p{L}]|$)`, 'u').test(t));
}

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

function main() {
  const words = loadWords();
  const files = walk(join(ROOT, 'src'), ['.ts', '.tsx']).filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
  // RSS feeds are skipped: they carry official entity names from the source (e.g. a commission
  // "de lucha contra la corrupción"). Their template text is tested in components.test.tsx.
  if (existsSync(join(ROOT, 'dist'))) files.push(...walk(join(ROOT, 'dist'), ['.html']));
  let failures = 0;
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (ALLOWED.has(rel)) continue;
    const hits = findForbidden(readFileSync(f, 'utf8'), words);
    if (hits.length) {
      failures++;
      console.error(`T-06 FAIL ${rel}: ${hits.join(', ')}`);
    }
  }
  if (failures) process.exit(1);
  console.log(`T-06 ok: ${files.length} files without forbidden words`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
