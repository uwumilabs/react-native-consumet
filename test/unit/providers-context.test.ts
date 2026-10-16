import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as Extractors from '../../src/extractors';
import { AniKoto } from '../../src/providers/anime/anikoto/anikoto';
import { createAniKoto } from '../../src/providers/anime/anikoto/create-anikoto';
import { AnimeKai } from '../../src/providers/anime/animekai/animekai';
import { createAnimeKai } from '../../src/providers/anime/animekai/create-animekai';
import { AnimePahe } from '../../src/providers/anime/animepahe/animepahe';
import { createAnimePahe } from '../../src/providers/anime/animepahe/create-animepahe';
import { AnimeUnity } from '../../src/providers/anime/animeunity';
import { AniNeko } from '../../src/providers/anime/anineko/anineko';
import { ReAnime } from '../../src/providers/anime/reanime/reanime';
import { Zoro } from '../../src/providers/anime/zoro/zoro';
import { createZoro } from '../../src/providers/anime/zoro/create-zoro';
import { HiMovies } from '../../src/providers/movies/himovies/himovies';
import { createHiMovies } from '../../src/providers/movies/himovies/create-himovies';
import { MultiMovies } from '../../src/providers/movies/multimovies/multimovies';
import { createMultiMovies } from '../../src/providers/movies/multimovies/create-multimovies';
import { MultiStream } from '../../src/providers/movies/multistream';
import { DisneyMirror } from '../../src/providers/movies/netflixmirror/disneymirror';
import { NetflixMirror } from '../../src/providers/movies/netflixmirror/netflixmirror';
import { PrimeMirror } from '../../src/providers/movies/netflixmirror/primemirror';
import { VegaMovies } from '../../src/providers/movies/vegamovies/vegamovies';
import { YFlix } from '../../src/providers/movies/yflix/yflix';
import { createYFlix } from '../../src/providers/movies/yflix/create-yflix';
import { LIGHT_NOVELS } from '../../src/providers/light-novels';
import { MANGA } from '../../src/providers/manga';
import { ReadManga } from '../../src/providers/manga/readmanga';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { animeProviders, movieProviders } from '../../src/utils/provider-maps';
import { defaultAxios, defaultExtractorContext } from '../../src/utils/extension-utils';
import { PolyURL } from '../../src/utils/url-polyfill';

// PROV-2: one provider pattern. Providers and extractors make their requests through the context
// they're given (ctx.axios), factories hand that context on to their extractors, classes accept a
// context, and every module exports by name.

const repoRoot = path.join(__dirname, '../..');

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

/** Source files under the given directories of src/. */
function sourceFiles(...dirs: string[]): string[] {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return /\.tsx?$/.test(entry.name) ? [path.relative(repoRoot, full)] : [];
    });
  return dirs.flatMap((dir) => walk(path.join(repoRoot, 'src', dir)));
}

const read = (file: string) => fs.readFileSync(path.join(repoRoot, file), 'utf8');

/** Provider directories this pattern applies to; src/providers/meta follows its own. */
const PROVIDER_DIRS = ['providers/anime', 'providers/movies', 'providers/manga', 'providers/light-novels'];

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

const LEGACY_EXTRACTORS = [
  'AsianLoad',
  'Filemoon',
  'GogoCDN',
  'MixDrop',
  'Mp4Player',
  'Mp4Upload',
  'RapidCloud',
  'StreamHub',
  'StreamLare',
  'StreamSB',
  'StreamTape',
  'VidMoly',
  'VizCloud',
  'Voe',
] as const;

describe('class-based extractors use the context axios (PROV-2)', () => {
  it.each(LEGACY_EXTRACTORS)('%s sends its requests through ctx.axios', async (name) => {
    const ctx = { ...defaultExtractorContext, axios: stubAxios() };
    const extractor: any = new Extractors[name](ctx);

    await extractor
      .extract(new URL('https://host.test/e/abc?id=1'), 'https://helper.test', 'api-key')
      .catch(() => undefined);

    expect(requestedUrls(ctx.axios).length).toBeGreaterThan(0);
    for (const spy of realAxios) expect(spy).not.toHaveBeenCalled();
  });

  it('defaults to the library context', async () => {
    await new Extractors.MixDrop().extract(new URL('https://host.test/e/abc')).catch(() => undefined);

    expect(defaultAxios.get).toHaveBeenCalledWith('https://host.test/e/abc');
  });

  it('MegaUp fetches the subtitle list through ctx.axios', async () => {
    const ctx = { ...defaultExtractorContext, axios: stubAxios() };
    const embed = 'https://megaup.test/e/abc?sub.list=https%3A%2F%2Fsubs.test%2Flist.json';

    await expect(Extractors.MegaUp(ctx).extract(new PolyURL(embed))).rejects.toThrow('stub axios');

    expect(requestedUrls(ctx.axios)).toEqual(['https://subs.test/list.json']);
    for (const spy of realAxios) expect(spy).not.toHaveBeenCalled();
  });

  it.each(['../../src/extractors/gogocdn', '../../src/extractors', '../../src/utils/extension-utils'])(
    'defaultExtractors has every extractor when %s loads first',
    (first) => {
      jest.isolateModules(() => {
        require(first);
        const { defaultExtractors } = require('../../src/utils/extension-utils');
        for (const [name, extractor] of Object.entries(defaultExtractors)) {
          expect([name, typeof extractor]).toEqual([name, 'function']);
        }
      });
    }
  );
});

/** Extractor factories that record the context they were given and resolve a fixed source. */
function recordingExtractors(...names: string[]) {
  return Object.fromEntries(
    names.map((name) => [
      name,
      jest.fn((_ctx?: unknown) => ({
        serverName: name,
        sources: [],
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
    ['createAnimeKai', createAnimeKai, 'MegaUp', 'https://megaup.test/e/abc'],
    ['createAniKoto', createAniKoto, 'MegaPlay', 'https://megaplay.test/stream/s-2/abc/sub'],
    ['createHiMovies', createHiMovies, 'MegaCloud', 'https://megacloud.test/embed-1/e-1/abc?z='],
    ['createYFlix', createYFlix, 'MegaUp', 'https://megaup.test/e/abc'],
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

  it.each(PROVIDER_DIRS)('no provider in %s calls an extractor without a context', (dir) => {
    const offenders = sourceFiles(dir).filter((file) => /\b[A-Z]\w*\(\)\.extract\(/.test(read(file)));
    expect(offenders).toEqual([]);
  });
});

describe('class wrappers accept a context (PROV-2)', () => {
  const WRAPPERS = [
    { name: 'Zoro', Wrapper: Zoro, factory: 'anime/zoro/create-zoro#createZoro' },
    { name: 'AnimePahe', Wrapper: AnimePahe, factory: 'anime/animepahe/create-animepahe#createAnimePahe' },
    { name: 'AnimeKai', Wrapper: AnimeKai, factory: 'anime/animekai/create-animekai#createAnimeKai' },
    { name: 'AniKoto', Wrapper: AniKoto, factory: 'anime/anikoto/create-anikoto#createAniKoto' },
    { name: 'ReAnime', Wrapper: ReAnime, factory: 'anime/reanime/create-reanime#createReanime' },
    { name: 'AniNeko', Wrapper: AniNeko, factory: 'anime/anineko/create-anineko#createAniNeko' },
    { name: 'HiMovies', Wrapper: HiMovies, factory: 'movies/himovies/create-himovies#createHiMovies' },
    { name: 'MultiMovies', Wrapper: MultiMovies, factory: 'movies/multimovies/create-multimovies#createMultiMovies' },
    { name: 'YFlix', Wrapper: YFlix, factory: 'movies/yflix/create-yflix#createYFlix' },
    { name: 'VegaMovies', Wrapper: VegaMovies, factory: 'movies/vegamovies/create-vegamovies#createVegaMovies' },
    { name: 'NetflixMirror', Wrapper: NetflixMirror, factory: 'movies/netflixmirror/create-netflixmirror#createNetflixMirror' },
    { name: 'PrimeMirror', Wrapper: PrimeMirror, factory: 'movies/netflixmirror/create-netflixmirror#createPrimeMirror' },
    { name: 'DisneyMirror', Wrapper: DisneyMirror, factory: 'movies/netflixmirror/create-netflixmirror#createDisneyMirror' },
  ] as { name: string; Wrapper: new (...args: any[]) => any; factory: string }[];

  /** Spies on (and still calls) the factory a wrapper builds its instance with. */
  const spyOnFactory = (factory: string) => {
    const [file, name] = factory.split('#') as [string, string];
    return jest.spyOn(require(`../../src/providers/${file}`), name);
  };

  it.each(WRAPPERS)('$name passes (ctx, customBaseURL) to its factory', ({ Wrapper, factory }) => {
    const spy = spyOnFactory(factory);
    const { ctx } = stubProviderContext();

    const provider = new Wrapper(ctx, 'https://mirror.test');

    expect(spy).toHaveBeenCalledWith(ctx, 'https://mirror.test');
    expect(provider.toString.baseUrl).toBe('https://mirror.test');
  });

  it.each(WRAPPERS)('$name still takes (customBaseURL) alone', ({ Wrapper }) => {
    expect(new Wrapper('https://mirror.test').toString.baseUrl).toBe('https://mirror.test');
    expect(new Wrapper().toString.baseUrl).toMatch(/^https:\/\/(?!mirror\.test)/);
  });

  it('Zoro sends its extractor calls through the given context', async () => {
    const { ctx, extractors } = stubProviderContext('MegaCloud');

    await new Zoro(ctx).fetchEpisodeSources('https://megacloud.test/embed-2/e-1/abc');

    expect(extractors.MegaCloud).toHaveBeenCalledWith(ctx);
  });

  it('AniNeko exposes every method of its factory', () => {
    const aniNeko: any = new AniNeko();
    for (const method of ['fetchRecentlyUpdated', 'fetchNewReleases', 'fetchRecentlyAdded', 'genreSearch']) {
      expect([method, typeof aniNeko[method]]).toEqual([method, 'function']);
    }
  });
});

describe('class-based providers use the context axios (PROV-2)', () => {
  const LEGACY_PROVIDERS = [
    ...Object.entries(MANGA).map(([name, Provider]) => [`MANGA.${name}`, Provider]),
    ['ReadManga', ReadManga],
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

  it('MultiStream takes (ctx, customBaseURL) and still takes (customBaseURL)', () => {
    const { ctx } = stubProviderContext();
    expect(new MultiStream(ctx, 'https://mirror.test').toString.baseUrl).toBe('https://mirror.test');
    expect(new MultiStream('mirror.test').toString.baseUrl).toBe('http://mirror.test');
    expect(new MultiStream().toString.baseUrl).toBe('https://rivestream.org');
  });

  it('AnimeUnity searches through ctx.axios', async () => {
    const { ctx } = stubProviderContext();

    await new AnimeUnity(ctx).search('naruto').catch(() => undefined);

    expect(requestedUrls(ctx.axios)).toEqual(['https://www.animeunity.to/archivio?title=naruto']);
    for (const spy of realAxios) expect(spy).not.toHaveBeenCalled();
  });
});

describe('one export style (PROV-2)', () => {
  const VALUE_AXIOS_IMPORT = /^import\s+(?!type\b)[^;]*?from\s+'axios'/m;
  // Default exports that src/providers/meta and two unit tests still import (other lanes own them).
  const DEFAULT_EXPORTS_STILL_IMPORTED = [
    'src/providers/anime/anikoto/anikoto.ts',
    'src/providers/anime/animekai/animekai.ts',
    'src/providers/anime/animepahe/animepahe.ts',
    'src/providers/anime/zoro/zoro.ts',
    'src/providers/movies/himovies/himovies.ts',
    'src/providers/manga/mangasee123.ts',
  ].map((file) => path.normalize(file));

  it.each(['extractors', ...PROVIDER_DIRS])('%s import axios only for its types', (dir) => {
    const offenders = sourceFiles(dir).filter((file) => VALUE_AXIOS_IMPORT.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it.each(['extractors', ...PROVIDER_DIRS])('%s export by name', (dir) => {
    const offenders = sourceFiles(dir)
      .filter((file) => /^export default\b/m.test(read(file)))
      .filter((file) => !DEFAULT_EXPORTS_STILL_IMPORTED.includes(file));
    expect(offenders).toEqual([]);
  });

  it.each([
    ['anime', animeProviders],
    ['movies', movieProviders],
  ])('provider-maps resolves every %s class by name', (_category, providers) => {
    for (const [name, Provider] of Object.entries(providers)) {
      expect([name, typeof Provider, (Provider as any)?.name]).toEqual([name, 'function', name]);
    }
  });
});
