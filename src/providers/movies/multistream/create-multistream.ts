import type {
  IMovieInfo,
  IEpisodeServer,
  ISource,
  IMovieResult,
  ISearch,
  ProviderContext,
  ProviderConfig,
} from '../../../models';
import {
  TMDB_INFO_APPEND,
  mapTmdbInfo,
  mapTmdbResult,
  resolveTmdbApiKey,
  tmdbImage,
  tmdbPage,
  tmdbUrl,
} from '../../../utils/tmdb';
import { getMultiServers, getMultiSources, parseId, toEpisodeId, toMediaId } from './utils';

/**
 * MultiStream: titles from TMDB, streams from several embed sites (111movies, vidsrc, videasy,
 * hexa), each of whose servers is listed.
 * @param ctx provider context; requests go through its axios
 * @param customBaseURL site URL to use instead of the default (optional)
 * @param tmdbApiKey your TMDB API key; without one a shared key is used, with a warning (see `META.TMDB`)
 */
export function createMultiStream(ctx: ProviderContext, customBaseURL?: string, tmdbApiKey?: string) {
  const { axios, createCustomBaseUrl, enums } = ctx;
  const { TvType } = enums;
  const apiKey = resolveTmdbApiKey(tmdbApiKey, 'MOVIES.MultiStream');

  const config: ProviderConfig = {
    name: 'MultiStream',
    languages: 'en',
    classPath: 'MOVIES.MultiStream',
    logo: 'https://himovies.sx/images/group_1/theme_1/favicon.png',
    baseUrl: createCustomBaseUrl('https://rivestream.org', customBaseURL),
    isNSFW: false,
    isWorking: true,
  };

  const supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES]);

  /** Search TMDB. Ids are `<tmdbId>$movie` or `<tmdbId>$tv`; shows carry their season count. */
  const search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const { data } = await axios.get(
      tmdbUrl(
        `/search/multi?language=en-US&page=${page}&include_adult=false&query=${encodeURIComponent(query)}`,
        apiKey
      )
    );
    const results = await Promise.all(
      (data?.results ?? []).map(async (result: any): Promise<IMovieResult> => {
        let seasons: number | undefined;
        if (result.media_type === 'tv') {
          try {
            const { data: tvData } = await axios.get(tmdbUrl(`/tv/${result.id}?language=en-US`, apiKey));
            seasons = tvData.number_of_seasons;
          } catch {
            // The season count is extra; a show whose lookup fails is listed without it.
          }
        }
        return { ...mapTmdbResult(result), id: toMediaId(result.id, result.media_type), seasons };
      })
    );
    return tmdbPage(data, page, results);
  };

  /** @param id a MultiStream media id from `search` (`1071585$movie`, `1399$tv`) */
  const fetchMediaInfo = async (id: string): Promise<IMovieInfo> => {
    const { tmdbId, type } = parseId(id);
    const mediaType = type === 'movie' ? 'movie' : 'tv';
    const { data } = await axios.get(
      tmdbUrl(`/${type}/${tmdbId}?language=en-US&append_to_response=${TMDB_INFO_APPEND}`, apiKey)
    );

    const info: IMovieInfo = {
      id,
      ...mapTmdbInfo(data, mediaType),
      recommendations: data?.recommendations?.results?.length
        ? data.recommendations.results.map((result: any) => ({
            ...mapTmdbResult(result, mediaType),
            id: toMediaId(result.id, result.media_type ?? mediaType),
          }))
        : undefined,
    };

    if (info.type === TvType.TVSERIES) {
      info.episodes = [];
      for (let season = 1; season <= data?.number_of_seasons; season++) {
        const { data: seasonData } = await axios.get(tmdbUrl(`/tv/${tmdbId}/season/${season}`, apiKey));
        for (const item of seasonData.episodes) {
          info.episodes.push({
            id: toEpisodeId(tmdbId, item.episode_number, item.season_number, item.id),
            title: item.name,
            number: item.episode_number,
            season: item.season_number || season,
            description: item.overview,
            image: tmdbImage(item.still_path),
          });
        }
      }
    } else {
      info.episodes = [
        {
          id: toMediaId(tmdbId, 'movie'),
          title: info.title as string,
          description: info.description,
          image: info.image,
          number: 1,
        },
      ];
    }
    return info;
  };

  /** @param episodeId an episode id from `fetchMediaInfo` */
  const fetchEpisodeServers = (episodeId: string): Promise<IEpisodeServer[]> => getMultiServers(ctx, episodeId);

  /**
   * @param episodeId an episode id from `fetchMediaInfo`
   * @param _mediaId unused: the episode id names the title
   * @param server a server name from `fetchEpisodeServers` (default: the first)
   */
  const fetchEpisodeSources = (episodeId: string, _mediaId?: string, server?: string): Promise<ISource> =>
    getMultiSources(ctx, episodeId, server);

  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
  };
}

export type MultiStreamProviderInstance = ReturnType<typeof createMultiStream>;
