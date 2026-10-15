import fs from 'fs';
import path from 'path';
import registry from '../../src/extension-registry.json';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { AnimeParser, MovieParser, SubOrDub } from '../../src/models';
import type { AnimeProvider, MovieProvider } from '../../src/utils/provider-maps';
import AniKoto from '../../src/providers/anime/anikoto/anikoto';
import Anilist from '../../src/providers/meta/anilist';
import TMDB from '../../src/providers/meta/tmdb';

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
    expect(new TMDB(undefined, movie)).toBeInstanceOf(TMDB);
  });
});
