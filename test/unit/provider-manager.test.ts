import fs from 'fs';
import path from 'path';
import registry from '../../src/extension-registry.json';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { AnimeParser, MovieParser } from '../../src/models';
import type { KnownAnimeProviderId, KnownMovieProviderId } from '../../src/utils/ProviderManager';
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
  it.each(['anineko', 'anikoto'])('loads %s by its registry id as an AnimeParser, bundled class or not', async (id) => {
    const provider = await new ProviderManager(registry as any).getAnimeProvider(id);

    expect(Object.getPrototypeOf(provider)).toBe(AnimeParser.prototype);
    expect(typeof provider.fetchEpisodeServers).toBe('function');
  });

  it('gives movie providers the MovieParser prototype', async () => {
    const provider = await new ProviderManager(registry as any).getMovieProvider('netflixmirror');
    expect(provider).toBeInstanceOf(MovieParser);
  });

  it('hands registry-loaded providers to the meta providers', async () => {
    const manager = new ProviderManager(registry as any);

    const anime = await manager.executeProviderCode(readPublished(entry('anikoto').main), entry('anikoto') as any);
    expect(new Anilist(anime).provider).toBe(anime);

    const movie = await manager.executeProviderCode(readPublished(entry('vegamovies').main), entry('vegamovies') as any);
    expect(() => new TMDB('test-key', movie)).not.toThrow();
  });

  it('autocompletes exactly the anime and movie ids of the bundled registry', () => {
    // Each Record must name every member of its union, so these lists follow the types.
    const anime: Record<KnownAnimeProviderId, true> = { animepahe: true, anikoto: true, anineko: true };
    const movies: Record<KnownMovieProviderId, true> = {
      vegamovies: true,
      netflixmirror: true,
      primemirror: true,
      disneymirror: true,
    };
    const idsOf = (category: string) =>
      registry.extensions.filter((e) => e.category === category).map((e) => e.id).sort();

    expect(Object.keys(anime).sort()).toEqual(idsOf('anime'));
    expect(Object.keys(movies).sort()).toEqual(idsOf('movies'));
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
    const provider: any = await new ProviderManager(probeRegistry).executeProviderCode(code, manifest);
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
