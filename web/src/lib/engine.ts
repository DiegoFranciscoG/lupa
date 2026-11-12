// Lightweight engine status store. Kept apart from db.ts so the first view does not load
// the DuckDB-Wasm module just to know whether it is ready.
export type EngineState = 'idle' | 'loading' | 'ready' | 'error';

let engineState: EngineState = 'idle';
const listeners = new Set<() => void>();

export function setEngineState(next: EngineState): void {
  engineState = next;
  for (const l of listeners) l();
}

export function getEngineState(): EngineState {
  return engineState;
}

export function subscribeEngine(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Starts the engine in the background after the first view, so the next page that needs it
 * opens fast. Skipped when the visitor asked to save data or is on a slow connection.
 */
export function warmUpWhenIdle(delayMs = 3000): () => void {
  const conn = (navigator as Navigator & {connection?: {saveData?: boolean; effectiveType?: string}}).connection;
  if (conn?.saveData || (conn?.effectiveType && conn.effectiveType !== '4g')) return () => undefined;
  const id = window.setTimeout(() => {
    void import('./db').then((m) => m.connection()).catch(() => undefined);
  }, delayMs);
  return () => window.clearTimeout(id);
}
