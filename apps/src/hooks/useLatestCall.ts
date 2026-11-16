import { useMemo, useRef } from 'react';

/**
 * Lets only the latest of one kind of async call update the screen. `start()` begins a call and
 * returns `isCurrent`, which turns false once a newer call starts or `cancel()` runs (the view
 * closed, the provider changed), so a slow response can't fill the screen of a newer one.
 */
export function useLatestCall() {
  const latest = useRef(0);
  return useMemo(
    () => ({
      start() {
        const call = ++latest.current;
        return () => call === latest.current;
      },
      cancel() {
        latest.current++;
      },
    }),
    []
  );
}
