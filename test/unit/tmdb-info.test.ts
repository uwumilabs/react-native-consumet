import TMDB from '../../src/providers/meta/tmdb';
import { TvType } from '../../src/models';
import type { IMovieEpisode, IMovieInfo, IMovieProvider, IMovieSeason } from '../../src/models/types';
import { metaHttp } from '../../src/utils/meta-http';
import show from './fixtures/tmdb/tv-84958.json';
import season1 from './fixtures/tmdb/tv-84958-season-1.json';
import season2 from './fixtures/tmdb/tv-84958-season-2.json';
import movie from './fixtures/tmdb/movie-559969.json';

// Recorded TMDB responses (trimmed): Loki (tv 84958, 2 seasons, 2021) and
// El Camino: A Breaking Bad Movie (movie 559969, 2019).
const SHOW_ID = '84958';
const MOVIE_ID = '559969';

const stubTmdb = (overrides: Record<string, unknown> = {}) =>
  jest.spyOn(metaHttp, 'get').mockImplementation(async (url: string) => {
    const path = new URL(url).pathname.replace('/3/', '');
    const responses: Record<string, unknown> = {
      [`tv/${SHOW_ID}`]: show,
      [`tv/${SHOW_ID}/season/1`]: season1,
      [`tv/${SHOW_ID}/season/2`]: season2,
      [`movie/${MOVIE_ID}`]: movie,
      ...overrides,
    };
    if (!(path in responses)) throw new Error(`unexpected request: ${path}`);
    return { data: responses[path] } as any;
  });

const fakeProvider = (results: Record<string, unknown>[], info?: Record<string, unknown>) => {
  const provider = {
    name: 'Fake',
    search: jest.fn().mockResolvedValue({ currentPage: 1, hasNextPage: false, results }),
    fetchMediaInfo: jest.fn().mockResolvedValue(info),
    fetchEpisodeSources: jest.fn(),
    fetchEpisodeServers: jest.fn(),
  };
  return provider as typeof provider & IMovieProvider;
};

const lokiEpisodes = [
  { id: 'loki-s1e1', number: 1, season: 1, url: 'https://provider.example/loki/s1e1' },
  { id: 'loki-s1e2', number: 2, season: 1, url: 'https://provider.example/loki/s1e2' },
  { id: 'loki-s2e1', number: 1, season: 2, url: 'https://provider.example/loki/s2e1' },
];

// Typed as IMovieInfo without a cast, as apps use it (checked by `tsc -p test/tsconfig.json`).
const fetchInfo = (provider: IMovieProvider, id: string, type: string): Promise<IMovieInfo> =>
  new TMDB(undefined, provider).fetchMediaInfo(id, type);

const allEpisodes = (info: IMovieInfo) => (info.seasons ?? []).flatMap((s) => s.episodes);

afterEach(() => jest.restoreAllMocks());

describe('TMDB.fetchMediaInfo provider matching (META-5)', () => {
  it('returns TMDB info and every season without a provider id when the provider has no match', async () => {
    stubTmdb();
    const provider = fakeProvider([{ id: 'tv/other', title: 'Lost', type: TvType.TVSERIES }]);

    const info = await fetchInfo(provider, SHOW_ID, 'tv');

    expect(info.id).toBe(SHOW_ID);
    expect(info.providerId).toBeUndefined();
    expect(info.title).toBe('Loki');
    expect(info.mappings).toEqual({ imdb: 'tt9140554', tmdb: 84958 });
    expect(info.seasons).toHaveLength(2);
    expect(info.seasons!.map((s) => s.episodes?.length)).toEqual([6, 6]);
    expect(allEpisodes(info).every((e) => e.id === undefined && e.url === undefined)).toBe(true);
    expect(info.seasons![1]!.episodes![0]).toEqual(
      expect.objectContaining({ uniqueId: `${SHOW_ID}-tv-s2-e1`, title: season2.episodes[0]!.name, season: 2 })
    );
    expect(provider.fetchMediaInfo).not.toHaveBeenCalled();
  });

  it('returns TMDB info when the provider search finds nothing', async () => {
    stubTmdb();
    const info = await fetchInfo(fakeProvider([]), SHOW_ID, 'tv');

    expect(info.id).toBe(SHOW_ID);
    expect(info.providerId).toBeUndefined();
    expect(info.seasons).toHaveLength(2);
  });

  it('returns TMDB info when the provider fails, treating it as no match', async () => {
    stubTmdb();
    const provider = fakeProvider([]);
    provider.search.mockRejectedValue(new Error('Cloudflare challenge'));

    const info = await fetchInfo(provider, SHOW_ID, 'tv');

    expect(info.id).toBe(SHOW_ID);
    expect(info.providerId).toBeUndefined();
    expect(info.seasons).toHaveLength(2);
  });

  it('keeps the TMDB id and returns the provider id in its own field on a match', async () => {
    stubTmdb();
    const provider = fakeProvider(
      [
        { id: 'tv/lost', title: 'Lost', type: TvType.TVSERIES, releaseDate: '2004', seasons: 6 },
        { id: 'tv/loki', title: 'Loki', type: TvType.TVSERIES, releaseDate: '2021', seasons: 2 },
      ],
      { id: 'tv/loki', title: 'Loki', episodes: lokiEpisodes }
    );

    const info = await fetchInfo(provider, SHOW_ID, 'tv');

    expect(info.id).toBe(SHOW_ID);
    expect(info.providerId).toBe('tv/loki');
    expect(provider.fetchMediaInfo).toHaveBeenCalledWith('tv/loki');
    const [s1, s2] = info.seasons!;
    expect(s1!.episodes!.slice(0, 3).map((e) => e.id)).toEqual(['loki-s1e1', 'loki-s1e2', undefined]);
    expect(s1!.episodes![0]!.url).toBe('https://provider.example/loki/s1e1');
    expect(s2!.episodes![0]!.id).toBe('loki-s2e1');
    // uniqueId is built from the TMDB id, so it doesn't change with the provider.
    expect(s2!.episodes![0]!.uniqueId).toBe(`${SHOW_ID}-tv-s2-e1`);
  });

  it('returns the seasons when the matched provider has no episodes', async () => {
    stubTmdb();
    const provider = fakeProvider([{ id: 'tv/loki', title: 'Loki', type: TvType.TVSERIES }], {
      id: 'tv/loki',
      title: 'Loki',
      episodes: [],
    });

    const info = await fetchInfo(provider, SHOW_ID, 'tv');

    expect(info.providerId).toBe('tv/loki');
    expect(info.seasons).toHaveLength(2);
    expect(allEpisodes(info)).toHaveLength(12);
  });

  it('matches a provider whose search results have no seasons, type or year', async () => {
    stubTmdb();
    const provider = fakeProvider(
      [
        // Known season count far from TMDB's 2: dropped.
        { id: 'tv/loki-anthology', title: 'Loki', type: TvType.TVSERIES, seasons: 9 },
        { id: 'download-loki-season-1-2', title: 'Loki' },
      ],
      { id: 'download-loki-season-1-2', title: 'Loki', episodes: lokiEpisodes }
    );

    const info = await fetchInfo(provider, SHOW_ID, 'tv');

    expect(info.providerId).toBe('download-loki-season-1-2');
    expect(info.seasons![0]!.episodes![0]!.id).toBe('loki-s1e1');
  });

  it('drops results of the other type', async () => {
    stubTmdb();
    const provider = fakeProvider([{ id: 'movie/loki', title: 'Loki', type: TvType.MOVIE, releaseDate: '2021' }]);

    const info = await fetchInfo(provider, SHOW_ID, 'tv');

    expect(info.providerId).toBeUndefined();
  });

  describe('year', () => {
    const elCamino = (id: string, releaseDate?: string) => ({
      id,
      title: 'El Camino: A Breaking Bad Movie',
      type: TvType.MOVIE,
      releaseDate,
    });
    const movieInfo = (id: string) => ({ id, title: movie.title, episodes: [{ id: `${id}-play`, url: `u/${id}` }] });

    it('accepts a provider year one off from TMDB', async () => {
      stubTmdb();
      const provider = fakeProvider([elCamino('movie/el-camino', '2020')], movieInfo('movie/el-camino'));

      const info = await fetchInfo(provider, MOVIE_ID, 'movie');

      expect(info.id).toBe(MOVIE_ID);
      expect(info.providerId).toBe('movie/el-camino');
      expect(info.episodeId).toBe('movie/el-camino-play');
      expect(info.seasons![0]!.episodes![0]!.id).toBe('movie/el-camino-play');
    });

    it('prefers the exact year, then one off, then an unknown year', async () => {
      stubTmdb();
      const results = [
        elCamino('movie/unknown-year'),
        elCamino('movie/off-by-one', '2018-05-01'),
        elCamino('movie/exact', '2019'),
      ];
      const provider = fakeProvider(results, movieInfo('movie/exact'));
      await fetchInfo(provider, MOVIE_ID, 'movie');
      expect(provider.fetchMediaInfo).toHaveBeenCalledWith('movie/exact');

      const withoutExact = fakeProvider(results.slice(0, 2), movieInfo('movie/off-by-one'));
      await fetchInfo(withoutExact, MOVIE_ID, 'movie');
      expect(withoutExact.fetchMediaInfo).toHaveBeenCalledWith('movie/off-by-one');
    });

    it('rejects a provider year more than one off and still returns the TMDB movie', async () => {
      stubTmdb();
      const provider = fakeProvider([elCamino('movie/el-camino-2021', '2021')]);

      const info = await fetchInfo(provider, MOVIE_ID, 'movie');

      expect(info.id).toBe(MOVIE_ID);
      expect(info.providerId).toBeUndefined();
      expect(info.episodeId).toBeUndefined();
      expect(info.title).toBe('El Camino: A Breaking Bad Movie');
      expect(info.seasons![0]!.episodes![0]).toEqual(
        expect.objectContaining({ id: undefined, uniqueId: `${MOVIE_ID}-movie-s1-e1` })
      );
      expect(provider.fetchMediaInfo).not.toHaveBeenCalled();
    });
  });
});

describe('TMDB.fetchMediaInfo episode shape (META-6)', () => {
  const still = (path: string) => ({
    mobile: `https://image.tmdb.org/t/p/w300${path}`,
    hd: `https://image.tmdb.org/t/p/w780${path}`,
  });

  it('sets number (and the older episode field) on every TV episode', async () => {
    stubTmdb();
    const info = await fetchInfo(fakeProvider([]), SHOW_ID, 'tv');

    const tmdbEpisodes = [...season1.episodes, ...season2.episodes];
    expect(allEpisodes(info).map((e) => [e.season, e.number, e.episode])).toEqual(
      tmdbEpisodes.map((e) => [e.season_number, e.episode_number, e.episode_number])
    );
  });

  it('sets number on the single movie episode', async () => {
    stubTmdb();
    const info = await fetchInfo(fakeProvider([]), MOVIE_ID, 'movie');

    expect(info.seasons).toHaveLength(1);
    expect(info.seasons![0]!.episodes).toEqual([
      expect.objectContaining({ number: 1, episode: 1, season: 1, title: movie.title, id: undefined }),
    ]);
  });

  it('gives episodes and seasons { mobile, hd } images from TMDB stills and posters', async () => {
    stubTmdb();
    const info = await fetchInfo(fakeProvider([]), SHOW_ID, 'tv');

    const [s1] = info.seasons!;
    expect(s1!.image).toEqual(still(season1.poster_path));
    expect(s1!.episodes[0]!.image).toEqual(still(season1.episodes[0]!.still_path));
  });

  it('returns an empty episode list for a season TMDB has no episodes for', async () => {
    stubTmdb({
      [`tv/${SHOW_ID}/season/1`]: { ...season1, episodes: [] },
      [`tv/${SHOW_ID}/season/2`]: { season_number: 2, poster_path: null },
    });
    const info = await fetchInfo(fakeProvider([]), SHOW_ID, 'tv');

    expect(info.seasons!.map((s) => s.episodes)).toEqual([[], []]);
    expect(info.seasons![1]!.image).toBeUndefined();
  });

  it('returns the fields apps read with their declared types', async () => {
    stubTmdb();
    const provider = fakeProvider([{ id: 'tv/loki', title: 'Loki', type: TvType.TVSERIES }], {
      id: 'tv/loki',
      title: 'Loki',
      episodes: lokiEpisodes,
    });
    const info = await fetchInfo(provider, SHOW_ID, 'tv');

    // `tsc -p test/tsconfig.json` (not jest) rejects these lines if the movie types lack the fields.
    const providerId: string | undefined = info.providerId;
    const imdb: string | undefined = info.mappings?.imdb;
    const totalSeasons: number | undefined = info.totalSeasons;
    const character: string | undefined = info.characters?.[0]?.character;
    const season: IMovieSeason = info.seasons![0]!;
    const isReleased: boolean | undefined = season.isReleased;
    const episode: IMovieEpisode = season.episodes[0]!;
    const episodeId: string | undefined = episode.id;
    const number: number | undefined = episode.number;

    expect({ providerId, imdb, totalSeasons, character, isReleased, episodeId, number }).toEqual({
      providerId: 'tv/loki',
      imdb: 'tt9140554',
      totalSeasons: 2,
      character: 'Loki Laufeyson',
      isReleased: true,
      episodeId: 'loki-s1e1',
      number: 1,
    });
    expect(info.trailer).toEqual({
      id: 'R6o1UWEBVQA',
      site: 'YouTube',
      url: 'https://www.youtube.com/watch?v=R6o1UWEBVQA',
    });
    expect(info.nextAiringEpisode).toBeUndefined();
  });

  it('leaves trailer unset when TMDB has no videos', async () => {
    stubTmdb({ [`movie/${MOVIE_ID}`]: { ...movie, videos: { results: [] } } });
    const info = await fetchInfo(fakeProvider([]), MOVIE_ID, 'movie');

    expect(info.trailer).toBeUndefined();
    expect(info.duration).toBe(123);
  });
});
