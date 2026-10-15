import { useEffect, useState } from 'react';

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [s, set] = useState<{ data: T | null; error: Error | null; loading: boolean }>({
    data: null, error: null, loading: true,
  });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    set((p) => ({ ...p, loading: true, error: null }));
    fn().then(
      (d) => alive && set({ data: d, error: null, loading: false }),
      (e) => alive && set({ data: null, error: e, loading: false }),
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...s, reload: () => setN((x) => x + 1) };
}
