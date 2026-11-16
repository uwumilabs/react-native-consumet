import { MOVIES } from '../../src/providers';
import { TvType } from '../../src/models/types';
import { expectMediaInfo, expectMediaSearch, expectServers, expectSources } from '../unit/helpers/media-contract';

jest.setTimeout(180000);

describe('VegaMovies Provider', () => {
  const vegaMovies = new MOVIES.VegaMovies();

  it('Search: returns a filled array of movies/TV', async () => {
    const data = await vegaMovies.search('avatar');
    expectMediaSearch(data);
    expect([TvType.MOVIE, TvType.TVSERIES]).toContain(data.results[0]!.type);
  });

  it('fetchMediaInfo: returns movie info for movie ID', async () => {
    const movieSlug =
      'download-avatar-aang-the-last-airbender-2026-hindi-dubbed-full-movie-480p-720p-1080p-web-dl';
    const data = await vegaMovies.fetchMediaInfo(movieSlug);

    expectMediaInfo(data);
    expect(data.type).toBe(TvType.MOVIE);
  });

  it('fetchMediaInfo: returns series info with episodes for TV show ID', async () => {
    const seriesSlug = 'netflix-avatar-the-last-airbender-season-1-2-hindi-dd5-1';
    const data = await vegaMovies.fetchMediaInfo(seriesSlug);

    expectMediaInfo(data);
    expect(data.type).toBe(TvType.TVSERIES);
    const firstEp = data.episodes![0]!;
    expect(firstEp.id).toMatch(/^https?:\/\//);
    expect(firstEp.title).toMatch(/\S/);
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
    expectServers(servers);
    expect(servers.some((s) => s.name === 'hubcloud-cf-storage' || s.name === 'hubcloud')).toBe(true);
  });

  it('fetchEpisodeSources: returns stream sources using HubCloud', async () => {
    const sources = await vegaMovies.fetchEpisodeSources(await getLiveEpisodeLink());
    expectSources(sources);
    expect(sources.sources[0]!.url).not.toContain('vcloud.');
    expect(sources.sources[0]!.server).toMatch(/\S/);
  });

  it('fetchMediaInfo & fetchEpisodeSources for Mercy for None', async () => {
    const info = await vegaMovies.fetchMediaInfo('download-mercy-for-none-2025-season-1-hindi-dubbed-complete-480p-720p-1080p');
    expectMediaInfo(info);

    const sources = await vegaMovies.fetchEpisodeSources(info.episodes![0]!.id!, info.id);
    expectSources(sources);
    expect(sources.sources[0]!.url).not.toContain('vcloud.');
    expect(sources.sources[0]!.server).toBe('hubcloud-cf-storage');
    expect(sources.sources[0]!.quality).toBe('1080p');
  });

  it('fetchLatest: returns latest movies/shows from homepage', async () => {
    expectMediaSearch(await vegaMovies.fetchLatest(1));
  });

  it('search: returns cleanly formatted titles for movies and series', async () => {
    const mercySearch = await vegaMovies.search('mercy for none');
    expect(mercySearch.results[0]?.title).toBe('Mercy for None');

    const jjkSearch = await vegaMovies.search('jujutsu kaisen');
    expect(jjkSearch.results[0]?.title).toBe('Jujutsu Kaisen');
  });
});
