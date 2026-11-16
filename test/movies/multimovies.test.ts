import { MOVIES } from '../../src/providers';
import { expectMediaInfo, expectMediaSearch, expectServers, expectSources } from '../unit/helpers/media-contract';

jest.setTimeout(120000);

const multimovies = new MOVIES.MultiMovies();
const EPISODE = 'episodes/jujutsu-kaisen-1x1/';

test('search finds the series', async () => {
  const data = await multimovies.search('jujutsu kaisen');

  expectMediaSearch(data);
  expect(data.results.map((result) => result.id)).toContain('tvshows/jujutsu-kaisen/');
});

test('fetchMediaInfo returns the series with genres, trailer, cast and episodes', async () => {
  const info = await multimovies.fetchMediaInfo('tvshows/jujutsu-kaisen/');

  expectMediaInfo(info);
  expect(info.genres!.length).toBeGreaterThan(0);
  expect(info.trailer?.url).toMatch(/^https:\/\//);
  expect(info.characters!.length).toBeGreaterThan(0);
});

test('servers and sources play an episode', async () => {
  expectServers(await multimovies.fetchEpisodeServers(EPISODE));
  expectSources(await multimovies.fetchEpisodeSources(EPISODE));
});

test('fetchPopular returns titles that fetchMediaInfo can open', async () => {
  const data = await multimovies.fetchPopular();

  expectMediaSearch(data);
  expect(data.results.filter((result) => !/^(movies|tvshows)\//.test(result.id))).toEqual([]);
});
