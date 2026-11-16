import axios from 'axios';
import { AniKoto } from '../../src/providers/anime/anikoto/anikoto';
import { createAniKoto } from '../../src/providers/anime/anikoto/create-anikoto';
import { AnimePahe } from '../../src/providers/anime/animepahe/animepahe';
import { createAnimePahe } from '../../src/providers/anime/animepahe/create-animepahe';
import { AniNeko } from '../../src/providers/anime/anineko/anineko';
import { ReAnime } from '../../src/providers/anime/reanime/reanime';
import { Zoro } from '../../src/providers/anime/zoro/zoro';
import { createZoro } from '../../src/providers/anime/zoro/create-zoro';
import { HiMovies } from '../../src/providers/movies/himovies/himovies';
import { createHiMovies } from '../../src/providers/movies/himovies/create-himovies';
import { MultiMovies } from '../../src/providers/movies/multimovies/multimovies';
import { createMultiMovies } from '../../src/providers/movies/multimovies/create-multimovies';
import { createVegaMovies } from '../../src/providers/movies/vegamovies/create-vegamovies';
import { createReanime } from '../../src/providers/anime/reanime/create-reanime';
import { createAniNeko } from '../../src/providers/anime/anineko/create-anineko';
import { MultiStream } from '../../src/providers/movies/multistream/multistream';
import { DisneyMirror, NetflixMirror, PrimeMirror } from '../../src/providers/movies/netflixmirror/netflixmirror';
import {
  createDisneyMirror,
  createNetflixMirror,
  createPrimeMirror,
} from '../../src/providers/movies/netflixmirror/create-netflixmirror';
import { VegaMovies } from '../../src/providers/movies/vegamovies/vegamovies';
import { LIGHT_NOVELS } from '../../src/providers/light-novels';
import { MANGA } from '../../src/providers/manga';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { defaultAxios } from '../../src/utils/create-extractor-context';

// PROV-2: one provider pattern. Providers and extractors make their requests through the context
// they're given (ctx.axios), factories hand that context on to their extractors, and classes accept
// a context. eslint.config.mjs enforces the same rules in the source (type-only axios imports, no
// extractor factory called without a context, named exports).

/** An axios stand-in that records every request and fails it, so nothing leaves the test. */
function stubAxios(): any {
  const fail = async () => {
    throw new Error('stub axios');
  };
  return Object.assign(jest.fn(fail), { get: jest.fn(fail), post: jest.fn(fail), request: jest.fn(fail) });
}

/** URLs of every request made through a stub axios. */
const requestedUrls = (stub: any): string[] =>
  [...stub.mock.calls, ...stub.get.mock.calls, ...stub.post.mock.calls, ...stub.request.mock.calls].map(([arg]) =>
    typeof arg === 'string' ? arg : arg.url
  );

// Every request in a test must go through a stub; these catch (and block) the shared instances.
let realAxios: jest.SpyInstance[];
beforeEach(() => {
  const blocked = async () => {
    throw new Error('request made outside the context axios');
  };
  realAxios = [axios, defaultAxios].flatMap((instance) =>
    (['get', 'post', 'request'] as const).map((method) => jest.spyOn(instance, method).mockImplementation(blocked))
  );
  // Several providers log their failures; the stubs make every request fail.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

/** Extractor factories that record the context they were given and resolve a fixed source. */
function recordingExtractors(...names: string[]) {
  return Object.fromEntries(
    names.map((name) => [
      name,
      jest.fn((_ctx?: unknown) => ({
        extract: jest.fn(async () => ({ sources: [{ url: `https://cdn.test/${name}.m3u8`, isM3U8: true }] })),
      })),
    ])
  );
}

/** A real provider context whose axios and extractors are stubs. */
function stubProviderContext(...extractorNames: string[]) {
  const extractors = recordingExtractors(...extractorNames);
  const ctx = createProviderContext({ axios: stubAxios(), extractors });
  return { ctx, extractors };
}

describe('factories hand their context to their extractors (PROV-2)', () => {
  it.each([
    ['createZoro', createZoro, 'MegaCloud', 'https://megacloud.test/embed-2/e-1/abc?k=1'],
    ['createAniKoto', createAniKoto, 'MegaPlay', 'https://megaplay.test/stream/s-2/abc/sub'],
    ['createHiMovies', createHiMovies, 'MegaCloud', 'https://megacloud.test/embed-1/e-1/abc?z='],
    ['createMultiMovies', createMultiMovies, 'StreamWish', 'https://streamwish.test/e/abc'],
  ] as const)('%s calls %s with its context', async (_name, factory, extractor, embed) => {
    const { ctx, extractors } = stubProviderContext(extractor);

    const source = await (factory(ctx).fetchEpisodeSources as (url: string) => Promise<any>)(embed);

    expect(extractors[extractor]).toHaveBeenCalledWith(ctx);
    expect(source.sources[0]!.url).toBe(`https://cdn.test/${extractor}.m3u8`);
  });

  it('createAnimePahe calls Kwik with its context', async () => {
    const { ctx: base, extractors } = stubProviderContext('Kwik');
    const page = '<div id="resolutionMenu"><button data-src="https://kwik.test/e/abc">SubsPlease · 720p</button></div>';
    const makeGetRequestWithWebView = jest.fn(async () => ({ html: page }));
    const ctx = { ...base, NativeConsumet: { ...base.NativeConsumet, makeGetRequestWithWebView } } as any;

    const source = await createAnimePahe(ctx).fetchEpisodeSources('anime-session/episode-session');

    expect(extractors.Kwik).toHaveBeenCalledWith(ctx);
    expect(source.sources).toEqual([{ url: 'https://cdn.test/Kwik.m3u8', isM3U8: true, quality: '720p' }]);
  });

  it('createMultiMovies calls VidHide with its context', async () => {
    const { ctx, extractors } = stubProviderContext('VidHide');

    await createMultiMovies(ctx).fetchEpisodeSources('https://vidhide.test/e/abc', undefined, 'vidhide' as any);

    expect(extractors.VidHide).toHaveBeenCalledWith(ctx);
  });
});

describe('provider classes are their factories (PROV-2)', () => {
  const CLASSES = [
    { name: 'Zoro', Provider: Zoro, factory: createZoro },
    { name: 'AnimePahe', Provider: AnimePahe, factory: createAnimePahe },
    { name: 'AniKoto', Provider: AniKoto, factory: createAniKoto },
    { name: 'ReAnime', Provider: ReAnime, factory: createReanime },
    { name: 'AniNeko', Provider: AniNeko, factory: createAniNeko },
    { name: 'HiMovies', Provider: HiMovies, factory: createHiMovies },
    { name: 'MultiMovies', Provider: MultiMovies, factory: createMultiMovies },
    { name: 'VegaMovies', Provider: VegaMovies, factory: createVegaMovies },
    { name: 'NetflixMirror', Provider: NetflixMirror, factory: createNetflixMirror },
    { name: 'PrimeMirror', Provider: PrimeMirror, factory: createPrimeMirror },
    { name: 'DisneyMirror', Provider: DisneyMirror, factory: createDisneyMirror },
  ] as { name: string; Provider: new (...args: any[]) => any; factory: (ctx: any, baseUrl?: string) => any }[];

  it.each(CLASSES)('$name has everything its factory returns', ({ Provider, factory }) => {
    const { ctx } = stubProviderContext();
    const provider = new Provider(ctx, 'https://mirror.test');
    const expected = factory(ctx, 'https://mirror.test');

    for (const [key, value] of Object.entries(expected)) {
      expect([key, typeof provider[key]]).toEqual([key, typeof value]);
    }
    expect(provider.toString.baseUrl).toBe('https://mirror.test');
  });

  it.each(CLASSES)('$name still takes (customBaseURL) alone', ({ Provider }) => {
    expect(new Provider('https://mirror.test').toString.baseUrl).toBe('https://mirror.test');
    expect(new Provider().toString.baseUrl).toMatch(/^https:\/\/(?!mirror\.test)/);
  });

  it('Zoro sends its extractor calls through the given context', async () => {
    const { ctx, extractors } = stubProviderContext('MegaCloud');

    await new Zoro(ctx).fetchEpisodeSources('https://megacloud.test/embed-2/e-1/abc');

    expect(extractors.MegaCloud).toHaveBeenCalledWith(ctx);
  });
});

describe('class-based providers use the context axios (PROV-2)', () => {
  const LEGACY_PROVIDERS = [
    ...Object.entries(MANGA).map(([name, Provider]) => [`MANGA.${name}`, Provider]),
    ...Object.entries(LIGHT_NOVELS).map(([name, Provider]) => [`LIGHT_NOVELS.${name}`, Provider]),
  ] as [string, new (ctx?: any) => any][];

  it.each(LEGACY_PROVIDERS)('%s searches through ctx.axios', async (_name, Provider) => {
    const { ctx } = stubProviderContext();

    await new Provider(ctx).search('one piece').catch(() => undefined);

    expect(requestedUrls(ctx.axios).length).toBeGreaterThan(0);
    for (const spy of realAxios) expect(spy).not.toHaveBeenCalled();
  });

  it('class-based providers default to the library context', async () => {
    await new MANGA.MangaPill().search('one piece').catch(() => undefined);

    expect(defaultAxios.get).toHaveBeenCalledWith('https://mangapill.com/search?q=one%20piece');
  });

  it('MultiStream searches and lists servers through ctx.axios', async () => {
    const { ctx } = stubProviderContext();
    const multiStream = new MultiStream(ctx);

    await multiStream.search('dune').catch(() => undefined);
    await multiStream.fetchEpisodeServers('438631$movie').catch(() => undefined);

    const urls = requestedUrls(ctx.axios);
    expect(urls[0]).toMatch(/^https:\/\/api\.themoviedb\.org\/3\/search\/multi\?/);
    expect(urls.length).toBeGreaterThan(1);
    for (const spy of realAxios) expect(spy).not.toHaveBeenCalled();
  });

  it('MultiStream takes (ctx, customBaseURL) and still takes (customBaseURL), and ignores the base URL', () => {
    // It has no site of its own: titles come from TMDB, streams from several embed sites.
    const { ctx } = stubProviderContext();
    expect(new MultiStream(ctx, 'https://mirror.test').toString.baseUrl).toBe('https://www.themoviedb.org');
    expect(new MultiStream('mirror.test').toString.baseUrl).toBe('https://www.themoviedb.org');
    expect(new MultiStream().toString.baseUrl).toBe('https://www.themoviedb.org');
  });
});
