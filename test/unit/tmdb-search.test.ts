import TMDB from '../../src/providers/meta/tmdb';
import { MultiStream } from '../../src/providers/movies/multistream';
import type { IMovieProvider } from '../../src/models/types';
import { metaHttp } from '../../src/utils/meta-http';
import { defaultAxios } from '../../src/utils/extension-utils';
import search from './fixtures/tmdb/search-multi-tom-and-jerry-1.json';
import trendingAll from './fixtures/tmdb/trending-all-week.json';
import trendingPeople from './fixtures/tmdb/trending-person-day.json';

// Recorded TMDB responses (trimmed): search/multi?query=Tom%20%26%20Jerry%20%231, trending/all/week
// and trending/person/day.
const QUERY = 'Tom & Jerry #1';

const noProvider = {
  name: 'Fake',
  search: jest.fn(),
  fetchMediaInfo: jest.fn(),
  fetchEpisodeSources: jest.fn(),
  fetchEpisodeServers: jest.fn(),
} as unknown as IMovieProvider;

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
    expect(result.results.map((r) => r.title)).toEqual(search.results.map((r) => r.title));
  });

  it('MultiStream encodes its TMDB search query the same way', async () => {
    // Without a context, MultiStream sends its requests through the library's defaultAxios.
    const get = jest.spyOn(defaultAxios, 'get').mockResolvedValue({ data: search });

    const result = await new MultiStream(undefined, undefined, 'test-key').search(QUERY);

    const url = new URL(get.mock.calls[0]![0] as string);
    expect(url.hash).toBe('');
    expect(url.searchParams.get('query')).toBe(QUERY);
    expect(url.searchParams.get('include_adult')).toBe('false');
    expect(result.results.map((r) => r.id)).toEqual(search.results.map((r) => `${r.id}$movie`));
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
      expect.objectContaining({ id: 510, name: 'Tim Burton', movies: [] }),
      expect.objectContaining({ id: 22226, name: 'Paul Rudd', movies: [] }),
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
