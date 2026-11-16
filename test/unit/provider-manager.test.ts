import fs from 'fs';
import path from 'path';
import registry from '../../src/extension-registry.json';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { AnimeParser, MovieParser } from '../../src/models';
import type { KnownAnimeProviderId, KnownMovieProviderId } from '../../src/utils/ProviderManager';
import Anilist from '../../src/providers/meta/anilist';
import TMDB from '../../src/providers/meta/tmdb';
import { serveFiles } from './helpers/registry';

const readPublished = (main: string) =>
  fs.readFileSync(path.join(__dirname, '../..', main.replace(/.*\/refs\/heads\/[^/]+\//, '')), 'utf8');

// Registry URLs are served from the committed published files, so loading stays offline.
beforeEach(() => serveFiles(readPublished));
afterEach(() => jest.restoreAllMocks());

describe('registry ids and prototypes (EXT-2)', () => {
  it.each([
    ['anime', 'anineko', AnimeParser],
    ['anime', 'anikoto', AnimeParser],
    ['movies', 'netflixmirror', MovieParser],
  ] as const)('loads the %s provider %s by its registry id with its base parser prototype', async (category, id, Base) => {
    const provider = await new ProviderManager(registry as any).getProvider(category, id);

    expect(Object.getPrototypeOf(provider)).toBe(Base.prototype);
    expect(typeof provider.fetchEpisodeServers).toBe('function');
  });

  it('hands registry-loaded providers to the meta providers', async () => {
    const manager = new ProviderManager(registry as any);

    const anime = await manager.getAnimeProvider('anikoto');
    expect(new Anilist(anime).provider).toBe(anime);

    const movie = await manager.getMovieProvider('vegamovies');
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
