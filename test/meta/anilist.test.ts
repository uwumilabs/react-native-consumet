import { META } from '../../src/providers';
import { expectMediaInfo, expectMediaSearch, expectServers, expectSources } from '../unit/helpers/media-contract';

jest.setTimeout(120000);

// Episodes, servers and sources come from the default provider (Zoro).
const anilist = new META.Anilist();
const SPY_X_FAMILY = '140960';

/** Episodes that lack an id or a number, or whose uniqueId isn't keyed by the AniList id. */
const badEpisodes = (anilistId: string, episodes: { id: string; uniqueId: string; number: number }[]) =>
  episodes.filter(
    (e) => !e.id || typeof e.number !== 'number' || !new RegExp(`^${anilistId}\\$ep=\\d+$`).test(e.uniqueId)
  );

test('search finds the title', async () => {
  const data = await anilist.search('spy x family');

  expectMediaSearch(data);
  expect(data.results.map((result) => result.id)).toContain(SPY_X_FAMILY);
});

test('fetchAnimeInfo returns the AniList details with the provider episodes', async () => {
  const info = await anilist.fetchAnimeInfo(SPY_X_FAMILY);

  expectMediaInfo(info);
  expect(info.description).toMatch(/\S/);
});

test('fetchEpisodesListById keys every episode by the AniList id, subbed and dubbed', async () => {
  const sub = await anilist.fetchEpisodesListById(SPY_X_FAMILY, false);
  expect(sub.length).toBeGreaterThan(0);
  expect(badEpisodes(SPY_X_FAMILY, sub)).toEqual([]);

  // A provider may have no dub; what it has follows the same keys.
  expect(badEpisodes(SPY_X_FAMILY, await anilist.fetchEpisodesListById(SPY_X_FAMILY, true))).toEqual([]);
});

test('servers and sources play an episode', async () => {
  const [episode] = await anilist.fetchEpisodesListById(SPY_X_FAMILY);

  expectServers(await anilist.fetchEpisodeServers(episode!.id));
  expectSources(await anilist.fetchEpisodeSources(episode!.id));
});

test.each([
  ['fetchTrendingAnime', () => anilist.fetchTrendingAnime(1, 10)],
  ['fetchPopularAnime', () => anilist.fetchPopularAnime(1, 10)],
  // weekStart and weekEnd are weekdays; the defaults are the week from today.
  ['fetchAiringSchedule', () => anilist.fetchAiringSchedule(1, 20, undefined, undefined, true)],
])('%s returns a page of titles', async (_name, list) => {
  expectMediaSearch(await list());
});

test('fetchStaffById returns the staff member with their roles', async () => {
  const staff = await anilist.fetchStaffById(97410);

  expect(staff.id).toBe(97410);
  expect(staff.roles!.length).toBeGreaterThan(0);
});
