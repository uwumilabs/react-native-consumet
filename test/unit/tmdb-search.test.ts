import TMDB from '../../src/providers/meta/tmdb';
import { MultiStream } from '../../src/providers/movies/multistream/multistream';
import { metaHttp } from '../../src/utils/meta-http';
import { defaultAxios } from '../../src/utils/create-extractor-context';
import { createProviderContext } from '../../src/utils/create-provider-context';
import movie from './fixtures/tmdb/movie-559969.json';
import search from './fixtures/tmdb/search-multi-tom-and-jerry-1.json';
import trendingAll from './fixtures/tmdb/trending-all-week.json';
import trendingPeople from './fixtures/tmdb/trending-person-day.json';
import { fakeMovieProvider } from './helpers/fake-providers';

// Recorded TMDB responses (trimmed): search/multi?query=Tom%20%26%20Jerry%20%231, trending/all/week
// and trending/person/day.
const QUERY = 'Tom & Jerry #1';

const noProvider = fakeMovieProvider();

afterEach(() => jest.restoreAllMocks());

describe('TMDB search query encoding (META-8)', () => {
  it('sends a query with &, # and spaces as one query parameter', async () => {
    const get = jest.spyOn(metaHttp, 'get').mockResolvedValue({ data: search });

    const result = await new TMDB('test-key', noProvider).search(QUERY, 2);

    const url = new URL(get.mock.calls[0]![0]);
    expect(url.pathname).toBe('/3/search/multi');
    expect(url.hash).toBe('');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      api_key: 'test-key',
      language: 'en-US',
      page: '2',
      include_adult: 'false',
      query: QUERY,
    });
    expect(result.results.map((r) => r.title)).toEqual([
      'Tom & Jerry: Tales - Vol. 1',
      'Tom Und Jerry Die Classic Collection 1',
      "Tom & Jerry's 50th Birthday Classics Vol.1",
    ]);
  });
});

describe('TMDB search and trending release years (META-10)', () => {
  const tmdb = () => new TMDB('test-key', noProvider);
  const respond = (data: unknown) => jest.spyOn(metaHttp, 'get').mockResolvedValue({ data });

  it('gives the release year, or no releaseDate when TMDB has no date (not "NaN")', async () => {
    respond(search);
    const result = await tmdb().search(QUERY);

    // The second result's release_date is "".
    expect(result.results.map((r) => r.releaseDate)).toEqual(['2009', undefined, '1990']);
  });

  it('gives first air years for shows and release years for movies in trending', async () => {
    respond(trendingAll);
    const result = await tmdb().fetchTrending('all', 'week');

    expect(result.results.map((r) => [r.title, r.releaseDate])).toEqual([
      ['LINK CLICK', '2021'],
      ['Matchbox the Movie', '2026'],
    ]);
  });

  it('returns trending people, which TMDB no longer sends with known_for', async () => {
    respond(trendingPeople);
    const result = await tmdb().fetchTrending('people');

    expect(result.results).toEqual([
      expect.objectContaining({ id: '510', name: 'Tim Burton', movies: [] }),
      expect.objectContaining({ id: '22226', name: 'Paul Rudd', movies: [] }),
    ]);
  });

  it("gives the years of a person's known_for titles", async () => {
    const [person] = trendingPeople.results;
    respond({
      ...trendingPeople,
      results: [{ ...person, known_for: [search.results[0], { ...trendingAll.results[0], first_air_date: '' }] }],
    });
    const result = await tmdb().fetchTrending('people');

    const movies = (result.results[0] as { movies: { releaseDate?: string }[] }).movies;
    expect(movies.map((m) => m.releaseDate)).toEqual(['2009', undefined]);
  });
});

describe('MultiStream (META-10)', () => {
  const multiStream = () => new MultiStream(undefined, undefined, 'test-key');

  it('encodes its TMDB search query as TMDB does, and gives the release year or none, never "NaN"', async () => {
    // Without a context, MultiStream sends its requests through the library's defaultAxios.
    const get = jest.spyOn(defaultAxios, 'get').mockResolvedValue({ data: search });

    const { results } = await multiStream().search(QUERY);

    const url = new URL(get.mock.calls[0]![0] as string);
    expect(url.hash).toBe('');
    expect(url.searchParams.get('query')).toBe(QUERY);
    expect(url.searchParams.get('include_adult')).toBe('false');
    expect(results.map((r) => [r.id, r.releaseDate])).toEqual([
      ['975700$movie', '2009'],
      ['892582$movie', undefined],
      ['1509162$movie', '1990'],
    ]);
  });

  it('gives recommendations ids that fetchMediaInfo accepts', async () => {
    const get = jest.spyOn(defaultAxios, 'get').mockResolvedValue({ data: movie });

    const info = await multiStream().fetchMediaInfo(`${movie.id}$movie`);
    const [recommendation] = info.recommendations!;
    await multiStream().fetchMediaInfo(recommendation!.id);

    expect(recommendation!.id).toBe(`${movie.recommendations.results[0]!.id}$movie`);
    expect(new URL(get.mock.calls[1]![0] as string).pathname).toBe(`/3/movie/${movie.recommendations.results[0]!.id}`);
    expect(info.episodes).toEqual([expect.objectContaining({ id: `${movie.id}$movie`, number: 1 })]);
  });

  it('asks each site once for an episode\'s sources, as for its servers', async () => {
    const ctx = createProviderContext();
    const get = jest.spyOn(ctx.axios, 'get').mockRejectedValue(new Error('offline'));
    jest.spyOn(ctx.axios, 'post').mockRejectedValue(new Error('offline'));
    const provider = new MultiStream(ctx, undefined, 'test-key');

    await provider.fetchEpisodeServers('559969$movie');
    const perScrape = get.mock.calls.length;
    get.mockClear();
    // Every site fails; videasy still lists its servers, none of which has a source.
    await expect(provider.fetchEpisodeSources('559969$movie')).rejects.toThrow(
      'No sources found for server: videasy-neon-org'
    );

    expect(perScrape).toBeGreaterThan(0);
    expect(get).toHaveBeenCalledTimes(perScrape);
  });
});
