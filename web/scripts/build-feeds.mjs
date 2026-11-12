// Builds static RSS 2.0 feeds per entity and per company from data/export/feeds.json
// (written by sql/models/06_export.sql). Runs after `vite build`.
import {mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(here, '../../data/export/feeds.json');
const OUT = resolve(here, '../dist/rss');
const SITE_URL = (process.env.LUPA_SITE_URL ?? 'https://diegofranciscog.github.io/lupa/').replace(/\/?$/, '/');

export function xmlEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function feedSlug(id) {
  return String(id).replace(/[^A-Za-z0-9-]/g, '_');
}

const usd = new Intl.NumberFormat('es-EC', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});

export function renderFeed(feed, siteUrl = SITE_URL) {
  const kind = feed.tipo === 'entidad' ? 'entidad' : 'proveedor';
  const link = `${siteUrl}#/${kind}/${encodeURIComponent(feed.id)}`;
  const items = (feed.items ?? [])
    .map((it) => {
      const other = kind === 'entidad' ? it.proveedor : it.entidad;
      const title = `${usd.format(Number(it.monto ?? 0))} · ${it.procedimiento ?? 'Procedimiento sin dato'}`;
      const desc = `${kind === 'entidad' ? 'Proveedor' : 'Entidad'}: ${other ?? 'sin dato'}. Proceso ${it.ocid}. Fuente: SERCOP (CC BY 3.0 EC), datos transformados por LUPA.`;
      const date = it.fecha ? new Date(`${String(it.fecha).slice(0, 10)}T12:00:00Z`).toUTCString() : '';
      return `    <item>
      <title>${xmlEscape(title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">${xmlEscape(`${feed.id}:${it.ocid}`)}</guid>
      ${date ? `<pubDate>${date}</pubDate>` : ''}
      <description>${xmlEscape(desc)}</description>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(`LUPA: ${feed.nombre}`)}</title>
    <link>${xmlEscape(link)}</link>
    <description>${xmlEscape(`Últimas adjudicaciones de ${feed.nombre} según los datos abiertos del SERCOP.`)}</description>
    <language>es-ec</language>
    <copyright>Datos: SERCOP, licencia CC BY 3.0 Ecuador. Transformados por LUPA.</copyright>
${items}
  </channel>
</rss>
`;
}

function main() {
  if (!existsSync(INPUT)) {
    console.warn(`feeds: ${INPUT} not found, skipping RSS (run scripts/lupa.sh export first)`);
    return;
  }
  const feeds = JSON.parse(readFileSync(INPUT, 'utf8'));
  let n = 0;
  for (const feed of feeds) {
    const file = join(OUT, feed.tipo === 'entidad' ? 'entidad' : 'proveedor', `${feedSlug(feed.id)}.xml`);
    mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, renderFeed(feed));
    n++;
  }
  const index = {tipo: 'entidad', id: 'todas', nombre: 'todas las entidades', items: feeds.filter((f) => f.tipo === 'entidad').flatMap((f) => f.items.slice(0, 1).map((i) => ({...i, proveedor: `${f.nombre}: ${i.proveedor}`}))).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 50)};
  writeFileSync(join(OUT, 'index.xml'), renderFeed(index));
  console.log(`feeds: ${n} files written to ${OUT}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
