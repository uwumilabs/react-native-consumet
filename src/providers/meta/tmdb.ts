import { metaHttp } from '../../utils/meta-http';
import {
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IEpisodeServer,
  MovieParser,
  TvType,
  type IMovieResult,
  type IMovieInfo,
  type ProxyConfig,
  type IMovieEpisode,
  type IMovieSeason,
} from '../../models';
import type { IMovieProvider, IPeopleResult } from '../../models/types';
import { calculateStringSimilarity } from '../../utils';
import type { AxiosAdapter } from 'axios';
import HiMovies from '../movies/himovies/himovies';

/** What TMDB knows about a title, used to pick the matching provider result. */
type TitleHints = {
  type: TvType;
  year?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
  [key: string]: any;
};

class TMDB extends MovieParser {
  override readonly name = 'TMDB';
  protected override baseUrl = 'https://www.themoviedb.org';
  protected apiUrl = 'https://api.themoviedb.org/3';
  protected override logo = 'https://pbs.twimg.com/profile_images/1243623122089041920/gVZIvphd_400x400.jpg';
  protected override classPath = 'META.TMDB';
  override supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES, TvType.ANIME]);

  private provider: MovieParser | IMovieProvider;

  constructor(
    private apiKey: string = '5201b54eb0968700e693a30576d7d4dc',
    provider?: MovieParser | IMovieProvider,
    proxyConfig?: ProxyConfig,
    adapter?: AxiosAdapter
  ) {
    super();
    this.provider = provider || new HiMovies();
  }

  /**
   * @param type trending type: tv series, movie, people or all
   * @param timePeriod trending time period day or week
   * @param page page number
   */
  fetchTrending = async (
    type: string | 'all',
    timePeriod: 'day' | 'week' = 'day',
    page: number = 1
  ): Promise<ISearch<IMovieResult | IAnimeResult | IPeopleResult>> => {
    const trendingUrl = `${this.apiUrl}/trending/${
      type.toLowerCase() === TvType.MOVIE.toLowerCase()
        ? 'movie'
        : type.toLowerCase() === TvType.TVSERIES.toLowerCase()
          ? 'tv'
          : type.toLowerCase() === TvType.PEOPLE.toLowerCase()
            ? 'person'
            : 'all'
    }/${timePeriod}?page=${page}&api_key=${this.apiKey}&language=en-US`;

    const result: ISearch<IMovieResult | IAnimeResult | IPeopleResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };

    try {
      const { data } = await metaHttp.get(trendingUrl);

      if (data.results.length < 1) return result;

      result.hasNextPage = page + 1 <= data.total_pages;
      result.currentPage = page;
      result.totalResults = data.total_results;
      result.totalPages = data.total_pages;

      result.results = data.results.map((result: any) => {
        if (result.media_type !== 'person') {
          const date = new Date(result?.release_date || result?.first_air_date);

          const movie: IMovieResult = {
            id: result.id,
            title: result?.title || result?.name,
            image: `https://image.tmdb.org/t/p/original${result?.poster_path}`,
            type: result.media_type === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
            rating: result?.vote_average || 0,
            releaseDate: `${date.getFullYear()}` || '0',
          };

          return movie;
        } else {
          const user: IPeopleResult = {
            id: result.id,
            name: result.name,
            rating: result.popularity,
            image: `https://image.tmdb.org/t/p/original${result?.profile_path}`,
            movies: [],
          };

          user.movies = result.known_for.map((movie: any) => {
            const date = new Date(movie?.release_date || movie?.first_air_date);

            const xmovie: IMovieResult = {
              id: movie.id,
              title: movie?.title || movie?.name,
              image: `https://image.tmdb.org/t/p/original${movie?.poster_path}`,
              type: movie.media_type === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
              rating: movie?.vote_average || 0,
              releaseDate: `${date.getFullYear()}` || '0',
            };

            return xmovie;
          });

          return user;
        }
      });

      return result;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * @param query search query
   * @param page page number
   */
  override search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult | IAnimeResult>> => {
    const searchUrl = `${this.apiUrl}/search/multi?api_key=${this.apiKey}&language=en-US&page=${page}&include_adult=false&query=${query}`;

    const search: ISearch<IMovieResult | IAnimeResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };

    try {
      const { data } = await metaHttp.get(searchUrl);

      if (data.results.length < 1) return search;

      search.hasNextPage = page + 1 <= data.total_pages;
      search.currentPage = page;
      search.totalResults = data.total_results;
      search.totalPages = data.total_pages;

      data.results.forEach((result: any) => {
        const date = new Date(result?.release_date || result?.first_air_date);

        const movie: IMovieResult = {
          id: result.id,
          title: result?.title || result?.name,
          image: `https://image.tmdb.org/t/p/original${result?.poster_path}`,
          type: result.media_type === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
          rating: result?.vote_average || 0,
          releaseDate: `${date.getFullYear()}` || '0',
        };

        return search.results.push(movie);
      });

      return search;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * TMDB info with every season and episode. `id` is always the TMDB id. When the title is found on
   * the provider, `providerId` is the provider's media id and episodes carry provider episode ids;
   * with no match (or a failing provider) both are unset and the TMDB metadata is still returned.
   * @param id media id (anime or movie/tv)
   * @param type movie or tv
   */
  override fetchMediaInfo = async (mediaId: string, type: string): Promise<IMovieInfo> => {
    type = type.toLowerCase() === 'movie' ? 'movie' : 'tv';
    const infoUrl = `${this.apiUrl}/${type}/${mediaId}?api_key=${this.apiKey}&language=en-US&append_to_response=release_dates,watch/providers,alternative_titles,credits,external_ids,images,keywords,recommendations,reviews,similar,translations,videos&include_image_language=en`;

    const info: IMovieInfo = {
      id: mediaId,
      title: '',
    };

    try {
      //request api to get media info from tmdb
      const { data } = await metaHttp.get(infoUrl);

      //find the movie/tv series on the provider (e.g. flixhq) by title, year and season count
      const match = await this.matchProvider(data?.title || data?.name, {
        type: type === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
        totalSeasons: data?.number_of_seasons,
        totalEpisodes: data?.number_of_episodes,
        year: new Date(data?.release_year || data?.first_air_date || data?.release_date).getFullYear(),
      });

      // with no match there is nothing playable to map; the TMDB info and seasons are still returned
      const InfoFromProvider = match?.info;
      if (match) info.providerId = match.id;

      //check if the movie so episode id does not show on tv shows
      if (type === 'movie') info.episodeId = InfoFromProvider?.episodes?.[0]?.id;

      info.title = data?.title || data?.name;

      //images
      info.image = `https://image.tmdb.org/t/p/original${data?.poster_path}`;
      info.cover = `https://image.tmdb.org/t/p/original${data?.backdrop_path}`;

      info.type = type === 'movie' ? TvType.MOVIE : TvType.TVSERIES;
      info.rating = data?.vote_average || 0;
      info.releaseDate = data?.release_date || data?.first_air_date;
      info.description = data?.overview;
      info.genres = data?.genres.map((genre: { name: string }) => genre.name);
      info.duration = data?.runtime || data?.episode_run_time[0];
      info.totalEpisodes = data?.number_of_episodes;
      info.totalSeasons = data?.number_of_seasons as number;
      info.directors = data?.credits?.crew
        .filter((crew: { job: string }) => crew.job === 'Director')
        .map((crew: { name: string }) => crew.name);
      info.writers = data?.credits?.crew
        .filter((crew: { job: string }) => crew.job === 'Screenplay')
        .map((crew: { name: string }) => crew.name);
      info.actors = data?.credits?.cast.map((cast: { name: string }) => cast.name);
      info.characters = data?.credits?.cast.map((cast: any) => ({
        id: cast.id,
        name: cast.name,
        url: `https://www.themoviedb.org/person/${cast.id}`,
        character: cast.character,
        image: `https://image.tmdb.org/t/p/original${cast.profile_path}`,
      }));
      const video = data?.videos?.results?.[0];
      info.trailer = video?.key
        ? { id: video.key, site: video.site, url: `https://www.youtube.com/watch?v=${video.key}` }
        : undefined;

      info.mappings = {
        imdb: data?.external_ids?.imdb_id || undefined,
        tmdb: data?.id || undefined,
      };

      info.similar =
        data?.similar?.results?.length <= 0
          ? undefined
          : data?.similar?.results.map((result: any) => {
              return {
                id: result.id,
                title: result.title || result.name,
                image: `https://image.tmdb.org/t/p/original${result.poster_path}`,
                type: type === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
                rating: result.vote_average || 0,
                releaseDate: result.release_date || result.first_air_date,
              };
            });

      info.recommendations =
        data?.recommendations?.results?.length <= 0
          ? undefined
          : data?.recommendations?.results.map((result: any) => {
              return {
                id: result.id,
                title: result.title || result.name,
                image: `https://image.tmdb.org/t/p/original${result.poster_path}`,
                type: type === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
                rating: result.vote_average || 0,
                releaseDate: result.release_date || result.first_air_date,
              };
            });

      const totalSeasons = (info?.totalSeasons as number) || 0;
      if (type === 'tv' && totalSeasons > 0) {
        const seasonUrl = (season: string) => `${this.apiUrl}/tv/${mediaId}/season/${season}?api_key=${this.apiKey}`;

        const seasons: IMovieSeason[] = [];
        info.seasons = seasons;

        const providerEpisodes = InfoFromProvider?.episodes as any[];

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

        for (let i = 1; i <= totalSeasons; i++) {
          const { data: seasonData } = await metaHttp.get(seasonUrl(i.toString()));

          //find season in each episode (providerEpisodes)
          const seasonEpisodes = providerEpisodes?.filter((episode) => episode.season === i);
          const tmdbEpisodes: any[] = seasonData?.episodes ?? [];
          const episodes = tmdbEpisodes.map((episode): IMovieEpisode => {
            //find episode in each season (seasonEpisodes)
            const episodeFromProvider = seasonEpisodes?.find((ep) => ep.number === episode.episode_number);

            return {
              id: episodeFromProvider?.id,
              uniqueId: `${mediaId}-${type}-s${episode.season_number}-e${episode.episode_number}`,
              title: episode.name,
              number: episode.episode_number,
              episode: episode.episode_number,
              season: episode.season_number,
              releaseDate: episode.air_date,
              description: episode.overview,
              url: episodeFromProvider?.url || undefined,
              image: !episode?.still_path
                ? undefined
                : {
                    mobile: `https://image.tmdb.org/t/p/w300${episode.still_path}`,
                    hd: `https://image.tmdb.org/t/p/w780${episode.still_path}`,
                  },
            };
          });

          seasons.push({
            season: i,
            image: !seasonData?.poster_path
              ? undefined
              : {
                  mobile: `https://image.tmdb.org/t/p/w300${seasonData.poster_path}`,
                  hd: `https://image.tmdb.org/t/p/w780${seasonData.poster_path}`,
                },
            episodes,
            isReleased: tmdbEpisodes[0]?.air_date > new Date().toISOString() ? false : true,
          });
        }
      } else {
        info.seasons = [];
        info.seasons.push({
          season: 1,
          image: !data?.poster_path
            ? undefined
            : {
                mobile: `https://image.tmdb.org/t/p/w300${data.backdrop_path}`,
                hd: `https://image.tmdb.org/t/p/w780${data.backdrop_path}`,
              },
          episodes: [
            {
              id: InfoFromProvider?.episodes?.[0]?.id,
              uniqueId: `${mediaId}-${type}-s1-e1`,
              title: data.title || data.original_title,
              number: 1,
              episode: 1,
              season: 1,
              releaseDate: data.release_date,
              description: data.overview,
              url: InfoFromProvider?.episodes?.[0]?.url,
              image: !data?.backdrop_path
                ? undefined
                : {
                    mobile: `https://image.tmdb.org/t/p/w300${data.backdrop_path}`,
                    hd: `https://image.tmdb.org/t/p/w780${data.backdrop_path}`,
                  },
            },
          ],
        });
      }
    } catch (err) {
      //console.log(err);
      throw new Error((err as Error).message);
    }

    return info;
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

  /**
   * Find the id of a media from its title. and extra data. (year, totalSeasons, totalEpisodes)
   * @param title
   * @param extraData
   * @returns id of the media
   */
  private findIdFromTitle = async (title: string, extraData: TitleHints): Promise<string | undefined> => {
    //clean title
    title = title.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();

    const findMedia = (await this.provider.search(title)) as ISearch<IAnimeResult>;

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
          similarity: calculateStringSimilarity(title, resultTitle.toLowerCase()),
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

  /**
   * @param id media id (anime or movie/tv)
   * @param args optional arguments
   */
  override fetchEpisodeSources = async (id: string, ...args: any): Promise<ISource> => {
    return this.provider.fetchEpisodeSources(id, ...args);
  };

  /**
   * @param episodeId episode id
   * @param args optional arguments
   **/
  override fetchEpisodeServers = async (episodeId: string, ...args: any): Promise<IEpisodeServer[]> => {
    return this.provider.fetchEpisodeServers(episodeId, ...args);
  };
}

// (async () => {
//   const tmdb = new TMDB();
//   const search = await tmdb.search('the flash');
//   const info = await tmdb.fetchMediaInfo(search.results[0].id, search.results![0].type as string);
//   // console.log(info);
// })();

export default TMDB;
