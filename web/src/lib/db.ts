// DuckDB-Wasm in the browser. The database engine is the backend: it reads the published
// Parquet files over HTTP range requests, so only the blocks a query needs are downloaded.
import * as duckdb from '@duckdb/duckdb-wasm';
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import {dataUrl, getJson} from './data';
import {setEngineState} from './engine';

export type Row = Record<string, unknown>;

/** Single-file tables published by the pipeline. */
export const SINGLE_TABLES: Record<string, string> = {
  entidades: 'entidades.parquet',
  proveedores: 'proveedores.parquet',
  senales: 'senales.parquet',
  concentracion: 'concentracion.parquet',
  precio_grupo: 'precio_grupo.parquet',
  grafo_nodos: 'grafo_nodos.parquet',
  grafo_adjudico: 'grafo_adjudico.parquet',
  grafo_compitio: 'grafo_compitio.parquet',
  procedimientos: 'procedimientos.parquet',
};

/** Small tables loaded whole into memory once: later filters need no network round trips. */
export const BUFFERED_TABLES: Record<string, string> = {
  senales_top: 'senales_top.parquet',
};

/** Tables split by year (one file per year). */
export const PARTITIONED_TABLES = ['adjudicaciones', 'items', 'procesos'] as const;

let instance: Promise<duckdb.AsyncDuckDBConnection> | null = null;

/** Builds `CREATE VIEW` statements for every published table. Exported for tests. */
export function viewStatements(files: string[], toUrl: (p: string) => string): string[] {
  const out: string[] = [];
  const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;
  for (const [name, file] of Object.entries(SINGLE_TABLES)) {
    out.push(`CREATE OR REPLACE VIEW ${name} AS SELECT * FROM read_parquet(${quote(toUrl(file))})`);
  }
  for (const [name, file] of Object.entries(BUFFERED_TABLES)) {
    out.push(`CREATE OR REPLACE VIEW ${name} AS SELECT * FROM read_parquet(${quote(file)})`);
  }
  for (const table of PARTITIONED_TABLES) {
    const parts = files.filter((f) => f.startsWith(`${table}/`)).map((f) => quote(toUrl(f)));
    if (parts.length > 0) {
      out.push(`CREATE OR REPLACE VIEW ${table} AS SELECT * FROM read_parquet([${parts.join(', ')}], union_by_name = true)`);
    }
  }
  return out;
}

async function init(): Promise<duckdb.AsyncDuckDBConnection> {
  const bundle = await duckdb.selectBundle({
    mvp: {mainModule: mvpWasm, mainWorker: mvpWorker},
    eh: {mainModule: ehWasm, mainWorker: ehWorker},
  });
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  const conn = await db.connect();
  // Cache Parquet footers between queries: fewer round trips on slow connections.
  for (const setting of ['SET enable_http_metadata_cache = true', 'PRAGMA enable_object_cache']) {
    try {
      await conn.query(setting);
    } catch {
      // Older engines may not know a setting; queries still work without the cache.
    }
  }
  for (const file of Object.values(BUFFERED_TABLES)) {
    const res = await fetch(dataUrl(file));
    if (!res.ok) throw new Error(`No se pudo leer ${file} (HTTP ${res.status})`);
    await db.registerFileBuffer(file, new Uint8Array(await res.arrayBuffer()));
  }
  const files = await getJson<string[]>('files.json');
  for (const stmt of viewStatements(files, dataUrl)) await conn.query(stmt);
  return conn;
}

export function connection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (!instance) {
    setEngineState('loading');
    instance = init().then(
      (c) => {
        setEngineState('ready');
        return c;
      },
      (e) => {
        instance = null;
        setEngineState('error');
        throw e;
      },
    );
  }
  return instance;
}

function normalize(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (value && typeof value === 'object' && 'toJSON' in (value as object)) return (value as {toJSON: () => unknown}).toJSON();
  return value;
}

function toRows(table: {toArray: () => Array<{toJSON: () => Row}>}): Row[] {
  return table.toArray().map((r) => {
    const o = r.toJSON();
    for (const k of Object.keys(o)) o[k] = normalize(o[k]);
    return o;
  });
}

/** Parameterized query: user input always goes through `?` placeholders, never string concatenation. */
export async function query(sql: string, params: unknown[] = []): Promise<Row[]> {
  const conn = await connection();
  if (params.length === 0) return toRows(await conn.query(sql));
  const stmt = await conn.prepare(sql);
  try {
    return toRows(await stmt.query(...params));
  } finally {
    await stmt.close();
  }
}

/** Free SQL from the console page. It runs only inside the visitor's browser. */
export async function runConsole(sql: string, limit = 1000): Promise<{rows: Row[]; columns: string[]; truncated: boolean}> {
  const conn = await connection();
  const table = await conn.query(sql);
  const all = toRows(table);
  const columns = table.schema.fields.map((f) => f.name);
  return {rows: all.slice(0, limit), columns, truncated: all.length > limit};
}
