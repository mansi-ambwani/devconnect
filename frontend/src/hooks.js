import { useEffect, useState } from 'react';

/** Runs an async loader and tracks { data, error, loading }. Re-runs when deps change. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | DevConnect` : 'DevConnect';
  }, [title]);
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const readingTime = (text = '') => Math.max(1, Math.round(text.split(/\s+/).length / 220));
