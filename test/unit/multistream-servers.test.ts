import { MultiStream } from '../../src/providers/movies/multistream/multistream';
import { ENC_DEC_API } from '../../src/providers/common/enc-dec';
import { createProviderContext } from '../../src/utils/create-provider-context';

const MOVIE = '559969$movie';

/**
 * A context whose requests reach only videasy (each server's stream is `<server path>.m3u8`) and,
 * when `hexa` is set, hexa (one source on its "Alpha" server). 111movies and vidsrc fail.
 */
const offlineExcept = ({ hexa = false } = {}) => {
  const ctx = createProviderContext({ userAgent: 'test-agent' });
  const get = jest.spyOn(ctx.axios, 'get').mockImplementation(async (url: string) => {
    if (url.startsWith('https://api.videasy.net/')) return { data: `enc:${new URL(url).pathname.split('/')[1]}` };
    if (hexa && url.startsWith('https://themoviedb.hexa.watch/')) return { data: 'enc:hexa' };
    throw new Error(`offline: ${url}`);
  });
  const post = jest.spyOn(ctx.axios, 'post').mockImplementation(async (url: string, body: any) => {
    if (url === `${ENC_DEC_API}/dec-videasy`) {
      return { data: { result: { sources: [{ url: `https://cdn.test/${body.text.slice(4)}.m3u8` }], subtitles: [] } } };
    }
    if (url === `${ENC_DEC_API}/dec-hexa`) {
      return { data: { result: { sources: [{ url: 'https://cdn.test/hexa.m3u8', server: 'Alpha' }] } } };
    }
    throw new Error(`offline: ${url}`);
  });
  const hosts = () => [...get.mock.calls, ...post.mock.calls].map(([url]) => new URL(url as string).host);
  return { provider: new MultiStream(ctx, undefined, 'test-key'), get, hosts };
};

afterEach(() => jest.restoreAllMocks());

describe('MultiStream servers', () => {
  it("names each server after its site, `<site>-<label>`, and sends the context's user agent", async () => {
    const { provider, get } = offlineExcept({ hexa: true });

    const names = (await provider.fetchEpisodeServers(MOVIE)).map((server) => server.name);

    expect(names).toContain('videasy-neon-org');
    expect(names).toContain('videasy-killjoy-ger');
    expect(names).toContain('hexa-alpha');
    expect(names.every((name) => /^(111movies|vidsrc|videasy|hexa)-/.test(name))).toBe(true);
    const hexaCall = get.mock.calls.find(([url]) => url.startsWith('https://themoviedb.hexa.watch/'));
    expect((hexaCall?.[1] as any)?.headers?.['User-Agent']).toBe('test-agent');
  });

  it("asks only the named server's site for its sources", async () => {
    const { provider, hosts } = offlineExcept();

    const source = await provider.fetchEpisodeSources(MOVIE, undefined, 'videasy-sage-org');

    expect(source.sources).toEqual([
      { url: 'https://cdn.test/1movies.m3u8', isM3U8: true, quality: 'default', name: 'videasy-sage-org' },
    ]);
    expect(new Set(hosts())).toEqual(new Set(['api.videasy.net', 'enc-dec.app']));
  });

  it("adds a videasy server's query to the one its URL already has", async () => {
    const { provider, get } = offlineExcept();

    await provider.fetchEpisodeSources(MOVIE, undefined, 'videasy-killjoy-ger');

    const urls = get.mock.calls.map(([url]) => url as string).filter((url) => url.includes('/meine/'));
    expect(urls).toContain(
      'https://api.videasy.net/meine/sources-with-title?language=german&mediaType=movie&tmdbId=559969'
    );
  });

  it("rejects with the site's own error when the one site asked fails", async () => {
    const { provider, hosts } = offlineExcept();

    await expect(provider.fetchEpisodeSources(MOVIE, undefined, 'hexa-alpha')).rejects.toThrow(
      'offline: https://themoviedb.hexa.watch/api/tmdb/movie/559969/images'
    );
    expect(new Set(hosts())).toEqual(new Set(['themoviedb.hexa.watch']));
  });

  it('rejects a server that names no site without asking any', async () => {
    const { provider, hosts } = offlineExcept();

    await expect(provider.fetchEpisodeSources(MOVIE, undefined, 'neon-org')).rejects.toThrow(
      "Server 'neon-org' not found; server names start with 111movies, vidsrc, videasy, hexa"
    );
    expect(hosts()).toEqual([]);
  });

  it('asks every site, and plays the first server, when no server is given', async () => {
    const { provider, hosts } = offlineExcept({ hexa: true });

    const source = await provider.fetchEpisodeSources(MOVIE);

    expect(source.sources[0]).toMatchObject({ name: 'videasy-neon-org' });
    expect(new Set(hosts())).toEqual(
      new Set(['111movies.com', 'vidsrc-embed.ru', 'api.videasy.net', 'themoviedb.hexa.watch', 'enc-dec.app'])
    );
  });
});
