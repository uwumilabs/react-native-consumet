import { MOVIES } from '../../src/providers';
import { createVegaMovies } from '../../src/providers/movies/vegamovies/create-vegamovies';
import { createProviderContext } from '../../src/utils';
import { TvType } from '../../src/models/types';

jest.setTimeout(180000);

describe('VegaMovies Provider', () => {
  const vegaMovies = new MOVIES.VegaMovies();

  it('should instantiate both class and factory successfully', () => {
    expect(vegaMovies).toBeDefined();
    expect(vegaMovies.name).toBe('VegaMovies');
    expect(vegaMovies.baseUrl).toBe('https://new2.vegamovies.futbol');

    const ctx = createProviderContext();
    const instance = createVegaMovies(ctx);
    expect(instance).toBeDefined();
    expect(instance.name).toBe('VegaMovies');
    expect(typeof instance.search).toBe('function');
    expect(typeof instance.fetchMediaInfo).toBe('function');
  });

  it('Search: returns a filled array of movies/TV', async () => {
    const data = await vegaMovies.search('avatar');
    expect(data.results).toBeDefined();
    expect(data.results.length).toBeGreaterThan(0);

    const first = data.results[0];
    expect(first.id).toBeDefined();
    expect(first.title).toBeDefined();
    expect(first.url).toBeDefined();
    expect(first.type).toBeDefined();
  });

  it('fetchMediaInfo: returns movie info for movie ID', async () => {
    const movieSlug =
      'download-avatar-aang-the-last-airbender-2026-hindi-dubbed-full-movie-480p-720p-1080p-web-dl';
    const data = await vegaMovies.fetchMediaInfo(movieSlug);

    expect(data).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.title.length).toBeGreaterThan(0);
    expect(data.type).toBe(TvType.MOVIE);
    expect(data.episodes).toBeDefined();
    expect(data.episodes!.length).toBeGreaterThan(0);
  });

  it('fetchMediaInfo: returns series info with episodes for TV show ID', async () => {
    const seriesSlug = 'netflix-avatar-the-last-airbender-season-1-2-hindi-dd5-1';
    const data = await vegaMovies.fetchMediaInfo(seriesSlug);

    expect(data).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.type).toBe(TvType.TVSERIES);
    expect(data.episodes).toBeDefined();
    expect(data.episodes!.length).toBeGreaterThan(0);

    const firstEp = data.episodes![0];
    expect(firstEp.id).toBeDefined();
    expect(firstEp.title).toBeDefined();
    expect(firstEp.season).toBeDefined();
  });

  it('fetchEpisodeServers: returns available servers for an episode link', async () => {
    const servers = await vegaMovies.fetchEpisodeServers(
      'https://vcloud.fit/4jrxrrm2jfrjc4d'
    );
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);
    expect(servers.some((s) => s.name === 'CF Storage' || s.name === 'HubCloud')).toBe(true);
  });

  it('fetchEpisodeSources: returns stream sources using HubCloud', async () => {
    const sources = await vegaMovies.fetchEpisodeSources(
      'https://vcloud.fit/4jrxrrm2jfrjc4d'
    );
    expect(sources).toBeDefined();
    expect(Array.isArray(sources.sources)).toBe(true);
    expect(sources.sources.length).toBeGreaterThan(0);
    expect(sources.sources[0].url).toContain('http');
    expect(sources.sources[0].url).not.toContain('vcloud.fit');
    expect(sources.sources[0].server).toBeDefined();
  });

  it('fetchMediaInfo & fetchEpisodeSources for Mercy for None', async () => {
    const info = await vegaMovies.fetchMediaInfo('download-mercy-for-none-2025-season-1-hindi-dubbed-complete-480p-720p-1080p');
    expect(info.episodes).toBeDefined();
    expect(info.episodes!.length).toBeGreaterThan(0);

    const firstEpId = info.episodes![0].id;
    console.log('FIRST EPISODE ID:', firstEpId);
    const sources = await vegaMovies.fetchEpisodeSources(firstEpId, info.id);
    console.log('MERCY FOR NONE FIRST EP SOURCES:', JSON.stringify(sources, null, 2));
    expect(sources.sources.length).toBeGreaterThan(0);
    expect(sources.sources[0].url).not.toContain('vcloud.fit');
    expect(sources.sources[0].server).toBe('CF Storage');
    expect(sources.sources[0].quality).toBe('1080p');
  });

  it('fetchLatest: returns latest movies/shows from homepage', async () => {
    const latest = await vegaMovies.fetchLatest(1);
    expect(latest).toBeDefined();
    expect(Array.isArray(latest.results)).toBe(true);
    expect(latest.results.length).toBeGreaterThan(0);
  });

  it('search: returns cleanly formatted titles for movies and series', async () => {
    const mercySearch = await vegaMovies.search('mercy for none');
    expect(mercySearch.results.length).toBeGreaterThan(0);
    expect(mercySearch.results[0].title).toBe('Mercy for None');

    const jjkSearch = await vegaMovies.search('jujutsu kaisen');
    expect(jjkSearch.results.length).toBeGreaterThan(0);
    expect(jjkSearch.results[0].title).toBe('Jujutsu Kaisen');
  });
});

