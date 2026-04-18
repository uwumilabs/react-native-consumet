import { ANIME } from '../../lib/module/providers';

jest.setTimeout(120000);

const aniwatchtv = new ANIME.AniWatchTv();

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.search('Overlord IV');
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchAdvancedSearch(1, 'tv', 'finished_airing');
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchTopAiring();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchMostPopular();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchMostFavorite();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchLatestCompleted();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchRecentlyUpdated();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchRecentlyAdded();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchTopUpcoming();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchStudio('studio-pierrot');
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchSubbedAnime();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchDubbedAnime();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchMovie();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchTV();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchOVA();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchONA();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchSpecial();
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of genres', async () => {
  const data = await aniwatchtv.fetchGenres();
  expect(data).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.genreSearch('action');
  expect(data.results).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const date = new Date();
  //date in YYYY-MM-DD format
  const formattedDate = date.toISOString().split('T')[0];
  const data = await aniwatchtv.fetchSchedule(formattedDate);
  expect(data).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchSpotlight();
  expect(data).not.toEqual([]);
});

test('returns a filled array of anime list', async () => {
  const data = await aniwatchtv.fetchSearchSuggestions('one piece');
  expect(data).not.toEqual([]);
});

// test('returns a filled array of episode list for continue watching', async () => {
//   const connectSid = 'users_connect_sid';
//   const data = await aniwatchtv.fetchContinueWatching(`${connectSid}`);
//   console.log(data);
//   expect(data).not.toEqual([]);
// });

// test('returns a filled array of animes from watch list', async () => {
//   const connectSid = 'users_connect_sid';
//   const data = await aniwatchtv.fetchWatchList(`${connectSid}`);
//   console.log(data);
//   expect(data).not.toEqual([]);
// });

test('returns a filled object of anime data', async () => {
  const data = await aniwatchtv.fetchAnimeInfo('one-piece-100');
  expect(data).not.toBeNull();
  expect(data.description).not.toBeNull();
  expect(data.episodes).not.toEqual([]);
});

test('returns a filled object of episode sources', async () => {
  const res = await aniwatchtv.search('Overlord IV');
  const info = await aniwatchtv.fetchAnimeInfo(res.results[3].id);
  const data = await aniwatchtv.fetchEpisodeSources(info.episodes![0].id); // Overlord IV episode 1 id
  expect(data.sources).not.toEqual([]);
  expect(data.headers).not.toBeNull();
});
test('returns a filled object of episode sources of multiple episodes', async () => {
  const data1 = await aniwatchtv.fetchEpisodeSources(
    'rezero-starting-life-in-another-world-season-3-19301$episode$128356$both'
  );
  const data2 = await aniwatchtv.fetchEpisodeSources(
    'rezero-starting-life-in-another-world-season-3-19301$episode$128536$both'
  );
  expect(data1.sources).not.toEqual([]);
  expect(data2.sources).not.toEqual([]);
});

test('returns a filled object of anime data with: status, genres, season and japaneseTitle', async () => {
  const info = await aniwatchtv.fetchAnimeInfo('ranma-1-2-19335');

  expect(info.status).not.toBeNull();
  expect(info.status).toBeDefined();
  expect(info.status).not.toBe('');

  expect(info.season).not.toBeNull();
  expect(info.season).toBeDefined();
  expect(info.season).not.toBe('');

  expect(info.japaneseTitle).not.toBeNull();
  expect(info.japaneseTitle).toBeDefined();
  expect(info.japaneseTitle).not.toBe('');

  expect(info.genres).not.toBeNull();
  expect(info.genres).toBeDefined();
  expect(info.genres).not.toEqual([]);
});
