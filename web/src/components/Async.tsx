import {useEffect, useState, type DependencyList, type ReactNode} from 'react';
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
  if (state.status === 'loading') return <Spinner label={label} />;
  if (state.status === 'error') return <Banner status="error" title="No se pudieron cargar los datos" description={state.error} />;
  return <>{children(state.data)}</>;
}
