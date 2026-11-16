import { MOVIES } from '../../src/providers';
import { TvType } from '../../src/models/types';

jest.setTimeout(180000);

describe('VegaMovies Provider', () => {
  const vegaMovies = new MOVIES.VegaMovies();

  it('Search: returns a filled array of movies/TV', async () => {
    const data = await vegaMovies.search('avatar');
    expect(data.results.length).toBeGreaterThan(0);

    const first = data.results[0]!;
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.url).toMatch(/^https?:\/\//);
    expect([TvType.MOVIE, TvType.TVSERIES]).toContain(first.type);
  });

  it('fetchMediaInfo: returns movie info for movie ID', async () => {
    const movieSlug =
      'download-avatar-aang-the-last-airbender-2026-hindi-dubbed-full-movie-480p-720p-1080p-web-dl';
    const data = await vegaMovies.fetchMediaInfo(movieSlug);

    expect(data.title).toBeTruthy();
    expect(data.type).toBe(TvType.MOVIE);
    expect(data.episodes!.length).toBeGreaterThan(0);
  });

  it('fetchMediaInfo: returns series info with episodes for TV show ID', async () => {
    const seriesSlug = 'netflix-avatar-the-last-airbender-season-1-2-hindi-dd5-1';
    const data = await vegaMovies.fetchMediaInfo(seriesSlug);

    expect(data.title).toBeTruthy();
    expect(data.type).toBe(TvType.TVSERIES);
    expect(data.episodes!.length).toBeGreaterThan(0);

    const firstEp = data.episodes![0]!;
    expect(firstEp.id).toMatch(/^https?:\/\//);
    expect(firstEp.title).toBeTruthy();
    expect(firstEp.season).toBeGreaterThan(0);
  });

  // File links expire, so take a current episode link from a post instead of hard-coding one.
  let liveEpisodeLink: Promise<string> | undefined;
  const getLiveEpisodeLink = () =>
    (liveEpisodeLink ??= vegaMovies
      .fetchMediaInfo('download-loki-2023-season-2-hindi-org-web-dl-web-series-480p-720p-1080p-2160p-4k')
      .then((info) => info.episodes!.find((e) => e.id?.includes('cloud'))!.id!));

  it('fetchEpisodeServers: returns available servers for an episode link', async () => {
    const servers = await vegaMovies.fetchEpisodeServers(await getLiveEpisodeLink());
    expect(servers.some((s) => s.name === 'CF Storage' || s.name === 'HubCloud')).toBe(true);
  });

  it('fetchEpisodeSources: returns stream sources using HubCloud', async () => {
    const sources = await vegaMovies.fetchEpisodeSources(await getLiveEpisodeLink());
    expect(sources.sources.length).toBeGreaterThan(0);
    expect(sources.sources[0]!.url).toContain('http');
    expect(sources.sources[0]!.url).not.toContain('vcloud.');
    expect(sources.sources[0]!.server).toBeTruthy();
  });

  it('fetchMediaInfo & fetchEpisodeSources for Mercy for None', async () => {
    const info = await vegaMovies.fetchMediaInfo('download-mercy-for-none-2025-season-1-hindi-dubbed-complete-480p-720p-1080p');
    expect(info.episodes!.length).toBeGreaterThan(0);

    const sources = await vegaMovies.fetchEpisodeSources(info.episodes![0]!.id!, info.id);
    expect(sources.sources.length).toBeGreaterThan(0);
    expect(sources.sources[0]!.url).not.toContain('vcloud.');
    expect(sources.sources[0]!.server).toBe('CF Storage');
    expect(sources.sources[0]!.quality).toBe('1080p');
  });

  it('fetchLatest: returns latest movies/shows from homepage', async () => {
    const latest = await vegaMovies.fetchLatest(1);
    expect(latest.results.length).toBeGreaterThan(0);
  });

  it('search: returns cleanly formatted titles for movies and series', async () => {
    const mercySearch = await vegaMovies.search('mercy for none');
    expect(mercySearch.results.length).toBeGreaterThan(0);
    expect(mercySearch.results[0]!.title).toBe('Mercy for None');

    const jjkSearch = await vegaMovies.search('jujutsu kaisen');
    expect(jjkSearch.results.length).toBeGreaterThan(0);
    expect(jjkSearch.results[0]!.title).toBe('Jujutsu Kaisen');
  });
});
