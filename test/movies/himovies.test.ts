import { MOVIES } from '../../src/providers';

jest.setTimeout(120000);

const himovies = new MOVIES.HiMovies();

test('search: returns movies and series', async () => {
  const data = await himovies.search('vincenzo');
  expect(data.results.length).toBeGreaterThan(0);
});

test('fetchMediaInfo: returns the series with episodes', async () => {
  const data = await himovies.fetchMediaInfo('tv/watch-vincenzo-67955');
  expect(data.description).toBeTruthy();
  expect(data.episodes!.length).toBeGreaterThan(0);
});

test('fetchEpisodeSources: returns sources', async () => {
  const episodeSources = await himovies.fetchEpisodeSources('1167571', 'tv/watch-vincenzo-67955');
  expect(episodeSources.sources.length).toBeGreaterThan(0);
});

test('fetchByCountry: returns titles from that country', async () => {
  const data = await himovies.fetchByCountry('KR');
  expect(data.results.length).toBeGreaterThan(0);
});

test('fetchByGenre: returns titles of that genre', async () => {
  const data = await himovies.fetchByGenre('drama');
  expect(data.results.length).toBeGreaterThan(0);
});
