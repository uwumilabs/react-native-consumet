import axios from 'axios';
import { META, MOVIES } from '../../src/providers';

jest.setTimeout(120000);

// run: yarn test --watch --verbose false tmdb.test.ts

const tmdb = new META.TMDB();

test('returns a filled array of movie list', async () => {
  const data = await tmdb.search('the flash');
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of trending movie list', async () => {
  const data = await tmdb.fetchTrending('movie');
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of trending tv-series list', async () => {
  const data = await tmdb.fetchTrending('TV Series');
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of trending people list', async () => {
  const data = await tmdb.fetchTrending('People');
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of all trending list', async () => {
  const data = await tmdb.fetchTrending('all');
  expect(data.results).not.toEqual([]);
});

test('returns a filled object of anime data', async () => {
  const data = await tmdb.fetchMediaInfo('85937', 'tv');
  expect(data).not.toBeNull();
  expect(data.episodes).not.toEqual([]);
  expect(data.description).not.toBeNull();
});

test('returns a filled array of servers', async () => {
  const data = await tmdb.fetchEpisodeServers(
    '2899',
    'tv/watch-the-flash-39535'
  );
  expect(data).not.toEqual([]);
});

test('returns a filled object of episode sources', async () => {
  const data = await tmdb.fetchEpisodeSources(
    '2899',
    'tv/watch-the-flash-39535'
  );
  expect(data.sources).not.toEqual([]);
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
  let firstEpisodeId: string | undefined;

  test(`fetchMediaInfo: maps ${title} to provider episodes across every season`, async () => {
    const info = await tmdb.fetchMediaInfo(tmdbId, 'tv');

    expect(info.title).toBe(title);
    expect(info.id).toBeTruthy();
    expect(info.id).not.toBe(tmdbId);
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
    firstEpisodeId = mapped[0].id;
  });

  test('fetchEpisodeSources: plays a mapped episode', async () => {
    expect(firstEpisodeId).toBeTruthy();
    const data = await tmdb.fetchEpisodeSources(firstEpisodeId!);
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.sources[0]!.url).not.toContain('in=unknown');
  });
});

test('TMDB with NetflixMirror: maps a movie to its provider episode', async () => {
  const tmdb = new META.TMDB(undefined, new MOVIES.NetflixMirror());
  const info = await tmdb.fetchMediaInfo('559969', 'movie'); // El Camino: A Breaking Bad Movie
  expect(info.title).toBe('El Camino: A Breaking Bad Movie');
  expect(info.episodeId).toBeTruthy();
  expect(info.seasons![0]!.episodes![0]!.id).toBe(info.episodeId);
});

test('TMDB with VegaMovies: maps every Breaking Bad season from a multi-season post', async () => {
  const tmdb = new META.TMDB(undefined, new MOVIES.VegaMovies());
  const info = await tmdb.fetchMediaInfo('1396', 'tv');

  expect(info.id).toBe('download-breaking-bad-season-1-5');
  expect(info.seasons).toHaveLength(5);
  for (const season of info.seasons as any[]) {
    expect(season.episodes.length).toBeGreaterThan(0);
    expect(season.episodes.every((e: any) => e.id && e.url)).toBe(true);
  }
});
