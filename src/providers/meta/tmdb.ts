import { metaHttp } from '../../utils/meta-http';
import {
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IEpisodeServer,
  MovieParser,
  MetaError,
  TvType,
  type IMovieResult,
  type IMovieInfo,
  type ProxyConfig,
  type IMovieEpisode,
  type IMovieSeason,
} from '../../models';
import type { IMovieProvider, IPeopleResult } from '../../models/types';
import type { AxiosAdapter } from 'axios';
import {
  TMDB_API_URL,
  mapTmdbInfo,
  mapTmdbResult,
  mapTmdbResults,
  releaseYear,
  resolveTmdbApiKey,
  tmdbImage,
  tmdbImageSizes,
  type TmdbMediaType,
} from '../../utils/tmdb';
import { HiMovies } from '../movies/himovies/himovies';
import { callProvider, searchTerm, stringSimilarity } from './shared';

/** What TMDB knows about a title, used to pick the matching provider result. */
type TitleHints = {
  type: TvType;
  year?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
  [key: string]: any;
};

/** TMDB's trending list for each TvType; anything else is `all`. */
const TRENDING_PATHS = new Map([
  [TvType.MOVIE.toLowerCase(), 'movie'],
  [TvType.TVSERIES.toLowerCase(), 'tv'],
  [TvType.PEOPLE.toLowerCase(), 'person'],
]);

class TMDB extends MovieParser {
  override readonly name = 'TMDB';
  protected override baseUrl = 'https://www.themoviedb.org';
  protected apiUrl = TMDB_API_URL;
  protected override logo = 'https://pbs.twimg.com/profile_images/1243623122089041920/gVZIvphd_400x400.jpg';
  protected override classPath = 'META.TMDB';
  override supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES, TvType.ANIME]);

  private apiKey: string;
  private provider: MovieParser | IMovieProvider;

  /**
   * @param apiKey your TMDB API key. Without one, a key shared by every app that passes none is
   * used, and a warning is logged once; TMDB can rate-limit or revoke that key at any time.
   * @param provider movie provider to find the title on (default HiMovies)
   * @param _proxyConfig ignored: requests go through the library's own client. Kept so existing calls compile.
   * @param _adapter ignored, for the same reason
   */
  constructor(
    apiKey?: string,
    provider?: MovieParser | IMovieProvider,
    _proxyConfig?: ProxyConfig,
    _adapter?: AxiosAdapter
  ) {
    super();
    this.apiKey = resolveTmdbApiKey(apiKey, 'META.TMDB');
    this.provider = provider || new HiMovies();
  }

  /**
   * @param type `movie`, `tv series`, `people` or `all` (a TvType value, or anything else for all)
   * @param timePeriod `day` or `week`
   */
  fetchTrending = async (
    type: string | 'all',
    timePeriod: 'day' | 'week' = 'day',
    page: number = 1
  ): Promise<ISearch<IMovieResult | IAnimeResult | IPeopleResult>> => {
    const path = TRENDING_PATHS.get(type.toLowerCase()) ?? 'all';
    const data = await this.get(`/trending/${path}/${timePeriod}?page=${page}&language=en-US`);
    return this.toPage(data, page, (result) =>
      result.media_type === 'person'
        ? ({
            id: result.id,
            name: result.name,
            rating: result.popularity,
            image: tmdbImage(result.profile_path),
            // TMDB's trending people no longer come with known_for
            movies: (result.known_for ?? []).map((movie: any) => mapTmdbResult(movie)),
          } as IPeopleResult)
        : mapTmdbResult(result)
    );
  };

  override search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const data = await this.get(
      `/search/multi?language=en-US&page=${page}&include_adult=false&query=${encodeURIComponent(query)}`
    );
    return this.toPage(data, page, (result) => mapTmdbResult(result));
  };

  /**
   * TMDB info with every season and episode. `id` is always the TMDB id. When the title is found on
   * the provider, `providerId` is the provider's media id and episodes carry provider episode ids;
   * with no match (or a failing provider) both are unset and the TMDB metadata is still returned.
   * @param mediaId TMDB id
   * @param type `movie`, or anything else for a show
   */
  override fetchMediaInfo = async (mediaId: string, type: string): Promise<IMovieInfo> => {
    const mediaType: TmdbMediaType = type.toLowerCase() === 'movie' ? 'movie' : 'tv';
    try {
      const { data } = await metaHttp.get(
        this.url(
          `/${mediaType}/${mediaId}?language=en-US&append_to_response=release_dates,watch/providers,alternative_titles,credits,external_ids,images,keywords,recommendations,reviews,similar,translations,videos&include_image_language=en`
        )
      );

      const match = await this.matchProvider(data?.title || data?.name, {
        type: mediaType === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
        totalSeasons: data?.number_of_seasons,
        totalEpisodes: data?.number_of_episodes,
        year: Number(releaseYear(data)) || undefined,
      });
      // With no match there is nothing playable to map; the TMDB info and seasons are still returned.
      const providerEpisodes = match?.info?.episodes as any[] | undefined;

      const info: IMovieInfo = {
        id: mediaId,
        ...mapTmdbInfo(data, mediaType),
        ...(match ? { providerId: match.id } : {}),
        ...(mediaType === 'movie' ? { episodeId: providerEpisodes?.[0]?.id } : {}),
        directors: data?.credits?.crew
          ?.filter((crew: { job: string }) => crew.job === 'Director')
          .map((crew: { name: string }) => crew.name),
        writers: data?.credits?.crew
          ?.filter((crew: { job: string }) => crew.job === 'Screenplay')
          .map((crew: { name: string }) => crew.name),
        actors: data?.credits?.cast?.map((cast: { name: string }) => cast.name),
        mappings: { imdb: data?.external_ids?.imdb_id || undefined, tmdb: data?.id || undefined },
        similar: mapTmdbResults(data?.similar, mediaType),
      };

      const totalSeasons = info.totalSeasons || 0;
      if (mediaType === 'tv' && totalSeasons > 0) {
        info.nextAiringEpisode = data?.next_episode_to_air
          ? {
              season: data.next_episode_to_air?.season_number || undefined,
              episode: data.next_episode_to_air?.episode_number || undefined,
              releaseDate: data.next_episode_to_air?.air_date || undefined,
              title: data.next_episode_to_air?.name || undefined,
              description: data.next_episode_to_air?.overview || undefined,
              runtime: data.next_episode_to_air?.runtime || undefined,
            }
          : undefined;
        info.seasons = await this.fetchSeasons(mediaId, totalSeasons, providerEpisodes);
      } else {
        info.seasons = [
          {
            season: 1,
            image: tmdbImageSizes(data?.poster_path),
            episodes: [
              {
                id: providerEpisodes?.[0]?.id,
                uniqueId: `${mediaId}-${mediaType}-s1-e1`,
                title: data.title || data.original_title,
                number: 1,
                episode: 1,
                season: 1,
                releaseDate: data.release_date,
                description: data.overview,
                url: providerEpisodes?.[0]?.url,
                image: tmdbImageSizes(data?.backdrop_path),
              },
            ],
          },
        ];
      }
      return info;
    } catch (err) {
      // matchProvider absorbs provider failures, so anything here comes from TMDB's requests or data
      throw MetaError.from('tmdb', err);
    }
  };

  /**
   * Every season of a show, fetched together, with the provider's episode ids where the provider
   * has the episode. A season whose request fails keeps its place, with no episodes and `failed`
   * set, so the other seasons (and the season indexes apps store) survive it.
   */
  private fetchSeasons = async (
    mediaId: string,
    totalSeasons: number,
    providerEpisodes: any[] | undefined
  ): Promise<IMovieSeason[]> => {
    const seasonNumbers = Array.from({ length: totalSeasons }, (_, index) => index + 1);
    const responses = await Promise.allSettled(
      seasonNumbers.map((season) => metaHttp.get(this.url(`/tv/${mediaId}/season/${season}`)))
    );
    const failure = responses.find((response): response is PromiseRejectedResult => response.status === 'rejected');
    if (failure && responses.every((response) => response.status === 'rejected')) throw failure.reason;

    return responses.map((response, index): IMovieSeason => {
      const season = index + 1;
      if (response.status === 'rejected') return { season, episodes: [], failed: true };
      const seasonData = response.value.data;
      const seasonEpisodes = providerEpisodes?.filter((episode) => episode.season === season);
      const tmdbEpisodes: any[] = seasonData?.episodes ?? [];

      return {
        season,
        image: tmdbImageSizes(seasonData?.poster_path),
        episodes: tmdbEpisodes.map((episode): IMovieEpisode => {
          const episodeFromProvider = seasonEpisodes?.find((ep) => ep.number === episode.episode_number);
          return {
            id: episodeFromProvider?.id,
            uniqueId: `${mediaId}-tv-s${episode.season_number}-e${episode.episode_number}`,
            title: episode.name,
            number: episode.episode_number,
            episode: episode.episode_number,
            season: episode.season_number,
            releaseDate: episode.air_date,
            description: episode.overview,
            url: episodeFromProvider?.url || undefined,
            image: tmdbImageSizes(episode?.still_path),
          };
        }),
        isReleased: !(tmdbEpisodes[0]?.air_date > new Date().toISOString()),
      };
    });
  };

  /**
   * Find the title on the provider and fetch the provider's info for it. Returns nothing when no
   * search result matches or the provider fails, so the TMDB metadata never depends on the provider.
   */
  private matchProvider = async (
    title: string,
    extraData: TitleHints
  ): Promise<{ id: string; info: IMovieInfo | IAnimeInfo } | undefined> => {
    try {
      const id = await this.findIdFromTitle(title, extraData);
      if (!id) return undefined;
      return { id, info: await this.provider.fetchMediaInfo(id) };
    } catch {
      return undefined;
    }
  };

  /** The id of the provider's search result for the title, checked against TMDB's year and season count. */
  private findIdFromTitle = async (title: string, extraData: TitleHints): Promise<string | undefined> => {
    const term = searchTerm(title).toLowerCase();
    const findMedia = (await this.provider.search(term)) as ISearch<IAnimeResult>;

    // Drop results whose title isn't close, or whose type, year (±1) or season count (±2) contradicts
    // TMDB. Results that don't report a type, year or season count stay as candidates.
    const yearOf = (result: IAnimeResult) => Number(/\b(\d{4})\b/.exec(String(result.releaseDate ?? ''))?.[1]);
    const checkType = extraData.type === TvType.MOVIE || extraData.type === TvType.TVSERIES;
    const checkSeasons = extraData.type === TvType.TVSERIES && Boolean(extraData.totalSeasons);
    const candidates = findMedia.results
      .map((result) => {
        const resultTitle = typeof result.title === 'string' ? result.title : '';
        const year = yearOf(result);
        return {
          result,
          similarity: stringSimilarity(term, resultTitle.toLowerCase()),
          yearGap: year && extraData.year ? Math.abs(year - extraData.year) : undefined,
        };
      })
      .filter(({ result, similarity, yearGap }) => {
        if (similarity < 0.5) return false;
        if (checkType && result.type && (result.type as string) !== extraData.type) return false;
        if (yearGap !== undefined && yearGap > 1) return false;

        const seasons = result.seasons;
        if (checkSeasons && typeof seasons === 'number') {
          return seasons >= extraData.totalSeasons! - 2 && seasons <= extraData.totalSeasons! + 2;
        }
        return true;
      })
      // Closest title first; between equally close titles, the exact year, then ±1, then unknown.
      .sort((a, b) => b.similarity - a.similarity || (a.yearGap ?? 2) - (b.yearGap ?? 2));

    return candidates[0]?.result.id || undefined;
  };

  override fetchEpisodeSources = (id: string, ...args: any): Promise<ISource> =>
    callProvider(this.provider, 'episode sources', () => this.provider.fetchEpisodeSources(id, ...args));

  override fetchEpisodeServers = (episodeId: string, ...args: any): Promise<IEpisodeServer[]> =>
    callProvider(this.provider, 'episode servers', () => this.provider.fetchEpisodeServers(episodeId, ...args));

  /** A TMDB API URL with the API key. */
  private url = (path: string) => `${this.apiUrl}${path}${path.includes('?') ? '&' : '?'}api_key=${this.apiKey}`;

  /** GET a TMDB list; failures as a TMDB MetaError. */
  private get = async (path: string) => {
    try {
      return (await metaHttp.get(this.url(path))).data;
    } catch (err) {
      throw MetaError.from('tmdb', err);
    }
  };

  /** A page of TMDB results; `hasNextPage` and the totals come from TMDB's paging. */
  private toPage = <T>(data: any, page: number, map: (result: any) => T): ISearch<T> => {
    if (!data?.results?.length) return { currentPage: page, hasNextPage: false, results: [] };
    return {
      currentPage: page,
      hasNextPage: page + 1 <= data.total_pages,
      totalResults: data.total_results,
      totalPages: data.total_pages,
      results: data.results.map(map),
    };
  };
}

export default TMDB;
