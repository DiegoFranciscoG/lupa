import {useState} from 'react';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {getJson, type Meta, type Panorama} from '../lib/data';
import {fmtInt, fmtUsd, fmtUsdShort} from '../lib/format';
import {href} from '../lib/router';
import {Loaded, useAsync} from '../components/Async';
import {Post, type FeedPost} from '../components/Post';
import {SITE} from '../content/site';

const TABS: Array<{value: string; label: string; match: (p: FeedPost) => boolean}> = [
  {value: 'todo', label: 'Destacado', match: () => true},
  {value: 'precios', label: 'Precios', match: (p) => p.indicador === 'PRECIO_ATIPICO'},
  {value: 'fragmentacion', label: 'Bajo el límite', match: (p) => p.indicador === 'FRAGMENTACION'},
  {value: 'concentracion', label: 'Concentración', match: (p) => p.indicador === 'CONCENTRACION'},
  {value: 'nuevos', label: 'Proveedores nuevos', match: (p) => p.indicador === 'PROVEEDOR_NUEVO'},
];

/** Interleaves posts of every indicator so the home feed is not a wall of one kind. */
export function interleave(posts: FeedPost[]): FeedPost[] {
  const groups = new Map<string, FeedPost[]>();
  for (const p of posts) groups.set(p.indicador, [...(groups.get(p.indicador) ?? []), p]);
  const queues = [...groups.values()];
  const out: FeedPost[] = [];
  while (queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

export function InicioPage() {
  const [tab, setTab] = useState('todo');
  const state = useAsync(
    () => Promise.all([getJson<FeedPost[]>('feed.json'), getJson<Panorama>('panorama.json'), getJson<Meta>('meta.json')]),
    [],
  );
  return (
    <div className="feed-plain">
      <header className="feed-head">
        <h1>Inicio</h1>
        <p className="lead">{SITE.tagline}</p>
        <div className="tabs-bar">
          <TabList value={tab} onChange={setTab} layout="fill" hasDivider={false}>
            {TABS.map((t) => (
              <Tab key={t.value} value={t.value} label={t.label} />
            ))}
          </TabList>
        </div>
      </header>
      <Loaded state={state}>
        {([feed, pano, meta]) => {
          const last = pano.por_anio.filter((r) => r.anio < new Date().getFullYear()).at(-1) ?? pano.por_anio.at(-1);
          const posts = tab === 'todo' ? interleave(feed) : feed.filter(TABS.find((t) => t.value === tab)!.match);
          return (
            <>
              {tab === 'todo' && last ? (
                <section className="pinned" aria-label="Resumen">
                  <p className="kicker">
                    Fijado. Datos del SERCOP hasta el {meta.datos_hasta ?? meta.snapshot_fecha}, actualizados el {meta.snapshot_fecha}{' '}
                    (instantánea {meta.snapshot_id}). Se revisan cada semana.
                  </p>
                  <div className="big-figure">{fmtUsdShort(last.monto)}</div>
                  <p className="post-text">
                    adjudicados por el Estado en {last.anio} ({fmtUsd(last.monto)}), en {fmtInt(last.adjudicaciones)} adjudicaciones. En
                    total, {fmtInt(meta.procesos)} procesos desde {meta.anios[0]}.
                  </p>
                  <div className="post-actions">
                    <a href={href('cifras')}>Ver todas las cifras</a>
                    <a href={href('precios')}>Comparar precios</a>
                  </div>
                </section>
              ) : null}
              <p className="visually-hidden">{SITE.signalNotice}</p>
              {posts.map((p, i) => (
                <Post key={`${p.indicador}-${p.ocid ?? p.entidad_id}-${i}`} p={p} />
              ))}
              <p className="pinned post-text">{SITE.signalNotice}</p>
            </>
          );
        }}
      </Loaded>
    </div>
  );
}
