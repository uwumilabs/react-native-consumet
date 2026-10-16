import { readFileSync } from 'fs';
import { join } from 'path';
import Myanimelist from '../../src/providers/meta/mal';
import { metaHttp } from '../../src/utils/meta-http';

// Recorded MAL search page (trimmed) for anime.php?q=Tom%20%26%20Jerry%20%231.
const QUERY = 'Tom & Jerry #1';
const page = readFileSync(join(__dirname, 'fixtures/mal/search-tom-and-jerry-1.html'), 'utf8');

const fakeProvider = () => ({
  name: 'FakeProvider',
  search: jest.fn(),
  fetchAnimeInfo: jest.fn(),
  fetchEpisodeSources: jest.fn(),
  fetchEpisodeServers: jest.fn(),
});

afterEach(() => jest.restoreAllMocks());

describe('Myanimelist search query encoding (META-8)', () => {
  it('sends a query with &, # and spaces as one query parameter', async () => {
    const request = jest.spyOn(metaHttp, 'request').mockResolvedValue({ data: page });

    const result = await new Myanimelist(fakeProvider() as any).search(QUERY, 2);

    const url = new URL(request.mock.calls[0]![0].url!);
    expect(url.pathname).toBe('/anime.php');
    expect(url.hash).toBe('');
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: QUERY, cat: 'anime', show: '50' });
    expect(result.results.map((r) => [r.id, r.title, r.totalEpisodes])).toEqual([
      ['53907', 'Tom to Jerry Gokko', 30],
      ['50001', 'Tom to Jerry', 1],
    ]);
  });
});
