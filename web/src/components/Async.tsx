import {useEffect, useState, useSyncExternalStore, type DependencyList, type ReactNode} from 'react';
import {getEngineState, subscribeEngine} from '../lib/engine';
import {Spinner} from '@astryxdesign/core/Spinner';
import {Banner} from '@astryxdesign/core/Banner';

export type AsyncState<T> = {status: 'loading'} | {status: 'error'; error: string} | {status: 'ready'; data: T};

/** Runs an async loader when `deps` change and ignores results that arrive after a newer request. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({status: 'loading'});
  useEffect(() => {
    let alive = true;
    setState({status: 'loading'});
    fn().then(
      (data) => {
        if (alive) setState({status: 'ready', data});
      },
      (e: unknown) => {
        if (alive) setState({status: 'error', error: e instanceof Error ? e.message : String(e)});
      },
    );
    return () => {
      alive = false;
    };
  }, deps);
  return state;
}

export function Loaded<T>({
  state,
  children,
  label = 'Cargando datos',
}: {
  state: AsyncState<T>;
  children: (d: T) => ReactNode;
  label?: string;
}) {
  if (state.status === 'loading') return <LoadingState label={label} />;
  if (state.status === 'error') return <Banner status="error" title="No se pudieron cargar los datos" description={state.error} />;
  return <>{children(state.data)}</>;
}

/** While the in-browser engine downloads for the first time, say so: it takes a few seconds once. */
function LoadingState({label}: {label: string}) {
  const engine = useSyncExternalStore(subscribeEngine, getEngineState, getEngineState);
  return (
    <div role="status" aria-live="polite" style={{display: 'grid', gap: 8, justifyItems: 'start'}}>
      <Spinner label={label} />
      {engine === 'loading' ? (
        <p className="post-note" style={{margin: 0}}>
          Preparando el motor de consultas en tu navegador. Solo la primera vez descarga unos 8 MB; después las consultas
          responden en menos de un segundo.
        </p>
      ) : null}
    </div>
  );
}
