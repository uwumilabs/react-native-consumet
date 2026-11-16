import axios from 'axios';
import { META, MOVIES } from '../../src/providers';
import { expectMediaSearch, expectServers, expectSources } from '../unit/helpers/media-contract';

jest.setTimeout(120000);

// Without a provider, TMDB maps titles to HiMovies.
const tmdb = new META.TMDB();

test('search finds movies and series', async () => {
  const data = await tmdb.search('the flash');

  expectMediaSearch(data);
  expect(data.results.map((result) => String(result.id))).toContain('60735');
});

test.each(['movie', 'TV Series', 'all'])('fetchTrending(%s) returns a page of titles', async (type) => {
  expectMediaSearch(await tmdb.fetchTrending(type));
});

test('fetchTrending(People) returns people', async () => {
  const { results } = await tmdb.fetchTrending('People');

  expect(results.length).toBeGreaterThan(0);
  expect(results.filter((person: any) => !person.id || !person.name)).toEqual([]);
});

test('fetchMediaInfo maps a series to the provider, whose servers and sources play an episode', async () => {
  const info = await tmdb.fetchMediaInfo('60735', 'tv'); // The Flash (2014)
  expect(info.title).toBe('The Flash');
  expect(info.providerId).toMatch(/\S/);

  const episode = info.seasons!.flatMap((season) => season.episodes).find((e) => e.id)!;
  expect(episode).toBeDefined();
  expectServers(await tmdb.fetchEpisodeServers(episode.id!, info.providerId));
  expectSources(await tmdb.fetchEpisodeSources(episode.id!, info.providerId));
});

// A multi-season lookup makes one TMDB request per season; retry dropped connections per
// request so a single reset doesn't fail the whole mapping check.
axios.interceptors.response.use(undefined, (error) => {
  const config = error?.config;
  if (!config || !/ECONNRESET|ETIMEDOUT|socket hang up/i.test(String(error.message))) throw error;
  config.__retries = (config.__retries ?? 0) + 1;
  if (config.__retries > 5) throw error;
  return axios.request(config);
});

describe.each([
  { label: 'NetflixMirror', make: () => new MOVIES.NetflixMirror(), tmdbId: '1396', title: 'Breaking Bad' },
  { label: 'PrimeMirror', make: () => new MOVIES.PrimeMirror(), tmdbId: '76479', title: 'The Boys' },
  { label: 'DisneyMirror', make: () => new MOVIES.DisneyMirror(), tmdbId: '84958', title: 'Loki' },
])('TMDB with $label', ({ make, tmdbId, title }) => {
  const tmdb = new META.TMDB(undefined, make());

  test(`maps ${title} to provider episodes across every season, and plays one`, async () => {
    const info = await tmdb.fetchMediaInfo(tmdbId, 'tv');

    expect(info.title).toBe(title);
    expect(info.id).toBe(tmdbId);
    expect(info.providerId).toMatch(/\S/);
    expect(info.totalSeasons).toBeGreaterThan(1);
    expect(info.seasons).toHaveLength(info.totalSeasons as number);
    (info.seasons as any[]).forEach((season, index) =>
      expect(season).toEqual(
        expect.objectContaining({ season: index + 1, isReleased: expect.any(Boolean), episodes: expect.any(Array) })
      )
    );

    const today = new Date().toISOString().slice(0, 10);
    const aired = (info.seasons as any[]).flatMap((s) => s.episodes ?? []).filter((e) => e.releaseDate && e.releaseDate <= today);
    const mapped = aired.filter((e) => e.id);
    expect(mapped.length / aired.length).toBeGreaterThanOrEqual(0.9);
    for (const ep of mapped) {
      expect(ep).toEqual(
        expect.objectContaining({ id: expect.any(String), url: expect.any(String), season: expect.any(Number), episode: expect.any(Number) })
      );
    }

    const sources = await tmdb.fetchEpisodeSources(mapped[0].id);
    expectSources(sources);
    expect(sources.sources[0]!.url).not.toContain('in=unknown');
  });
});

test('TMDB with NetflixMirror: maps a movie to its provider episode', async () => {
  const tmdb = new META.TMDB(undefined, new MOVIES.NetflixMirror());
  const info = await tmdb.fetchMediaInfo('559969', 'movie'); // El Camino: A Breaking Bad Movie
  expect(info.title).toBe('El Camino: A Breaking Bad Movie');
  expect(info.episodeId).toMatch(/\S/);
  expect(info.seasons![0]!.episodes![0]!.id).toBe(info.episodeId);
});

test('TMDB with VegaMovies: maps every Breaking Bad season from a multi-season post', async () => {
  const tmdb = new META.TMDB(undefined, new MOVIES.VegaMovies());
  const info = await tmdb.fetchMediaInfo('1396', 'tv');

  expect(info.id).toBe('1396');
  expect(info.providerId).toBe('download-breaking-bad-season-1-5');
  expect(info.seasons).toHaveLength(5);
  for (const season of info.seasons as any[]) {
    expect(season.episodes.length).toBeGreaterThan(0);
    expect(season.episodes.filter((e: any) => !e.id || !e.url)).toEqual([]);
  }
});
