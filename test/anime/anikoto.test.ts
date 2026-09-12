import AniKoto from '../../src/providers/anime/anikoto/anikoto';
import { SubOrDub } from '../../src/models';

jest.setTimeout(120000);

const anikoto = new AniKoto();

describe('AniKoto Provider Tests', () => {
  test('returns a filled array of anime list for search', async () => {
    const data = await anikoto.search('Solo Leveling');
    expect(data.results).not.toEqual([]);
    expect(data.results[0]?.id).toBeDefined();
    expect(data.results[0]?.title).toBeDefined();
  });

  test('returns a filled array of top airing anime', async () => {
    const data = await anikoto.fetchTopAiring();
    expect(data.results).not.toEqual([]);
  });

  test('returns a filled array of most popular anime', async () => {
    const data = await anikoto.fetchMostPopular();
    expect(data.results).not.toEqual([]);
  });

  test('returns a filled array of latest completed anime', async () => {
    const data = await anikoto.fetchLatestCompleted();
    expect(data.results).not.toEqual([]);
  });

  test('returns a filled array of recently updated anime', async () => {
    const data = await anikoto.fetchRecentlyUpdated();
    expect(data.results).not.toEqual([]);
  });

  test('returns a filled array of movies', async () => {
    const data = await anikoto.fetchMovie();
    expect(data.results).not.toEqual([]);
  });

  test('returns a filled array of TV series', async () => {
    const data = await anikoto.fetchTV();
    expect(data.results).not.toEqual([]);
  });

  test('returns a filled array of genres', async () => {
    const data = await anikoto.fetchGenres();
    expect(data).not.toEqual([]);
    expect(data.length).toBeGreaterThan(0);
  });

  test('returns anime list for a specific genre', async () => {
    const data = await anikoto.genreSearch('action');
    expect(data.results).not.toEqual([]);
  });

  test('returns search suggestions', async () => {
    const data = await anikoto.fetchSearchSuggestions('naruto');
    expect(data).not.toEqual([]);
  });

  test('returns spotlight anime list', async () => {
    const data = await anikoto.fetchSpotlight();
    expect(data).not.toEqual([]);
  });

  test('returns schedule for a given date', async () => {
    const today = new Date().toISOString().split('T')[0]!;
    const data = await anikoto.fetchSchedule(today);
    expect(data).toBeDefined();
  });

  test('returns a filled object of anime info with episodes', async () => {
    const data = await anikoto.fetchAnimeInfo('road-of-naruto-ggjw8');
    expect(data).not.toBeNull();
    expect(data.title).toBeDefined();
    expect(data.episodes).not.toEqual([]);
    expect(data.episodes!.length).toBeGreaterThan(0);
  });

  test('returns episode servers', async () => {
    const info = await anikoto.fetchAnimeInfo('road-of-naruto-ggjw8');
    const episodeId = info.episodes![0]!.id;
    const servers = await anikoto.fetchEpisodeServers(episodeId, SubOrDub.SUB);
    expect(servers).not.toEqual([]);
    expect(servers[0]!.url).toBeDefined();
  });

  test('returns episode sources using MegaPlay extractor', async () => {
    const info = await anikoto.fetchAnimeInfo('road-of-naruto-ggjw8');
    const episodeId = info.episodes![0]!.id;
    const sources = await anikoto.fetchEpisodeSources(episodeId);
    expect(sources).not.toBeNull();
    expect(sources.sources).not.toEqual([]);
    expect(sources.sources.length).toBeGreaterThan(0);
    expect(sources.sources[0]!.url).toBeDefined();
  });
});
