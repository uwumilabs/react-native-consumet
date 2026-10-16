import axios from 'axios';
import TMDB from '../../src/providers/meta/tmdb';
import MultiStream from '../../src/providers/movies/multistream';
import type { IMovieProvider } from '../../src/models/types';
import { metaHttp } from '../../src/utils/meta-http';
import search from './fixtures/tmdb/search-multi-tom-and-jerry-1.json';

// Recorded TMDB response (trimmed) for search/multi?query=Tom%20%26%20Jerry%20%231.
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
    const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: search });

    const result = await new MultiStream().search(QUERY);

    const url = new URL(get.mock.calls[0]![0] as string);
    expect(url.hash).toBe('');
    expect(url.searchParams.get('query')).toBe(QUERY);
    expect(url.searchParams.get('include_adult')).toBe('false');
    expect(result.results.map((r) => r.id)).toEqual(search.results.map((r) => `${r.id}$movie`));
  });
});
