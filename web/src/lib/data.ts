// Small JSON aggregates produced by the pipeline (sql/models/06_export.sql).
export interface Carga {
  anio: number;
  estado: string;
  sha256: string | null;
  procesos: number | null;
  cargado: string;
}
export interface Parametro {
  codigo: string;
  descripcion: string;
  vigente_desde: string;
  vigente_hasta: string | null;
  valor: number;
  fuente_url: string;
}
export interface Umbral {
  codigo: string;
  descripcion: string;
  valor: number;
  fuente: string;
}
export interface Meta {
  snapshot_id: number;
  snapshot_fecha: string;
  metodologia_version: string;
  cargas: Carga[];
  anios: number[];
  procesos: number;
  adjudicaciones: number;
  items_con_precio: number;
  parametros: Parametro[];
  umbrales: Umbral[];
  atribucion: string;
  licencia_url: string;
}
export interface Indicador {
  indicador: string;
  nombre: string;
  origen: string;
  senales: number;
  disponibilidad: string;
}
export interface Panorama {
  por_anio: Array<{anio: number; monto: number; adjudicaciones: number}>;
  por_familia: Array<{anio: number; familia: string; monto: number; adjudicaciones: number}>;
  por_categoria: Array<{anio: number; categoria: string; monto: number}>;
  por_provincia: Array<{anio: number; provincia: string; monto: number}>;
  por_tipo_proveedor: Array<{anio: number; tipo: string; monto: number}>;
  indicadores: Indicador[];
  calidad: Array<{anio: number; tipo: string; casos: number}>;
}

const cache = new Map<string, Promise<unknown>>();

export function dataUrl(path: string): string {
  return new URL(`data/${path}`, document.baseURI).href;
}

export function getJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(dataUrl(path)).then((r) => {
        if (!r.ok) throw new Error(`No se pudo leer ${path} (HTTP ${r.status})`);
        return r.json();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

/** Sum of a numeric field grouped by a key, sorted descending. */
export function sumBy<T>(rows: T[], key: (r: T) => string, value: (r: T) => number): Array<{label: string; value: number}> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + value(r));
  return [...m.entries()].map(([label, v]) => ({label, value: v})).sort((a, b) => b.value - a.value);
}
