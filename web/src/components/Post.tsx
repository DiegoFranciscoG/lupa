import {useState} from 'react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {fmtDate, fmtInt, fmtPrice, fmtUsd, fmtUsdShort, toNumber} from '../lib/format';
import {href} from '../lib/router';
import {INDICATOR_TEXT} from '../content/site';

/** One signal as published in feed.json (sql/models/06_export.sql). */
export interface FeedPost {
  indicador: string;
  ocid: string | null;
  anio: number;
  fecha: string | null;
  valor: number;
  umbral: number;
  explicacion: string;
  entidad_id: string;
  entidad: string;
  proveedor: string | null;
  proveedor_tipo: string | null;
  item: string | null;
  cpc: string | null;
  unidad: string | null;
  precio_unitario: number | null;
  mediana: number | null;
  compras: number | null;
  monto: number | null;
}

const dec1 = new Intl.NumberFormat('es-EC', {maximumFractionDigits: 1});

/** The figure in the score column and its caption, per indicator. */
export function score(p: FeedPost): {value: string; caption: string} {
  switch (p.indicador) {
    case 'PRECIO_ATIPICO':
      return {value: `${dec1.format(p.valor)}×`, caption: 'la mediana'};
    case 'CONCENTRACION':
      return {value: fmtInt(p.valor), caption: 'índice HHI'};
    case 'FRAGMENTACION':
      return {value: fmtInt(p.valor), caption: 'compras seguidas'};
    case 'PROVEEDOR_NUEVO':
      return {value: `${fmtInt(p.valor)} d`, caption: 'desde su 1.ª adjudicación'};
    default:
      return {value: fmtInt(p.valor), caption: ''};
  }
}

/** Plain-language headline: a verifiable fact, never a judgement. */
export function headline(p: FeedPost): string {
  const item = (p.item ?? '').toLowerCase();
  switch (p.indicador) {
    case 'PRECIO_ATIPICO':
      return `Pagó ${dec1.format(p.valor)} veces la mediana nacional por ${item.length > 90 ? `${item.slice(0, 89)}…` : item || 'este ítem'}`;
    case 'CONCENTRACION':
      return `Un proveedor concentró gran parte de lo que adjudicó en ${p.anio}`;
    case 'FRAGMENTACION':
      return `${fmtInt(p.valor)} adjudicaciones seguidas al mismo proveedor, cada una cerca del límite`;
    case 'PROVEEDOR_NUEVO':
      return `Adjudicación de ${fmtUsdShort(p.monto)} a un proveedor que apareció hace ${fmtInt(p.valor)} días`;
    default:
      return p.explicacion;
  }
}

export function Post({p}: {p: FeedPost}) {
  const s = score(p);
  const [copied, setCopied] = useState(false);
  const info = INDICATOR_TEXT[p.indicador];
  const implausibleNote = p.indicador === 'PRECIO_ATIPICO' && p.valor >= 10;
  const copy = async () => {
    if (!p.ocid) return;
    try {
      await navigator.clipboard.writeText(p.ocid);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <article className="post" aria-label={`${info?.title ?? p.indicador}: ${p.entidad}`}>
      <div className="score">
        <Avatar name={p.entidad} size="md" />
        <b>{s.value}</b>
        <span>{s.caption}</span>
      </div>
      <div>
        <div className="post-head">
          <a href={href('entidad', p.entidad_id)}>{p.entidad}</a>
          <span className="meta">{p.fecha ? fmtDate(p.fecha) : p.anio}</span>
        </div>
        <span className="post-kind">{info?.title ?? p.indicador}</span>
        <p className="post-title">{headline(p)}</p>
        <p className="post-text">{p.explicacion}</p>
        {implausibleNote ? (
          <p className="post-note">
            Una diferencia de este tamaño puede deberse a un error de registro en la fuente (por ejemplo, el precio total cargado como unitario). Verifica el proceso antes de sacar conclusiones.
          </p>
        ) : null}
        <ul className="chips" aria-label="Datos de la publicación">
          {p.indicador === 'PRECIO_ATIPICO' ? (
            <>
              <li>
                <em>Pagó</em> {fmtPrice(p.precio_unitario)}
              </li>
              <li>
                <em>Mediana</em> {fmtPrice(p.mediana)}
              </li>
              <li>
                <em>Comparado con</em> {fmtInt(p.compras)} compras
              </li>
              {toNumber(p.monto) ? (
                <li>
                  <em>Sobre la mediana</em> {fmtUsd(p.monto)}
                </li>
              ) : null}
            </>
          ) : (
            <>
              {toNumber(p.monto) ? (
                <li>
                  <em>Monto</em> {fmtUsd(p.monto)}
                </li>
              ) : null}
              <li>
                <em>Umbral</em> {fmtInt(p.umbral)}
              </li>
            </>
          )}
          {p.proveedor ? (
            <li>
              <em>Proveedor</em> {p.proveedor}
            </li>
          ) : null}
        </ul>
        <div className="post-actions">
          {p.indicador === 'PRECIO_ATIPICO' && p.cpc && p.unidad ? (
            <a href={href('precios', p.cpc, p.unidad, p.anio)}>Ver todas las compras</a>
          ) : null}
          <a href={href('entidad', p.entidad_id)}>Ficha de la entidad</a>
          <a href={href('metodologia')}>Cómo se calcula</a>
          {p.ocid ? (
            <button type="button" onClick={() => void copy()} aria-live="polite">
              {copied ? 'Código copiado' : 'Copiar código del proceso'}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
