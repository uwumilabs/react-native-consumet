import { useCallback, useState } from 'react';
import { errorText } from '../media';
import { useLatestCall } from './useLatestCall';

/**
 * The detail sheet of a search result. `open` shows the sheet for an item and loads
 * `load(provider, item)` into `detail`, `retry` loads the open item again, and `close` hides the
 * sheet. Nothing opens while `provider` is null. A load that finishes after a newer one, or after
 * `close`, is dropped. `errorFallback` is the error shown when a load throws something without a
 * message.
 */
export function useDetail<Provider, Item, Detail>(
  provider: Provider | null,
  load: (provider: Provider, item: Item) => Promise<Detail>,
  logTag: string,
  errorFallback: string
) {
  const calls = useLatestCall();
  const [selected, setSelected] = useState<Item | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(
    async (item: Item) => {
      if (!provider) return;
      const isCurrent = calls.start();
      setSelected(item);
      setDetail(null);
      setError(null);
      setLoading(true);
      try {
        const found = await load(provider, item);
        if (!isCurrent()) return;
        console.log(`[${logTag}] detail`, found);
        setDetail(found);
      } catch (e) {
        console.log(`[${logTag}] detail error`, e);
        if (isCurrent()) setError(errorText(e, errorFallback));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [provider, load, calls, logTag, errorFallback]
  );

  const retry = useCallback(() => {
    if (selected !== null) open(selected);
  }, [open, selected]);

  const close = useCallback(() => {
    calls.cancel();
    setSelected(null);
  }, [calls]);

  return { selected, detail, loading, error, open, retry, close };
}
