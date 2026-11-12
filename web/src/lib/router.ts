import {useEffect, useState} from 'react';

// Hash routing: works on any static host without server rewrites.
export interface Route {
  path: string;
  params: string[];
  query: URLSearchParams;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean).map((s) => decodeURIComponent(s));
  return {path: segments[0] ?? '', params: segments.slice(1), query: new URLSearchParams(queryPart)};
}

export function href(path: string, ...params: Array<string | number>): string {
  const tail = params.map((p) => encodeURIComponent(String(p))).join('/');
  return `#/${path}${tail ? `/${tail}` : ''}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({top: 0});
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
