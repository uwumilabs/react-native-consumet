import { useCallback, useEffect, useRef, useState } from 'react';
import type { ISearch } from 'react-native-consumet';
import { errorText } from '../media';
import { useLatestCall } from './useLatestCall';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 650;

/**
 * The search box's text. `search` runs with the trimmed query 650 ms after the last keystroke, or at
 * once on `submit`, when it has at least 2 characters; `clear` runs when it gets shorter. A query
 * already searched on submit isn't searched again when the timer fires.
 */
export function useSearchBox(search: (query: string) => void, clear: () => void) {
  const [query, setQuery] = useState('');
  const searched = useRef('');

  const run = useCallback(
    (q: string) => {
      searched.current = q;
      search(q);
    },
    [search]
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      searched.current = '';
      clear();
      return;
    }
    const timer = setTimeout(() => {
      if (q !== searched.current) run(q);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, run, clear]);

  const submit = useCallback(() => {
    const q = query.trim();
    if (q.length >= MIN_QUERY_LENGTH) run(q);
  }, [query, run]);

  return { query, setQuery, submit, idle: query.trim().length < MIN_QUERY_LENGTH };
}

/**
 * The search box (see useSearchBox) and its results from `provider`. A response that arrives after a
 * newer search, or after the box was cleared, is dropped.
 */
export function useSearch<T>(provider: { search(query: string): Promise<ISearch<T>> } | null, logTag: string) {
  const [results, setResults] = useState<T[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calls = useLatestCall();

  const clear = useCallback(() => {
    calls.cancel();
    setResults([]);
    setSearching(false);
    setError(null);
  }, [calls]);

  const search = useCallback(
    async (q: string) => {
      if (!provider) return;
      const isCurrent = calls.start();
      setSearching(true);
      setError(null);
      try {
        const { results: found = [] } = await provider.search(q);
        if (!isCurrent()) return;
        console.log(`[${logTag}] search results`, found);
        setResults(found);
        if (!found.length) setError(`No results for "${q}"`);
      } catch (e) {
        if (isCurrent()) setError(errorText(e, 'Search failed'));
      } finally {
        if (isCurrent()) setSearching(false);
      }
    },
    [provider, calls, logTag]
  );

  const box = useSearchBox(search, clear);
  const { query } = box;
  const retry = useCallback(() => search(query.trim()), [search, query]);

  return { ...box, results, searching, error, retry };
}

export type SearchState<T> = ReturnType<typeof useSearch<T>>;
