import {
  MovieParser,
  TvType,
  type IMovieInfo,
  type IEpisodeServer,
  StreamingServers,
  type ISource,
  type IMovieResult,
  type ISearch,
  type ProviderContext,
} from '../../../models';
import { providerArgs } from '../../provider-args';
import { getMultiServers, getMultiSources } from './utils';
import { resolveTmdbApiKey } from '../../meta/tmdb-api-key';

export class MultiStream extends MovieParser {
  override readonly name = 'MultiStream';
  protected override baseUrl = 'https://rivestream.org';
  protected apiUrl = 'https://api.themoviedb.org/3';
  private apiKey: string;
  protected override logo = 'https://himovies.sx/images/group_1/theme_1/favicon.png';
  protected override classPath = 'MOVIES.MultiStream';
  override supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES]);
  private readonly ctx: ProviderContext;

  /**
   * @param ctx provider context; requests go through its axios (default: `createProviderContext()`)
   * @param customBaseURL site URL to use instead of the default (optional)
   * @param apiKey your TMDB API key; without one a shared key is used, with a warning (see `META.TMDB`)
   */
  constructor(ctx?: ProviderContext, customBaseURL?: string, apiKey?: string);
  /** The older form, without a context. */
  constructor(customBaseURL?: string);
  constructor(ctxOrBaseURL?: ProviderContext | string, customBaseURL?: string, apiKey?: string) {
    super();
    const [ctx, baseURL] = providerArgs(ctxOrBaseURL, customBaseURL);
    this.ctx = ctx;
    this.apiKey = resolveTmdbApiKey(apiKey, 'MOVIES.MultiStream');
    if (baseURL) {
      if (baseURL.startsWith('http://') || baseURL.startsWith('https://')) {
        this.baseUrl = baseURL;
      } else {
        this.baseUrl = `http://${baseURL}`;
      }
    } else {
      this.baseUrl = this.baseUrl;
    }
  }

  /**
   *
   * @param query search query string
   * @param page page number (default 1) (optional)
   */
  override search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const searchUrl = `${this.apiUrl}/search/multi?api_key=${this.apiKey}&language=en-US&page=${page}&include_adult=false&query=${encodeURIComponent(query)}`;

    const search: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };

    try {
      const { data } = await this.ctx.axios.get(searchUrl);

      if (data.results.length < 1) return search;

      search.hasNextPage = page + 1 <= data.total_pages;
      search.currentPage = page;
      search.totalResults = data.total_results;
      search.totalPages = data.total_pages;

      const moviePromises = data.results.map(async (result: any) => {
        const date = new Date(result?.release_date || result?.first_air_date);

        let totalSeasons;
        if (result.media_type === 'tv') {
          try {
            const { data: tvData } = await this.ctx.axios.get(
              `${this.apiUrl}/tv/${result.id}?api_key=${this.apiKey}&language=en-US`
            );
            totalSeasons = tvData.number_of_seasons;
          } catch (err) {
            // Continue without seasons data if request fails
          }
        }

        const movie: IMovieResult = {
          id: `${result.id}$${result.media_type}`,
          title: result?.title || result?.name,
          image: `https://image.tmdb.org/t/p/original${result?.poster_path}`,
          type: result.media_type === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
          rating: result?.vote_average || 0,
          releaseDate: `${date.getFullYear()}` || '0',
          seasons: totalSeasons,
        };

        return movie;
      });

      search.results = await Promise.all(moviePromises);

      return search;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param mediaId - The media identifier (TMDB ID with type, e.g., "1071585$movie")
   */
  override fetchMediaInfo = async (mediaId: string): Promise<IMovieInfo> => {
    const movieInfo: IMovieInfo = {
      id: mediaId,
      title: '',
    };
    const parts = mediaId.split('$');
    const type = parts[1];
    mediaId = parts[0]!;
    const infoUrl = `${this.apiUrl}/${type}/${parts[0]}?api_key=${this.apiKey}&language=en-US&append_to_response=release_dates,images,recommendations,credits,videos`;
    try {
      const { data } = await this.ctx.axios.get(infoUrl);
      movieInfo.title = data?.title || data?.name;
      movieInfo.image = `https://image.tmdb.org/t/p/original${data?.poster_path}`;
      movieInfo.cover = `https://image.tmdb.org/t/p/original${data?.backdrop_path}`;
      movieInfo.type = type === 'movie' ? TvType.MOVIE : TvType.TVSERIES;
      movieInfo.rating = data?.vote_average || 0;
      movieInfo.releaseDate = data?.release_date || data?.first_air_date;
      movieInfo.description = data?.overview;
      movieInfo.genres = data?.genres.map((genre: { name: string }) => genre.name);
      movieInfo.duration = data?.runtime || data?.episode_run_time[0];
      movieInfo.totalEpisodes = data?.number_of_episodes;
      movieInfo.totalSeasons = data?.number_of_seasons as number;

      movieInfo.characters = data?.credits?.cast.map((cast: any) => ({
        id: cast.id,
        name: cast.name,
        url: `https://www.themoviedb.org/person/${cast.id}`,
        character: cast.character,
        image: `https://image.tmdb.org/t/p/original${cast.profile_path}`,
      }));
      movieInfo.trailer = {
        id: data?.videos?.results[0]?.key,
        site: data?.videos?.results[0]?.site,
        url: `https://www.youtube.com/watch?v=${data?.videos?.results[0]?.key}`,
      };

      movieInfo.recommendations =
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

      if (movieInfo.type === TvType.TVSERIES) {
        movieInfo.episodes = [];
        for (let i = 1; i <= data?.number_of_seasons; i++) {
          const { data } = await this.ctx.axios.get(`${this.apiUrl}/tv/${mediaId}/season/${i}?api_key=${this.apiKey}`);
          data.episodes.map((item: any) => {
            const episode = {
              id: `${mediaId}$tv$${item.episode_number}$${item.season_number}$${item.id}`,
              //first part is mediaId, second is episode number, third is season number, fourth is episode id(to avoid conflicts just in case)
              title: item.name,
              number: item.episode_number,
              season: item.season_number || i,
              description: item.overview,
              image: `https://image.tmdb.org/t/p/original${item.still_path}`,
            };
            movieInfo.episodes?.push(episode);
          });
        }
      } else {
        movieInfo.episodes = [
          {
            id: `${mediaId}$movie`,
            title: movieInfo.title as string,
            description: movieInfo.description,
            image: movieInfo.image,
            number: 1,
          },
        ];
      }

      return movieInfo;
    } catch (err) {
      //console.log(err);
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param episodeId episode id
   * @param mediaId media id
   * @param server server type (defaults to the first from `fetchEpisodeServers`) (optional)
   */
  override fetchEpisodeSources = async (
    episodeId: string,
    mediaId: string,
    server?: StreamingServers
  ): Promise<ISource> => {
    const firstServer = (await this.fetchEpisodeServers(episodeId, mediaId))[0]!.name as StreamingServers;
    return await getMultiSources(this.ctx.axios, episodeId, server ? server : firstServer);
  };

  /**
   *
   * @param episodeId takes episode link or movie id
   * @param mediaId takes movie link or id (found on movie movieInfo object)
   */
  override fetchEpisodeServers = async (episodeId: string, mediaId?: string): Promise<IEpisodeServer[]> => {
    try {
      const servers = await getMultiServers(this.ctx.axios, episodeId);
      return servers;
    } catch (err) {
      console.log(err);
      throw new Error((err as Error).message);
    }
  };
}

// (async () => {
//   const movie = new MultiStream();
//   const search = await movie.search('jujutsu');
//   const movieInfo = await movie.fetchMediaInfo(search.results[0]!.id);
//   // const recentTv = await movie.fetchTrendingTvShows();
//   const servers = await movie.fetchEpisodeServers(movieInfo.episodes![0]!.id, movieInfo.id);
//   console.log(servers);
//   const genre = await movie.fetchEpisodeSources(
//     movieInfo.episodes![0]!.id,
//     movieInfo.id,
//     servers[0]!.name as StreamingServers
//   );
//   console.log(genre);
// })();
