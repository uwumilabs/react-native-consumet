import { MOVIES } from '../../src/providers';
import { expectMediaInfo, expectMediaSearch, expectServers, expectSources } from '../unit/helpers/media-contract';

jest.setTimeout(120000);

const himovies = new MOVIES.HiMovies();
const VINCENZO = 'tv/watch-vincenzo-67955';

test('search finds the series', async () => {
  const data = await himovies.search('vincenzo');

  expectMediaSearch(data);
  expect(data.results.map((result) => result.id)).toContain(VINCENZO);
});

test('fetchMediaInfo, servers and sources play the first episode', async () => {
  const info = await himovies.fetchMediaInfo(VINCENZO);
  expectMediaInfo(info);
  expect(info.description).toMatch(/\S/);

  const episodeId = info.episodes![0]!.id!;
  expectServers(await himovies.fetchEpisodeServers(episodeId, VINCENZO));
  expectSources(await himovies.fetchEpisodeSources(episodeId, VINCENZO));
});

test.each([
  ['fetchByCountry', () => himovies.fetchByCountry('KR')],
  ['fetchByGenre', () => himovies.fetchByGenre('drama')],
])('%s returns a page of titles', async (_name, list) => {
  expectMediaSearch(await list());
});
