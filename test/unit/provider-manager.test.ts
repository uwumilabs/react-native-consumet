import fs from 'fs';
import path from 'path';
import registry from '../../src/extension-registry.json';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { AnimeParser, MovieParser, SubOrDub } from '../../src/models';
import type { AnimeProvider, MovieProvider } from '../../src/utils/provider-maps';
import AniKoto from '../../src/providers/anime/anikoto/anikoto';
import Anilist from '../../src/providers/meta/anilist';
import TMDB from '../../src/providers/meta/tmdb';
import { sha256Hex } from '../../src/utils/extension-integrity';

const readPublished = (main: string) =>
  fs.readFileSync(path.join(__dirname, '../..', main.replace(/.*\/refs\/heads\/[^/]+\//, '')), 'utf8');

const realFetch = global.fetch;
beforeEach(() => {
  // Serve registry URLs from the committed published files, so loading stays offline.
  global.fetch = jest.fn(async (url: any) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => readPublished(String(url)),
  })) as any;
});
afterEach(() => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

const entry = (id: string) => registry.extensions.find((e) => e.id === id)!;

describe('registry ids and prototypes (EXT-2)', () => {
  it('loads a provider that has no bundled class by its registry id, as an AnimeParser', async () => {
    const provider = await new ProviderManager(registry as any).getAnimeProvider('anineko');

    expect(Object.getPrototypeOf(provider)).toBe(AnimeParser.prototype);
    expect(typeof provider.fetchEpisodeServers).toBe('function');
  });

  it('attaches the bundled class prototype when one exists, exactly once', async () => {
    const setPrototypeOf = jest.spyOn(Object, 'setPrototypeOf');

    const provider = await new ProviderManager(registry as any).loadExtension('anikoto');

    expect(provider).toBeInstanceOf(AniKoto);
    expect(setPrototypeOf.mock.calls.filter(([target]) => target === provider)).toHaveLength(1);
  });

  it('gives movie providers the MovieParser prototype', async () => {
    const provider = await new ProviderManager(registry as any).getMovieProvider('netflixmirror');
    expect(provider).toBeInstanceOf(MovieParser);
  });

  it('keeps the generic call patterns apps already use working with meta providers', async () => {
    const manager = new ProviderManager(registry as any);

    const anime = await manager.executeProviderCode<AnimeProvider>(
      readPublished(entry('anikoto').main),
      entry('anikoto').factoryName,
      entry('anikoto') as any
    );
    expect(new Anilist(anime)).toBeInstanceOf(Anilist);
    expect(typeof anime.fetchEpisodeServers).toBe('function');
    // Mirrors the app-side call signature: (episodeId, SubOrDub)
    const callServers: (id: string, dub: SubOrDub) => unknown = (id, dub) => anime.fetchEpisodeServers(id, dub);
    expect(typeof callServers).toBe('function');

    const movie = await manager.executeProviderCode<MovieProvider>(
      readPublished(entry('vegamovies').main),
      entry('vegamovies').factoryName,
      entry('vegamovies') as any
    );
    expect(new TMDB('test-key', movie)).toBeInstanceOf(TMDB);
  });
});

describe('base URL from the registry (EXT-6)', () => {
  const code = `
    function createBaseUrlProbe(ctx, customBaseURL) {
      return {
        name: 'Probe',
        baseUrl: customBaseURL,
        search: async () => ({ results: [] }),
        fetchAnimeInfo: async () => ({}),
        fetchEpisodeSources: async () => ({ sources: [] }),
        fetchEpisodeServers: async () => [],
      };
    }
    exports.createBaseUrlProbe = createBaseUrlProbe;`;
  const manifest = {
    id: 'probe',
    name: 'Probe',
    description: 'Base URL test provider',
    version: '1.0.0',
    author: { name: 'Tests' },
    category: 'anime',
    factoryName: 'createBaseUrlProbe',
    baseUrl: 'https://registry.example',
    logo: '',
    status: 'beta',
    lastUpdated: '2026-10-15T00:00:00Z',
    extractors: [],
    main: 'https://raw.githubusercontent.com/o/r/refs/heads/main/registry/extensions/probe/1.0.0.js',
    sha256: sha256Hex(code),
  } as any;
  const probeRegistry = { extensions: [manifest], extractors: [] } as any;

  beforeEach(() => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, statusText: 'OK', text: async () => code })) as any;
  });

  it("passes the entry's baseUrl to the factory", async () => {
    const provider: any = await new ProviderManager(probeRegistry).executeProviderCode(code, 'createBaseUrlProbe', manifest);
    expect(provider.baseUrl).toBe('https://registry.example');
  });

  it('lets the caller override it', async () => {
    const provider: any = await new ProviderManager(probeRegistry).getAnimeProvider('probe', {
      baseUrl: 'https://mirror.example',
    });
    expect(provider.baseUrl).toBe('https://mirror.example');
  });

  it('caches one instance per base URL', async () => {
    const manager = new ProviderManager(probeRegistry);

    const first = await manager.loadExtension('probe');
    const again = await manager.loadExtension('probe');
    const mirrored = await manager.loadExtension('probe', { baseUrl: 'https://mirror.example' });

    expect(again).toBe(first);
    expect(mirrored).not.toBe(first);
    expect((mirrored as any).baseUrl).toBe('https://mirror.example');
  });
});
