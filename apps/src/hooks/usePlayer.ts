import { useCallback, useRef, useState } from 'react';
import type { IEpisodeServer, ISource } from 'react-native-consumet';
import { errorText } from '../media';
import { useLatestCall } from './useLatestCall';

/** What the player plays. */
type Stream = { url: string; headers?: Record<string, string>; isM3U8: boolean };

/** How to load an episode: its servers, then the sources of one of them. */
type EpisodeLoader = {
  servers(): Promise<IEpisodeServer[]>;
  sources(server: string | undefined): Promise<ISource>;
};

const qualityNumber = (quality?: string) => parseInt(quality ?? '', 10) || 0;

/** The source with the highest quality number ('1080p' over '720p'; 'auto' counts as 0). */
function bestStream({ sources, headers }: ISource): Stream {
  if (!sources?.length) throw new Error('No video sources returned');
  const best = sources.reduce((a, b) => (qualityNumber(b.quality) > qualityNumber(a.quality) ? b : a));
  return { url: best.url, headers, isM3U8: best.isM3U8 ?? false };
}

/**
 * The full-screen player. `play` loads an episode's servers, then the sources of the first one (or
 * of the one picked with `selectServer`), and plays the best source; `show` plays a stream as it
 * is. `retry` loads the same server again, or plays a stream given to `show` again. A load that
 * finishes after a newer one, or after `close`, is dropped.
 */
export function usePlayer(logTag: string) {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servers, setServers] = useState<IEpisodeServer[]>([]);
  const [server, setServer] = useState<string | null>(null);
  const loader = useRef<EpisodeLoader | null>(null);
  const calls = useLatestCall();

  const load = useCallback(
    async (from: EpisodeLoader, pick?: string) => {
      const isCurrent = calls.start();
      setOpen(true);
      setStream(null);
      setError(null);
      setLoading(true);
      try {
        let name = pick;
        if (name === undefined) {
          setServers([]);
          setServer(null);
          const list = await from.servers();
          if (!isCurrent()) return;
          console.log(`[${logTag}] episode servers`, list);
          setServers(list);
          name = list[0]?.name;
        }
        setServer(name ?? null);
        const source = await from.sources(name);
        if (!isCurrent()) return;
        console.log(`[${logTag}] episode sources`, source);
        setStream(bestStream(source));
      } catch (e) {
        if (isCurrent()) setError(errorText(e, 'Failed to load video'));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [calls, logTag]
  );

  const play = useCallback(
    (from: EpisodeLoader) => {
      loader.current = from;
      load(from);
    },
    [load]
  );

  const selectServer = useCallback(
    (name: string) => {
      if (loader.current && name !== server) load(loader.current, name);
    },
    [load, server]
  );

  // Without a server (listing the servers failed), the servers are listed again. A stream from
  // `show` has no loader: clearing the error mounts the player again, which reloads it.
  const retry = useCallback(() => {
    if (loader.current) load(loader.current, server ?? undefined);
    else setError(null);
  }, [load, server]);

  const show = useCallback(
    (direct: Stream) => {
      calls.cancel();
      loader.current = null;
      setServers([]);
      setServer(null);
      setError(null);
      setLoading(false);
      setStream(direct);
      setOpen(true);
    },
    [calls]
  );

  const close = useCallback(() => {
    calls.cancel();
    setOpen(false);
    setStream(null);
    setError(null);
    setLoading(false);
    setServers([]);
    setServer(null);
  }, [calls]);

  const videoFailed = useCallback(
    (event: { error?: unknown }) => {
      console.log(`[${logTag}] video error`, JSON.stringify(event));
      setError(JSON.stringify(event.error ?? event));
    },
    [logTag]
  );

  const videoLoaded = useCallback((event: unknown) => console.log(`[${logTag}] video loaded`, event), [logTag]);

  return {
    open,
    stream,
    loading,
    error,
    servers,
    server,
    play,
    selectServer,
    retry,
    show,
    close,
    videoFailed,
    videoLoaded,
  };
}

export type Player = ReturnType<typeof usePlayer>;
