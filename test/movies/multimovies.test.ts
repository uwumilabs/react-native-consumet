import { MOVIES } from '../../src/providers';

jest.setTimeout(120000);

const multimovies = new MOVIES.MultiMovies();

test('search: returns movies and series', async () => {
  const data = await multimovies.search('jujutsu kaisen');
  expect(data.results.length).toBeGreaterThan(0);
});

test('fetchMediaInfo: returns the series with genres, trailer, cast and episodes', async () => {
  const data = await multimovies.fetchMediaInfo('tvshows/jujutsu-kaisen/');
  expect(data.title).toBeTruthy();
  expect(data.genres!.length).toBeGreaterThan(0);
  expect(data.trailer?.url).toBeTruthy();
  expect(data.characters!.length).toBeGreaterThan(0);
  expect(data.episodes!.length).toBeGreaterThan(0);
});

test('fetchEpisodeServers: returns the servers of an episode', async () => {
  const data = await multimovies.fetchEpisodeServers('episodes/jujutsu-kaisen-1x1/');
  expect(data.length).toBeGreaterThan(0);
});

test('fetchEpisodeSources: returns sources of an episode', async () => {
  const data = await multimovies.fetchEpisodeSources('episodes/jujutsu-kaisen-1x1/');
  expect(data.sources.length).toBeGreaterThan(0);
});

test('fetchPopular: returns titles that fetchMediaInfo can open', async () => {
  const data = await multimovies.fetchPopular();
  expect(data.results.length).toBeGreaterThan(0);
  expect(data.results[0]!.id).toMatch(/^(movies|tvshows)\//);
});
