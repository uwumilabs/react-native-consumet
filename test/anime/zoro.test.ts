import { ANIME } from '../../src/providers';
import { MediaStatus } from '../../src/models';
import { expectMediaInfo, expectMediaSearch, expectServers, expectSources } from '../unit/helpers/media-contract';

jest.setTimeout(120000);

// fetchContinueWatching and fetchWatchList need a signed-in user's cookie, so no suite covers them.
const zoro = new ANIME.Zoro();
const ONE_PIECE = 'one-piece-100';

test('search finds the title and pages through results', async () => {
  const first = await zoro.search('One Piece');
  expectMediaSearch(first);
  expect(first.results.map((result) => result.id)).toContain(ONE_PIECE);
  expect(first.hasNextPage).toBe(true);

  expectMediaSearch(await zoro.search('One Piece', 2), 2, new Set(first.results.map((result) => result.id)));
});

test.each([
  ['fetchAdvancedSearch', () => zoro.fetchAdvancedSearch(1, 'tv', 'finished_airing')],
  ['fetchTopAiring', () => zoro.fetchTopAiring()],
  ['fetchMostPopular', () => zoro.fetchMostPopular()],
  ['fetchMostFavorite', () => zoro.fetchMostFavorite()],
  ['fetchLatestCompleted', () => zoro.fetchLatestCompleted()],
  ['fetchRecentlyUpdated', () => zoro.fetchRecentlyUpdated()],
  ['fetchRecentlyAdded', () => zoro.fetchRecentlyAdded()],
  ['fetchTopUpcoming', () => zoro.fetchTopUpcoming()],
  ['fetchStudio', () => zoro.fetchStudio('studio-pierrot')],
  ['fetchSubbedAnime', () => zoro.fetchSubbedAnime()],
  ['fetchDubbedAnime', () => zoro.fetchDubbedAnime()],
  ['fetchMovie', () => zoro.fetchMovie()],
  ['fetchTV', () => zoro.fetchTV()],
  ['fetchOVA', () => zoro.fetchOVA()],
  ['fetchONA', () => zoro.fetchONA()],
  ['fetchSpecial', () => zoro.fetchSpecial()],
  ['genreSearch', () => zoro.genreSearch('action')],
])('%s returns a page of titles', async (_name, list) => {
  expectMediaSearch(await list());
});

test.each([
  ['fetchSpotlight', () => zoro.fetchSpotlight()],
  ['fetchSearchSuggestions', () => zoro.fetchSearchSuggestions('one piece')],
  ['fetchSchedule', () => zoro.fetchSchedule(new Date().toISOString().slice(0, 10))],
])('%s returns titles', async (_name, list) => {
  expectMediaSearch({ results: await list() });
});

test('fetchAnimeInfo reads the details and the episodes', async () => {
  const info = await zoro.fetchAnimeInfo('ranma-1-2-19335');

  expectMediaInfo(info);
  expect(Object.values(MediaStatus)).toContain(info.status);
  expect(info).toMatchObject({
    description: expect.stringMatching(/\S/),
    season: expect.stringMatching(/\S/),
    japaneseTitle: expect.stringMatching(/\S/),
  });
  expect(info.genres!.length).toBeGreaterThan(0);
});

test('servers and sources play an episode', async () => {
  const info = await zoro.fetchAnimeInfo(ONE_PIECE);
  const episodeId = info.episodes![0]!.id;

  expectServers(await zoro.fetchEpisodeServers(episodeId));
  expectSources(await zoro.fetchEpisodeSources(episodeId));
});

test('two episodes of a show each get their own sources', async () => {
  const show = 'rezero-starting-life-in-another-world-season-3-19301';
  const [first, second] = [
    await zoro.fetchEpisodeSources(`${show}$episode$128356$both`),
    await zoro.fetchEpisodeSources(`${show}$episode$128536$both`),
  ];

  expectSources(first);
  expectSources(second);
  expect(first.sources[0]!.url).not.toBe(second.sources[0]!.url);
});
