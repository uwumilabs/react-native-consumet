import { AniKoto } from '../../src/providers/anime/anikoto/anikoto';
import { SubOrDub } from '../../src/models';
import { expectMediaInfo, expectMediaSearch, expectServers, expectSources } from '../unit/helpers/media-contract';

jest.setTimeout(120000);

const anikoto = new AniKoto();
const ROAD_OF_NARUTO = 'road-of-naruto-ggjw8';

test('search finds the title', async () => {
  const data = await anikoto.search('Road of Naruto');

  expectMediaSearch(data);
  expect(data.results.map((result) => result.id)).toContain(ROAD_OF_NARUTO);
});

test.each([
  ['fetchTopAiring', () => anikoto.fetchTopAiring()],
  ['fetchMostPopular', () => anikoto.fetchMostPopular()],
  ['fetchLatestCompleted', () => anikoto.fetchLatestCompleted()],
  ['fetchRecentlyUpdated', () => anikoto.fetchRecentlyUpdated()],
  ['fetchMovie', () => anikoto.fetchMovie()],
  ['fetchTV', () => anikoto.fetchTV()],
  ['genreSearch', () => anikoto.genreSearch('action')],
])('%s returns a page of titles', async (_name, list) => {
  expectMediaSearch(await list());
});

test.each([
  ['fetchSpotlight', () => anikoto.fetchSpotlight()],
  ['fetchSearchSuggestions', () => anikoto.fetchSearchSuggestions('naruto')],
  ['fetchSchedule', () => anikoto.fetchSchedule(new Date().toISOString().slice(0, 10))],
])('%s returns titles', async (_name, list) => {
  expectMediaSearch({ results: await list() });
});

test('fetchGenres returns genre names', async () => {
  const genres = await anikoto.fetchGenres();

  expect(genres.length).toBeGreaterThan(0);
  expect(genres.filter((genre) => typeof genre !== 'string' || !genre.trim())).toEqual([]);
});

test('fetchAnimeInfo, servers and sources play the first episode', async () => {
  const info = await anikoto.fetchAnimeInfo(ROAD_OF_NARUTO);
  expectMediaInfo(info);

  const episodeId = info.episodes![0]!.id;
  expectServers(await anikoto.fetchEpisodeServers(episodeId, SubOrDub.SUB));
  expectSources(await anikoto.fetchEpisodeSources(episodeId));
});
