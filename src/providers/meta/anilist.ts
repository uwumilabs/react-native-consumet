import axios, { type AxiosAdapter } from 'axios';

import {
  AnimeParser,
  type ISearch,
  type IAnimeInfo,
  MediaStatus,
  type IAnimeResult,
  type ISource,
  type IAnimeEpisode,
  type IEpisodeServer,
  Genres,
  MangaParser,
  type IMangaChapterPage,
  type IMangaInfo,
  type IMangaResult,
  type IMangaChapter,
  type ProxyConfig,
  type ITitle,
  type IStaff,
  type AniZipEpisode,
} from '../../models';
import {
  anilistSearchQuery,
  anilistMediaDetailQuery,
  anilistTrendingQuery,
  anilistPopularQuery,
  anilistAiringScheduleQuery,
  anilistGenresQuery,
  anilistAdvancedQuery,
  anilistSiteStatisticsQuery,
  anilistCharacterQuery,
  anilistStaffInfoQuery,
  getDays,
  capitalizeFirstLetter,
} from '../../utils';
import Gogoanime from '../anime/gogoanime';
import Anify from '../anime/anify';
import Zoro from '../anime/zoro';
import AnimeKai from '../anime/animekai';
import AnimePahe from '../anime/animepahe';
import Mangasee123 from '../manga/mangasee123';
import AnimeOwl from '../anime/animeowl';
import { ANIFY_URL, findSimilarTitles, getHashFromImage } from '../../utils/utils';

class Anilist extends AnimeParser {
  override readonly name = 'Anilist';
  protected override baseUrl = 'https://anilist.co';
  protected override logo = 'https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg';
  protected override classPath = 'META.Anilist';

  private readonly anilistGraphqlUrl = 'https://graphql.anilist.co';
  private readonly kitsuGraphqlUrl = 'https://kitsu.io/api/graphql';
  private readonly malSyncUrl = 'https://api.malsync.moe';
  private readonly anifyUrl = ANIFY_URL;
  provider: AnimeParser;

  /**
   * This class maps anilist to kitsu with any other anime provider.
   * kitsu is used for episode images, titles and description.
   * @param provider anime provider (optional) default: Gogoanime
   * @param proxyConfig proxy config (optional)
   * @param adapter axios adapter (optional)
   */
  constructor(
    provider?: AnimeParser,
    public proxyConfig?: ProxyConfig,
    adapter?: AxiosAdapter,
    customBaseURL?: string
  ) {
    super(proxyConfig, adapter);
    this.provider = provider || new Zoro(customBaseURL);
  }

  /**
   * @param query Search query
   * @param page Page number (optional)
   * @param perPage Number of results per page (optional) (default: 15) (max: 50)
   */
  override search = async (query: string, page: number = 1, perPage: number = 15): Promise<ISearch<IAnimeResult>> => {
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistSearchQuery(query, page, perPage),
    };

    try {
      let { data, status } = await this.client.post(this.anilistGraphqlUrl, options, {
        validateStatus: () => true,
      });

      if (status >= 500 || status === 429) data = await new Anify().rawSearch(query, page);

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data!.Page?.pageInfo?.currentPage ?? data.meta?.currentPage,
        hasNextPage: data.data!.Page?.pageInfo?.hasNextPage ?? data.meta?.currentPage !== data.meta?.lastPage,
        results:
          data.data?.Page?.media?.map((item: any) => ({
            id: item.id.toString(),
            malId: item.idMal,
            title: item.title
              ? {
                  romaji: item.title.romaji,
                  english: item.title.english,
                  native: item.title.native,
                  userPreferred: item.title.userPreferred,
                }
              : item.title.romaji,
            status:
              item.status === 'RELEASING'
                ? MediaStatus.ONGOING
                : item.status === 'FINISHED'
                  ? MediaStatus.COMPLETED
                  : item.status === 'NOT_YET_RELEASED'
                    ? MediaStatus.NOT_YET_AIRED
                    : item.status === 'CANCELLED'
                      ? MediaStatus.CANCELLED
                      : item.status === 'HIATUS'
                        ? MediaStatus.HIATUS
                        : MediaStatus.UNKNOWN,
            image: item.coverImage?.extraLarge ?? item.coverImage?.large ?? item.coverImage?.medium,
            imageHash: getHashFromImage(
              item.coverImage?.extraLarge ?? item.coverImage?.large ?? item.coverImage?.medium
            ),
            cover: item.bannerImage,
            coverHash: getHashFromImage(item.bannerImage),
            popularity: item.popularity,
            description: item.description,
            rating: item.averageScore,
            genres: item.genres,
            color: item.coverImage?.color,
            totalEpisodes: item.episodes ?? item.nextAiringEpisode?.episode - 1,
            currentEpisodeCount: item?.nextAiringEpisode ? item?.nextAiringEpisode?.episode - 1 : item.episodes,
            type: item.format,
            releaseDate: item.seasonYear,
          })) ??
          data.data.map((item: any) => ({
            id: item.anilistId.toString(),
            malId: item.mappings!.mal!,
            title: item.title,
            status:
              item.status === 'RELEASING'
                ? MediaStatus.ONGOING
                : item.status === 'FINISHED'
                  ? MediaStatus.COMPLETED
                  : item.status === 'NOT_YET_RELEASED'
                    ? MediaStatus.NOT_YET_AIRED
                    : item.status === 'CANCELLED'
                      ? MediaStatus.CANCELLED
                      : item.status === 'HIATUS'
                        ? MediaStatus.HIATUS
                        : MediaStatus.UNKNOWN,
            image: item.coverImage ?? item.bannerImage,
            imageHash: getHashFromImage(item.coverImage ?? item.bannerImage),
            cover: item.bannerImage,
            coverHash: getHashFromImage(item.bannerImage),
            popularity: item.popularity,
            description: item.description,
            rating: item.averageScore,
            genres: item.genre,
            color: item.color,
            totalEpisodes: item.currentEpisode,
            currentEpisodeCount: item?.nextAiringEpisode ? item?.nextAiringEpisode?.episode - 1 : item.currentEpisode,
            type: item.format,
            releaseDate: item.year,
          })),
      };

      return res;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param query Search query (optional)
   * @param type Media type (optional) (default: `ANIME`) (options: `ANIME`, `MANGA`)
   * @param page Page number (optional)
   * @param perPage Number of results per page (optional) (default: `20`) (max: `50`)
   * @param format Format (optional) (options: `TV`, `TV_SHORT`, `MOVIE`, `SPECIAL`, `OVA`, `ONA`, `MUSIC`)
   * @param sort Sort (optional) (Default: `[POPULARITY_DESC, SCORE_DESC]`) (options: `POPULARITY_DESC`, `POPULARITY`, `TRENDING_DESC`, `TRENDING`, `UPDATED_AT_DESC`, `UPDATED_AT`, `START_DATE_DESC`, `START_DATE`, `END_DATE_DESC`, `END_DATE`, `FAVOURITES_DESC`, `FAVOURITES`, `SCORE_DESC`, `SCORE`, `TITLE_ROMAJI_DESC`, `TITLE_ROMAJI`, `TITLE_ENGLISH_DESC`, `TITLE_ENGLISH`, `TITLE_NATIVE_DESC`, `TITLE_NATIVE`, `EPISODES_DESC`, `EPISODES`, `ID`, `ID_DESC`)
   * @param genres Genres (optional) (options: `Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`)
   * @param id anilist Id (optional)
   * @param year Year (optional) e.g. `2022`
   * @param status Status (optional) (options: `RELEASING`, `FINISHED`, `NOT_YET_RELEASED`, `CANCELLED`, `HIATUS`)
   * @param season Season (optional) (options: `WINTER`, `SPRING`, `SUMMER`, `FALL`)
   */
  advancedSearch = async (
    query?: string,
    type: string = 'ANIME',
    page: number = 1,
    perPage: number = 20,
    format?: string,
    sort?: string[],
    genres?: Genres[] | string[],
    id?: string | number,
    year?: number,
    status?: string,
    season?: string
  ): Promise<ISearch<IAnimeResult>> => {
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistAdvancedQuery(),
      variables: {
        search: query,
        type: type,
        page: page,
        size: perPage,
        format: format,
        sort: sort,
        genres: genres,
        id: id,
        year: year ? `${year}%` : undefined,
        status: status,
        season: season,
      },
    };

    if (genres) {
      genres.forEach((genre) => {
        if (!Object.values(Genres).includes(genre as Genres)) {
          throw new Error(`genre ${genre} is not valid`);
        }
      });
    }

    try {
      let { data, status } = await this.client.post(this.anilistGraphqlUrl, options, {
        validateStatus: () => true,
      });

      if (status >= 500 && !query) throw new Error('No results found');
      if (status >= 500) data = await new Anify().rawSearch(query!, page);

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data?.Page?.pageInfo?.currentPage ?? data.meta?.currentPage,
        hasNextPage: data.data?.Page?.pageInfo?.hasNextPage ?? data.meta?.currentPage !== data.meta?.lastPage,
        totalPages: data.data?.Page?.pageInfo?.lastPage,
        totalResults: data.data?.Page?.pageInfo?.total,
        results: [],
      };

      res.results.push(
        ...(data.data?.Page?.media?.map((item: any) => ({
          id: item.id.toString(),
          malId: item.idMal,
          title: item.title
            ? {
                romaji: item.title.romaji,
                english: item.title.english,
                native: item.title.native,
                userPreferred: item.title.userPreferred,
              }
            : item.title.romaji,
          status:
            item.status === 'RELEASING'
              ? MediaStatus.ONGOING
              : item.status === 'FINISHED'
                ? MediaStatus.COMPLETED
                : item.status === 'NOT_YET_RELEASED'
                  ? MediaStatus.NOT_YET_AIRED
                  : item.status === 'CANCELLED'
                    ? MediaStatus.CANCELLED
                    : item.status === 'HIATUS'
                      ? MediaStatus.HIATUS
                      : MediaStatus.UNKNOWN,
          image: item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium,
          imageHash: getHashFromImage(item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium),
          cover: item.bannerImage,
          coverHash: getHashFromImage(item.bannerImage),
          popularity: item.popularity,
          totalEpisodes: item.episodes ?? item.nextAiringEpisode?.episode - 1,
          currentEpisode: item.nextAiringEpisode?.episode - 1 || item.episodes,
          countryOfOrigin: item.countryOfOrigin,
          description: item.description,
          genres: item.genres,
          rating: item.averageScore,
          color: item.coverImage?.color,
          type: item.format,
          releaseDate: item.seasonYear,
        })) ??
          data.data?.map((item: any) => ({
            id: item.anilistId.toString(),
            malId: item.mappings.mal,
            title: item.title,
            status:
              item.status === 'RELEASING'
                ? MediaStatus.ONGOING
                : item.status === 'FINISHED'
                  ? MediaStatus.COMPLETED
                  : item.status === 'NOT_YET_RELEASED'
                    ? MediaStatus.NOT_YET_AIRED
                    : item.status === 'CANCELLED'
                      ? MediaStatus.CANCELLED
                      : item.status === 'HIATUS'
                        ? MediaStatus.HIATUS
                        : MediaStatus.UNKNOWN,
            image: item.coverImage ?? item.bannerImage,
            imageHash: getHashFromImage(item.coverImage ?? item.bannerImage),
            cover: item.bannerImage,
            coverHash: getHashFromImage(item.bannerImage),
            popularity: item.popularity,
            description: item.description,
            rating: item.averageScore,
            genres: item.genre,
            color: item.color,
            totalEpisodes: item.currentEpisode,
            type: item.format,
            releaseDate: item.year,
          })))
      );

      return res;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param id Anime id
   * @param dub to get dubbed episodes (optional) set to `true` to get dubbed episodes. **ONLY WORKS FOR GOGOANIME**
   * @param fetchFiller to get filler boolean on the episode object (optional) set to `true` to get filler boolean on the episode object.
   */
  override fetchAnimeInfo = async (id: string, fetchFiller: boolean = false): Promise<IAnimeInfo> => {
    const animeInfo: IAnimeInfo = {
      id: id,
      title: '',
    };

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistMediaDetailQuery(id),
    };

    let fillerEpisodes: { 'number': string; 'filler-bool': boolean }[];
    try {
      let { data, status } = await this.client.post(this.anilistGraphqlUrl, options, {
        validateStatus: () => true,
      });

      if (status === 404) throw new Error('Media not found. Perhaps the id is invalid or the anime is not in anilist');
      if (status === 429) throw new Error('You have been ratelimited by anilist. Please try again later');
      // if (status >= 500) throw new Error('Anilist seems to be down. Please try again later');
      if (status !== 200 && status < 429)
        throw Error('Media not found. If the problem persists, please contact the developer');
      if (status >= 500) data = await new Anify().fetchAnimeInfoByIdRaw(id);

      animeInfo.malId = data.data?.Media?.idMal ?? data?.mappings?.mal;
      animeInfo.title = data.data.Media
        ? {
            romaji: data.data.Media.title.romaji,
            english: data.data.Media.title.english,
            native: data.data.Media.title.native,
            userPreferred: data.data.Media.title.userPreferred,
          }
        : (data.data.title as ITitle);

      animeInfo.synonyms = data.data?.Media?.synonyms ?? data?.synonyms;
      animeInfo.isLicensed = data.data?.Media?.isLicensed ?? undefined;
      animeInfo.isAdult = data.data?.Media?.isAdult ?? undefined;
      animeInfo.countryOfOrigin = data.data?.Media?.countryOfOrigin ?? undefined;

      if (data.data?.Media?.trailer?.id) {
        animeInfo.trailer = {
          id: data.data.Media.trailer.id,
          site: data.data.Media.trailer?.site,
          thumbnail: data.data.Media.trailer?.thumbnail,
          thumbnailHash: getHashFromImage(data.data.Media.trailer?.thumbnail),
        };
      }
      animeInfo.image =
        data.data?.Media?.coverImage?.extraLarge ??
        data.data?.Media?.coverImage?.large ??
        data.data?.Media?.coverImage?.medium ??
        data.coverImage ??
        data.bannerImage;

      animeInfo.imageHash = getHashFromImage(
        data.data?.Media?.coverImage?.extraLarge ??
          data.data?.Media?.coverImage?.large ??
          data.data?.Media?.coverImage?.medium ??
          data.coverImage ??
          data.bannerImage
      );

      animeInfo.popularity = data.data?.Media?.popularity ?? data?.popularity;
      animeInfo.color = data.data?.Media?.coverImage?.color ?? data?.color;
      animeInfo.cover = data.data?.Media?.bannerImage ?? data?.bannerImage ?? animeInfo.image;
      animeInfo.coverHash = getHashFromImage(data.data?.Media?.bannerImage ?? data?.bannerImage ?? animeInfo.image);
      animeInfo.description = data.data?.Media?.description ?? data?.description;
      switch (data.data?.Media?.status ?? data?.status) {
        case 'RELEASING':
          animeInfo.status = MediaStatus.ONGOING;
          break;
        case 'FINISHED':
          animeInfo.status = MediaStatus.COMPLETED;
          break;
        case 'NOT_YET_RELEASED':
          animeInfo.status = MediaStatus.NOT_YET_AIRED;
          break;
        case 'CANCELLED':
          animeInfo.status = MediaStatus.CANCELLED;
          break;
        case 'HIATUS':
          animeInfo.status = MediaStatus.HIATUS;
          break;
        default:
          animeInfo.status = MediaStatus.UNKNOWN;
      }
      animeInfo.releaseDate = data.data?.Media?.startDate?.year ?? data.year;
      animeInfo.startDate = {
        year: data.data.Media.startDate.year,
        month: data.data.Media.startDate.month,
        day: data.data.Media.startDate.day,
      };
      animeInfo.endDate = {
        year: data.data.Media.endDate.year,
        month: data.data.Media.endDate.month,
        day: data.data.Media.endDate.day,
      };
      if (data.data.Media.nextAiringEpisode?.airingAt)
        animeInfo.nextAiringEpisode = {
          airingTime: data.data.Media.nextAiringEpisode?.airingAt,
          timeUntilAiring: data.data.Media.nextAiringEpisode?.timeUntilAiring,
          episode: data.data.Media.nextAiringEpisode?.episode,
        };
      animeInfo.totalEpisodes = data.data.Media?.episodes ?? data.data.Media.nextAiringEpisode?.episode - 1;
      animeInfo.currentEpisode = data.data.Media?.nextAiringEpisode?.episode
        ? data.data.Media.nextAiringEpisode?.episode - 1
        : data.data.Media?.episodes;
      animeInfo.rating = data.data.Media.averageScore;
      animeInfo.duration = data.data.Media.duration;
      animeInfo.genres = data.data.Media.genres;
      animeInfo.season = data.data.Media.season;
      animeInfo.studios = data.data.Media.studios.edges.map((item: any) => item.node.name);
      animeInfo.type = data.data.Media.format;
      animeInfo.recommendations = data.data.Media?.recommendations?.edges?.map((item: any) => ({
        id: item.node.mediaRecommendation?.id,
        malId: item.node.mediaRecommendation?.idMal,
        title: {
          romaji: item.node.mediaRecommendation?.title?.romaji,
          english: item.node.mediaRecommendation?.title?.english,
          native: item.node.mediaRecommendation?.title?.native,
          userPreferred: item.node.mediaRecommendation?.title?.userPreferred,
        },
        status:
          item.node.mediaRecommendation?.status === 'RELEASING'
            ? MediaStatus.ONGOING
            : item.node.mediaRecommendation?.status === 'FINISHED'
              ? MediaStatus.COMPLETED
              : item.node.mediaRecommendation?.status === 'NOT_YET_RELEASED'
                ? MediaStatus.NOT_YET_AIRED
                : item.node.mediaRecommendation?.status === 'CANCELLED'
                  ? MediaStatus.CANCELLED
                  : item.node.mediaRecommendation?.status === 'HIATUS'
                    ? MediaStatus.HIATUS
                    : MediaStatus.UNKNOWN,
        episodes: item.node.mediaRecommendation?.episodes,
        image:
          item.node.mediaRecommendation?.coverImage?.extraLarge ??
          item.node.mediaRecommendation?.coverImage?.large ??
          item.node.mediaRecommendation?.coverImage?.medium,
        imageHash: getHashFromImage(
          item.node.mediaRecommendation?.coverImage?.extraLarge ??
            item.node.mediaRecommendation?.coverImage?.large ??
            item.node.mediaRecommendation?.coverImage?.medium
        ),
        cover:
          item.node.mediaRecommendation?.bannerImage ??
          item.node.mediaRecommendation?.coverImage?.extraLarge ??
          item.node.mediaRecommendation?.coverImage?.large ??
          item.node.mediaRecommendation?.coverImage?.medium,
        coverHash: getHashFromImage(
          item.node.mediaRecommendation?.bannerImage ??
            item.node.mediaRecommendation?.coverImage?.extraLarge ??
            item.node.mediaRecommendation?.coverImage?.large ??
            item.node.mediaRecommendation?.coverImage?.medium
        ),
        rating: item.node.mediaRecommendation?.meanScore,
        type: item.node.mediaRecommendation?.format,
      }));

      animeInfo.characters = data.data?.Media?.characters?.edges?.map((item: any) => ({
        id: item.node?.id,
        role: item.role,
        name: {
          first: item.node.name.first,
          last: item.node.name.last,
          full: item.node.name.full,
          native: item.node.name.native,
          userPreferred: item.node.name.userPreferred,
        },
        image: item.node.image.large ?? item.node.image.medium,
        imageHash: getHashFromImage(item.node.image.large ?? item.node.image.medium),
        voiceActors: item.voiceActors.map((voiceActor: any) => ({
          id: voiceActor.id,
          language: voiceActor.languageV2,
          name: {
            first: voiceActor.name.first,
            last: voiceActor.name.last,
            full: voiceActor.name.full,
            native: voiceActor.name.native,
            userPreferred: voiceActor.name.userPreferred,
          },
          image: voiceActor.image.large ?? voiceActor.image.medium,
          imageHash: getHashFromImage(voiceActor.image.large ?? voiceActor.image.medium),
        })),
      }));

      animeInfo.relations = data.data?.Media?.relations?.edges?.map((item: any) => ({
        id: item.node.id,
        relationType: item.relationType,
        malId: item.node.idMal,
        title: {
          romaji: item.node.title.romaji,
          english: item.node.title.english,
          native: item.node.title.native,
          userPreferred: item.node.title.userPreferred,
        },
        status:
          item.node.status === 'RELEASING'
            ? MediaStatus.ONGOING
            : item.node.status === 'FINISHED'
              ? MediaStatus.COMPLETED
              : item.node.status === 'NOT_YET_RELEASED'
                ? MediaStatus.NOT_YET_AIRED
                : item.node.status === 'CANCELLED'
                  ? MediaStatus.CANCELLED
                  : item.node.status === 'HIATUS'
                    ? MediaStatus.HIATUS
                    : MediaStatus.UNKNOWN,
        episodes: item.node.episodes,
        image: item.node.coverImage.extraLarge ?? item.node.coverImage.large ?? item.node.coverImage.medium,
        imageHash: getHashFromImage(
          item.node.coverImage.extraLarge ?? item.node.coverImage.large ?? item.node.coverImage.medium
        ),
        color: item.node.coverImage?.color,
        type: item.node.format,
        cover:
          item.node.bannerImage ??
          item.node.coverImage.extraLarge ??
          item.node.coverImage.large ??
          item.node.coverImage.medium,
        coverHash: getHashFromImage(
          item.node.bannerImage ??
            item.node.coverImage.extraLarge ??
            item.node.coverImage.large ??
            item.node.coverImage.medium
        ),
        rating: item.node.meanScore,
      }));
      if (this.provider instanceof Zoro || this.provider instanceof Gogoanime) {
        try {
          const anifyInfo = await new Anify(
            this.proxyConfig,
            this.adapter,
            this.provider.name.toLowerCase() as 'gogoanime' | 'zoro' | 'animepahe' | '9anime'
          ).fetchAnimeInfo(id);
          animeInfo.mappings = anifyInfo.mappings;
          animeInfo.artwork = anifyInfo.artwork;
          animeInfo.episodes = anifyInfo.episodes?.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            number: item.number,
            image: item.image,
            imageHash: getHashFromImage(item.image),
            airDate: item.airDate ?? null,
          }));
          if (!animeInfo.episodes?.length) {
            animeInfo.episodes = await this.fetchDefaultEpisodeList({
              idMal: animeInfo.malId! as number,
              season: data.data.Media.season,
              startDate: { year: parseInt(animeInfo.releaseDate!) },
              title: {
                english: animeInfo.title?.english!,
                romaji: animeInfo.title?.romaji!,
              },
            });
            animeInfo.episodes = animeInfo.episodes?.map((episode: IAnimeEpisode) => {
              if (!episode.image) {
                episode.image = animeInfo.image;
                episode.imageHash = animeInfo.imageHash;
              }

              return episode;
            });
          }
        } catch (err) {
          animeInfo.episodes = await this.fetchDefaultEpisodeList({
            idMal: animeInfo.malId! as number,
            season: data.data.Media.season,
            startDate: { year: parseInt(animeInfo.releaseDate!) },
            title: {
              english: animeInfo.title?.english!,
              romaji: animeInfo.title?.romaji!,
            },
          });

          animeInfo.episodes = animeInfo.episodes?.map((episode: IAnimeEpisode) => {
            if (!episode.image) {
              episode.image = animeInfo.image;
              episode.imageHash = animeInfo.imageHash;
            }

            return episode;
          });

          return animeInfo;
        }
      } else
        animeInfo.episodes = await this.fetchDefaultEpisodeList({
          idMal: animeInfo.malId! as number,
          season: data.data.Media.season,
          startDate: { year: parseInt(animeInfo.releaseDate!) },
          title: {
            english: animeInfo.title?.english!,
            romaji: animeInfo.title?.romaji!,
          },
          externalLinks: data.data.Media.externalLinks.filter((link: any) => link.type === 'STREAMING'),
        });

      if (fetchFiller) {
        const { data: fillerData } = await this.client.get(
          `https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${animeInfo.malId}.json`,
          { validateStatus: () => true }
        );

        if (!fillerData.toString().startsWith('404')) {
          fillerEpisodes = [];
          fillerEpisodes?.push(
            ...(fillerData.episodes as {
              'number': string;
              'filler-bool': boolean;
            }[])
          );
        }
      }

      animeInfo.episodes = animeInfo.episodes?.map((episode: IAnimeEpisode) => {
        if (!episode.image) {
          episode.image = animeInfo.image;
          episode.imageHash = animeInfo.imageHash;
        }

        if (fetchFiller && fillerEpisodes?.length > 0 && fillerEpisodes?.length >= animeInfo.episodes!.length) {
          if (fillerEpisodes[episode.number! - 1])
            episode.isFiller = new Boolean(fillerEpisodes?.[episode.number! - 1]!['filler-bool']).valueOf();
        }

        return episode;
      });

      return animeInfo;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param episodeId Episode id
   */
  override fetchEpisodeSources = async (episodeId: string, ...args: any): Promise<ISource> => {
    try {
      if (this.provider instanceof Anify) return new Anify().fetchEpisodeSources(episodeId, args[0], args[1]);
      return this.provider.fetchEpisodeSources(episodeId, ...args);
    } catch (err) {
      throw new Error(`Failed to fetch episode sources from ${this.provider.name}: ${err}`);
    }
  };

  /**
   *
   * @param episodeId Episode id
   */
  override fetchEpisodeServers = async (episodeId: string): Promise<IEpisodeServer[]> => {
    try {
      return this.provider.fetchEpisodeServers(episodeId);
    } catch (err) {
      throw new Error(`Failed to fetch episode servers from ${this.provider.name}: ${err}`);
    }
  };

  /**
   * @param page page number to search for (optional)
   * @param perPage number of results per page (optional)
   */
  fetchTrendingAnime = async (page: number = 1, perPage: number = 10): Promise<ISearch<IAnimeResult>> => {
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistTrendingQuery(page, perPage),
    };

    try {
      const { data } = await this.client.post(this.anilistGraphqlUrl, options);

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.media.map((item: any) => ({
          id: item.id.toString(),
          malId: item.idMal,
          title: item.title
            ? {
                romaji: item.title.romaji,
                english: item.title.english,
                native: item.title.native,
                userPreferred: item.title.userPreferred,
              }
            : item.title.romaji,
          image: item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium,
          imageHash: getHashFromImage(item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium),
          trailer: {
            id: item.trailer?.id,
            site: item.trailer?.site,
            thumbnail: item.trailer?.thumbnail,
            thumbnailHash: getHashFromImage(item.trailer?.thumbnail),
          },
          description: item.description,
          status:
            item.status === 'RELEASING'
              ? MediaStatus.ONGOING
              : item.status === 'FINISHED'
                ? MediaStatus.COMPLETED
                : item.status === 'NOT_YET_RELEASED'
                  ? MediaStatus.NOT_YET_AIRED
                  : item.status === 'CANCELLED'
                    ? MediaStatus.CANCELLED
                    : item.status === 'HIATUS'
                      ? MediaStatus.HIATUS
                      : MediaStatus.UNKNOWN,
          cover: item.bannerImage ?? item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium,
          coverHash: getHashFromImage(
            item.bannerImage ?? item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium
          ),
          rating: item.averageScore,
          releaseDate: item.seasonYear,
          color: item.coverImage?.color,
          genres: item.genres,
          totalEpisodes: isNaN(item.episodes) ? 0 : (item.episodes ?? item.nextAiringEpisode?.episode - 1 ?? 0),
          duration: item.duration,
          type: item.format,
        })),
      };
      return res;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param page page number to search for (optional)
   * @param perPage number of results per page (optional)
   */
  fetchPopularAnime = async (page: number = 1, perPage: number = 10): Promise<ISearch<IAnimeResult>> => {
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistPopularQuery(page, perPage),
    };

    try {
      const { data } = await this.client.post(this.anilistGraphqlUrl, options);

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.media.map((item: any) => ({
          id: item.id.toString(),
          malId: item.idMal,
          title: item.title
            ? {
                romaji: item.title.romaji,
                english: item.title.english,
                native: item.title.native,
                userPreferred: item.title.userPreferred,
              }
            : item.title.romaji,
          image: item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium,
          imageHash: getHashFromImage(item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium),
          trailer: {
            id: item.trailer?.id,
            site: item.trailer?.site,
            thumbnail: item.trailer?.thumbnail,
            thumbnailHash: getHashFromImage(item.trailer?.thumbnail),
          },
          description: item.description,
          status:
            item.status === 'RELEASING'
              ? MediaStatus.ONGOING
              : item.status === 'FINISHED'
                ? MediaStatus.COMPLETED
                : item.status === 'NOT_YET_RELEASED'
                  ? MediaStatus.NOT_YET_AIRED
                  : item.status === 'CANCELLED'
                    ? MediaStatus.CANCELLED
                    : item.status === 'HIATUS'
                      ? MediaStatus.HIATUS
                      : MediaStatus.UNKNOWN,
          cover: item.bannerImage ?? item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium,
          coverHash: getHashFromImage(
            item.bannerImage ?? item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium
          ),
          rating: item.averageScore,
          releaseDate: item.seasonYear,
          color: item.coverImage?.color,
          genres: item.genres,
          totalEpisodes: isNaN(item.episodes) ? 0 : (item.episodes ?? item.nextAiringEpisode?.episode - 1 ?? 0),
          duration: item.duration,
          type: item.format,
        })),
      };
      return res;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param page page number (optional)
   * @param perPage number of results per page (optional)
   * @param weekStart Filter by the start of the week (optional) (default: todays date) (options: 2 = Monday, 3 = Tuesday, 4 = Wednesday, 5 = Thursday, 6 = Friday, 0 = Saturday, 1 = Sunday) you can use either the number or the string
   * @param weekEnd Filter by the end of the week (optional) similar to weekStart
   * @param notYetAired if true will return anime that have not yet aired (optional)
   * @returns the next airing episodes
   */
  fetchAiringSchedule = async (
    page: number = 1,
    perPage: number = 20,
    weekStart: number | string = (new Date().getDay() + 1) % 7,
    weekEnd: number | string = (new Date().getDay() + 7) % 7,
    notYetAired: boolean = false
  ): Promise<ISearch<IAnimeResult>> => {
    let day1, day2;

    if (typeof weekStart === 'string' && typeof weekEnd === 'string')
      [day1, day2] = getDays(
        capitalizeFirstLetter(weekStart.toLowerCase()),
        capitalizeFirstLetter(weekEnd.toLowerCase())
      );
    else if (typeof weekStart === 'number' && typeof weekEnd === 'number') [day1, day2] = [weekStart, weekEnd];
    else throw new Error('Invalid weekStart or weekEnd');

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistAiringScheduleQuery(page, perPage, day1!, day2!, notYetAired),
    };

    try {
      const { data } = await this.client.post(this.anilistGraphqlUrl, options);

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.airingSchedules.map((item: any) => ({
          id: item.media.id.toString(),
          malId: item.media.idMal,
          episode: item.episode,
          airingAt: item.airingAt,
          title: item.media.title
            ? {
                romaji: item.media.title.romaji,
                english: item.media.title.english,
                native: item.media.title.native,
                userPreferred: item.media.title.userPreferred,
              }
            : item.media.title.romaji,
          country: item.media.countryOfOrigin,
          image: item.media.coverImage.extraLarge ?? item.media.coverImage.large ?? item.media.coverImage.medium,
          imageHash: getHashFromImage(
            item.media.coverImage.extraLarge ?? item.media.coverImage.large ?? item.media.coverImage.medium
          ),
          description: item.media.description,
          cover:
            item.media.bannerImage ??
            item.media.coverImage.extraLarge ??
            item.media.coverImage.large ??
            item.media.coverImage.medium,
          coverHash: getHashFromImage(
            item.media.bannerImage ??
              item.media.coverImage.extraLarge ??
              item.media.coverImage.large ??
              item.media.coverImage.medium
          ),
          genres: item.media.genres,
          color: item.media.coverImage?.color,
          rating: item.media.averageScore,
          releaseDate: item.media.seasonYear,
          type: item.media.format,
        })),
      };
      return res;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param genres An array of genres to filter by (optional) genres: [`Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`]
   * @param page page number (optional)
   * @param perPage number of results per page (optional)
   */
  fetchAnimeGenres = async (genres: string[] | Genres[], page: number = 1, perPage: number = 20) => {
    if (genres.length === 0) throw new Error('No genres specified');

    for (const genre of genres) if (!Object.values(Genres).includes(genre as Genres)) throw new Error('Invalid genre');

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistGenresQuery(genres, page, perPage),
    };
    try {
      const { data } = await this.client.post(this.anilistGraphqlUrl, options);

      const res: ISearch<IAnimeResult> = {
        currentPage: data.data.Page.pageInfo.currentPage,
        hasNextPage: data.data.Page.pageInfo.hasNextPage,
        results: data.data.Page.media.map((item: any) => ({
          id: item.id.toString(),
          malId: item.idMal,
          title: item.title
            ? {
                romaji: item.title.romaji,
                english: item.title.english,
                native: item.title.native,
                userPreferred: item.title.userPreferred,
              }
            : item.title.romaji,
          image: item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium,
          imageHash: getHashFromImage(item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium),
          trailer: {
            id: item.trailer?.id,
            site: item.trailer?.site,
            thumbnail: item.trailer?.thumbnail,
            thumbnailHash: getHashFromImage(item.trailer?.thumbnail),
          },
          description: item.description,
          cover: item.bannerImage ?? item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium,
          coverHash: getHashFromImage(
            item.bannerImage ?? item.coverImage.extraLarge ?? item.coverImage.large ?? item.coverImage.medium
          ),
          rating: item.averageScore,
          releaseDate: item.seasonYear,
          color: item.coverImage?.color,
          genres: item.genres,
          totalEpisodes: isNaN(item.episodes) ? 0 : (item.episodes ?? item.nextAiringEpisode?.episode - 1 ?? 0),
          duration: item.duration,
          type: item.format,
        })),
      };
      return res;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  private findAnimeRaw = async (title: ITitle) => {
    const searchTerm = title?.romaji || title?.english || title?.userPreferred || '';
    const findAnime = (await this.provider.search(searchTerm)) as ISearch<IAnimeResult>;

    if (!findAnime?.results) {
      return {} as IAnimeEpisode[];
    }

    // Run similar title searches in parallel
    const [mappedEng, mappedRom] = await Promise.all([
      Promise.resolve(findSimilarTitles(title?.english || '', findAnime.results)),
      Promise.resolve(findSimilarTitles(title?.romaji || '', findAnime.results)),
    ]);

    // Use Set for efficient deduplication
    const uniqueResults = Array.from(new Set([...mappedEng, ...mappedRom].map((item) => JSON.stringify(item)))).map(
      (str) => JSON.parse(str)
    );

    // Sort by similarity score
    uniqueResults.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    const mappings: any = {};
    for (const obj of uniqueResults) {
      const match = obj.title.replace(/\(TV\)/g, '').match(/\(([^)0-9]+)\)/);
      const key = match ? match[1].replace(/\s+/g, '-').toLowerCase() : 'sub';

      if (!mappings[key]) {
        mappings[key] = obj.id;
      }

      // Early return if we have both sub and dub
      if (mappings.sub && mappings.dub) break;
    }
    // console.log('mappings', mappings);
    // console.time('animeinfo');
    const animeInfo = await this.provider.fetchAnimeInfo(mappings.sub || mappings.dub);
    // console.timeEnd('animeinfo');
    return animeInfo.episodes as IAnimeEpisode[];
  };
  /**
   * @returns a random anime
   */
  fetchRandomAnime = async (): Promise<IAnimeInfo> => {
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistSiteStatisticsQuery(),
    };

    try {
      // const {
      //   data: { data },
      // } = await this.client.post(this.anilistGraphqlUrl, options);

      // const selectedAnime = Math.floor(
      //   Math.random() * data.SiteStatistics.anime.nodes[data.SiteStatistics.anime.nodes.length - 1].count
      // );
      // const { results } = await this.advancedSearch(undefined, 'ANIME', Math.ceil(selectedAnime / 50), 50);

      const { data: data } = await this.client.get('https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt');

      const ids = data?.trim().split('\n');
      const selectedAnime = Math.floor(Math.random() * ids.length);
      return await this.fetchAnimeInfo(ids[selectedAnime]);
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * @param provider The provider to get the episode Ids from (optional) default: `gogoanime` (options: `gogoanime`, `zoro`)
   * @param page page number (optional)
   * @param perPage number of results per page (optional)
   */
  fetchRecentEpisodes = async (
    provider: 'gogoanime' | 'zoro' = 'gogoanime',
    page: number = 1,
    perPage: number = 25
  ): Promise<ISearch<IAnimeResult>> => {
    try {
      const { data } = await this.client.get(`${this.anifyUrl}/recent?page=${page}&perPage=${perPage}&type=anime`);

      const results: IAnimeInfo[] = data?.map((item: any) => {
        return {
          id: item.id.toString(),
          malId: item.mappings.find((item: any) => item.providerType === 'META' && item.providerId === 'mal')?.id,
          title: {
            romaji: item.title?.romaji,
            english: item.title?.english,
            native: item.title?.native,
            // userPreferred: (_f = item.title) === null || _f === void 0 ? void 0 : _f.userPreferred,
          },
          image: item.coverImage ?? item.bannerImage,
          imageHash: getHashFromImage(item.coverImage ?? item.bannerImage),
          rating: item.averageScore,
          color: item.anime?.color,
          episodeId: `${
            provider === 'gogoanime'
              ? item.episodes.data
                  .find((source: any) => source.providerId.toLowerCase() === 'gogoanime')
                  ?.episodes.pop()?.id
              : item.episodes.data.find((source: any) => source.providerId.toLowerCase() === 'zoro')?.episodes.pop()?.id
          }`,
          episodeTitle: item.episodes.latest.latestTitle ?? `Episode ${item.currentEpisode}`,
          episodeNumber: item.currentEpisode,
          genres: item.genre,
          type: item.format,
        };
      });
      // results = results.filter((item) => item.episodeNumber !== 0 &&
      //     item.episodeId.replace('-enime', '').length > 0 &&
      //     item.episodeId.replace('-enime', '') !== 'undefined');
      return {
        currentPage: page,
        // hasNextPage: meta.lastPage !== page,
        // totalPages: meta.lastPage,
        totalResults: results?.length,
        results: results,
      };
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  private fetchDefaultEpisodeList = async (Media: {
    idMal: number;
    title: { english: string; romaji: string };
    season: string;
    startDate: { year: number };
    externalLinks?: any;
  }) => {
    let episodes: IAnimeEpisode[] = [];

    episodes = await this.findAnimeRaw({ english: Media.title?.english!, romaji: Media.title?.romaji! });
    // console.log('fetchDefaultEpisodeList', episodes);
    return episodes;
  };

  /**
   * @param id anilist id
   * @param fetchFiller to get filler boolean on the episode object (optional) set to `true` to get filler boolean on the episode object.
   * @returns episode list **(without anime info)**
   */
  fetchEpisodesListById = async (id: string, fetchFiller: boolean = false) => {
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: `query($id: Int = ${id}){ Media(id: $id){ idMal externalLinks { site url } title { romaji english } status season episodes startDate { year month day } endDate { year month day }  coverImage {extraLarge large medium} } }`,
    };

    const {
      data: {
        data: { Media },
      },
    } = await this.client.post(this.anilistGraphqlUrl, options);

    let possibleAnimeEpisodes: IAnimeEpisode[] = [];
    let fillerEpisodes: { 'number': string; 'filler-bool': boolean }[] = [];
    if (
      this.provider instanceof Zoro ||
      this.provider instanceof Gogoanime ||
      this.provider instanceof AnimeKai ||
      this.provider instanceof AnimePahe ||
      this.provider instanceof AnimeOwl
    ) {
      try {
        // console.time('fetchEpisodesListById');
        const [animeMetaData, providerEpisodes] = await Promise.all([
          this.client.get(`https://api.ani.zip/mappings?anilist_id=${id}`).then((res) => res.data),
          this.fetchDefaultEpisodeList(Media),
        ]);
        // console.timeEnd('fetchEpisodesListById');
        //to get the actual episode ids we make use of fetchDefaultEpisodeList
        const normalizedEpisodes = (
          Object.entries(animeMetaData.episodes || {}) as [string, AniZipEpisode & IAnimeEpisode][]
        ).map(([key, item]) => ({
          title: item.title.en ?? item.title['x-jat'],
          uniqueId: `${id}$ep=${item.episodeNumber ?? item.episode}`,
          description: item.overview ?? item.summary,
          number: item.episodeNumber ?? parseInt(item.episode),
          image: item.image,
          imageHash: getHashFromImage(item.image),
          releaseDate: item.airDate ?? item.airdate ?? item.airDateUtc,
        }));

        function mergeEpisodes(normalizedEpisodes: any[], providerEpisodes: IAnimeEpisode[]): IAnimeEpisode[] {
          const numberMap = new Map<number, any>();
          const dateMap = new Map<number, any>();
          const usedNormalized = new Set<string>();

          normalizedEpisodes.forEach((ep) => {
            if (ep.number) numberMap.set(ep.number, ep);
            if (ep.releaseDate) {
              const ts = new Date(ep.releaseDate).getTime();
              dateMap.set(ts, ep);
            }
          });

          return providerEpisodes.map((providerEp, index) => {
            let normalizedEp: any = null;

            const matchIfNotUsed = (ep: any) => ep && !usedNormalized.has(ep.uniqueId);

            // Match by release date (within ±1 day)
            if (providerEp.releaseDate) {
              const ts = new Date(providerEp.releaseDate).getTime();
              for (let [normTs, normEp] of dateMap) {
                if (Math.abs(ts - normTs) <= 86400000 && matchIfNotUsed(normEp)) {
                  normalizedEp = normEp;
                  break;
                }
              }
            }

            // Match by episode number
            if (!normalizedEp && providerEp.number != null) {
              const ep = numberMap.get(providerEp.number);
              if (matchIfNotUsed(ep)) normalizedEp = ep;
            }

            // Match by title similarity
            if (!normalizedEp && providerEp.title) {
              normalizedEp = normalizedEpisodes.find(
                (normEp) => matchIfNotUsed(normEp) && normEp.title?.includes(providerEp.title)
              );
            }

            // Fallback to same index
            if (!normalizedEp && matchIfNotUsed(normalizedEpisodes[index])) {
              normalizedEp = normalizedEpisodes[index];
            }

            // Mark this normalized episode as used
            if (normalizedEp) {
              usedNormalized.add(normalizedEp.uniqueId);
            }

            if (!normalizedEp) return providerEp;

            return {
              ...providerEp,
              number: normalizedEp.number || providerEp.number,
              uniqueId: normalizedEp.uniqueId || providerEp.uniqueId,
              title: normalizedEp.title || providerEp.title,
              description: normalizedEp.description || providerEp.description,
              image: normalizedEp.image || providerEp.image,
              imageHash: normalizedEp.imageHash || providerEp.imageHash,
              releaseDate: normalizedEp.releaseDate || providerEp.releaseDate,
            };
          });
        }

        console.log({
          normalizedEpisodes,
          providerEpisodes,
          merged: mergeEpisodes(normalizedEpisodes, providerEpisodes),
        });
        possibleAnimeEpisodes = mergeEpisodes(normalizedEpisodes, providerEpisodes);
        if (!possibleAnimeEpisodes.length) {
          possibleAnimeEpisodes = await this.fetchDefaultEpisodeList(Media);
          possibleAnimeEpisodes = possibleAnimeEpisodes?.map((episode: IAnimeEpisode) => {
            if (!episode.image) {
              episode.image = Media.coverImage.extraLarge ?? Media.coverImage.large ?? Media.coverImage.medium;
              episode.imageHash = getHashFromImage(
                Media.coverImage.extraLarge ?? Media.coverImage.large ?? Media.coverImage.medium
              );
            }

            return episode;
          });
        }
      } catch (err) {
        possibleAnimeEpisodes = await this.fetchDefaultEpisodeList(Media);

        possibleAnimeEpisodes = possibleAnimeEpisodes?.map((episode: IAnimeEpisode) => {
          if (!episode.image) {
            episode.image = Media.coverImage.extraLarge ?? Media.coverImage.large ?? Media.coverImage.medium;
            episode.imageHash = getHashFromImage(
              Media.coverImage.extraLarge ?? Media.coverImage.large ?? Media.coverImage.medium
            );
          }

          return episode;
        });
        return possibleAnimeEpisodes;
      }
    } else possibleAnimeEpisodes = await this.fetchDefaultEpisodeList(Media);

    if (fetchFiller) {
      const { data: fillerData } = await this.client.get(
        `https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${Media.idMal}.json`,
        {
          validateStatus: () => true,
        }
      );

      if (!fillerData.toString().startsWith('404')) {
        fillerEpisodes = [];
        fillerEpisodes?.push(
          ...(fillerData.episodes as {
            'number': string;
            'filler-bool': boolean;
          }[])
        );
      }
    }

    possibleAnimeEpisodes = possibleAnimeEpisodes?.map((episode: IAnimeEpisode) => {
      if (!episode.image) {
        episode.image = Media.coverImage.extraLarge ?? Media.coverImage.large ?? Media.coverImage.medium;
        episode.imageHash = getHashFromImage(
          Media.coverImage.extraLarge ?? Media.coverImage.large ?? Media.coverImage.medium
        );
      }

      if (fetchFiller && fillerEpisodes?.length > 0 && fillerEpisodes?.length >= Media.episodes) {
        if (fillerEpisodes[episode.number! - 1])
          episode.isFiller = new Boolean(fillerEpisodes[episode.number! - 1]!['filler-bool']).valueOf();
      }

      return episode;
    });

    return possibleAnimeEpisodes;
  };

  /**
   * @param id anilist id
   * @returns anilist data for the anime **(without episodes)** (use `fetchEpisodesListById` to get the episodes) (use `fetchAnimeInfo` to get both)
   */
  fetchAnilistInfoById = async (id: string) => {
    const animeInfo: IAnimeInfo = {
      id: id,
      title: '',
    };

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistMediaDetailQuery(id),
    };

    try {
      const { data } = await this.client.post(this.anilistGraphqlUrl, options).catch(() => {
        throw new Error('Media not found');
      });
      animeInfo.malId = data.data.Media.idMal;
      animeInfo.title = {
        romaji: data.data.Media.title.romaji,
        english: data.data.Media.title.english,
        native: data.data.Media.title.native,
        userPreferred: data.data.Media.title.userPreferred,
      };

      if (data.data.Media.trailer?.id) {
        animeInfo.trailer = {
          id: data.data.Media.trailer?.id,
          site: data.data.Media.trailer?.site,
          thumbnail: data.data.Media.trailer?.thumbnail,
          thumbnailHash: getHashFromImage(data.data.Media.trailer?.thumbnail),
        };
      }

      animeInfo.synonyms = data.data.Media.synonyms;
      animeInfo.isLicensed = data.data.Media.isLicensed;
      animeInfo.isAdult = data.data.Media.isAdult;
      animeInfo.countryOfOrigin = data.data.Media.countryOfOrigin;

      animeInfo.image =
        data.data.Media.coverImage.extraLarge ?? data.data.Media.coverImage.large ?? data.data.Media.coverImage.medium;

      animeInfo.imageHash = getHashFromImage(
        data.data.Media.coverImage.extraLarge ?? data.data.Media.coverImage.large ?? data.data.Media.coverImage.medium
      );
      animeInfo.cover = data.data.Media.bannerImage ?? animeInfo.image;
      animeInfo.coverHash = getHashFromImage(data.data.Media.bannerImage ?? animeInfo.image);
      animeInfo.description = data.data.Media.description;
      switch (data.data.Media.status) {
        case 'RELEASING':
          animeInfo.status = MediaStatus.ONGOING;
          break;
        case 'FINISHED':
          animeInfo.status = MediaStatus.COMPLETED;
          break;
        case 'NOT_YET_RELEASED':
          animeInfo.status = MediaStatus.NOT_YET_AIRED;
          break;
        case 'CANCELLED':
          animeInfo.status = MediaStatus.CANCELLED;
          break;
        case 'HIATUS':
          animeInfo.status = MediaStatus.HIATUS;
          break;
        default:
          animeInfo.status = MediaStatus.UNKNOWN;
      }
      animeInfo.releaseDate = data.data.Media.startDate.year;
      if (data.data.Media.nextAiringEpisode?.airingAt)
        animeInfo.nextAiringEpisode = {
          airingTime: data.data.Media.nextAiringEpisode?.airingAt,
          timeUntilAiring: data.data.Media.nextAiringEpisode?.timeUntilAiring,
          episode: data.data.Media.nextAiringEpisode?.episode,
        };

      animeInfo.totalEpisodes = data.data.Media?.episodes ?? data.data.Media.nextAiringEpisode?.episode - 1;
      animeInfo.currentEpisode = data.data.Media?.nextAiringEpisode?.episode
        ? data.data.Media.nextAiringEpisode?.episode - 1
        : data.data.Media?.episodes || undefined;
      animeInfo.rating = data.data.Media.averageScore;
      animeInfo.duration = data.data.Media.duration;
      animeInfo.genres = data.data.Media.genres;
      animeInfo.studios = data.data.Media.studios.edges.map((item: any) => item.node.name);
      animeInfo.season = data.data.Media.season;
      animeInfo.popularity = data.data.Media.popularity;
      animeInfo.type = data.data.Media.format;
      animeInfo.startDate = {
        year: data.data.Media.startDate?.year,
        month: data.data.Media.startDate?.month,
        day: data.data.Media.startDate?.day,
      };
      animeInfo.endDate = {
        year: data.data.Media.endDate?.year,
        month: data.data.Media.endDate?.month,
        day: data.data.Media.endDate?.day,
      };
      animeInfo.recommendations = data.data.Media.recommendations.edges.map((item: any) => ({
        id: item.node.mediaRecommendation.id,
        malId: item.node.mediaRecommendation.idMal,
        title: {
          romaji: item.node.mediaRecommendation.title.romaji,
          english: item.node.mediaRecommendation.title.english,
          native: item.node.mediaRecommendation.title.native,
          userPreferred: item.node.mediaRecommendation.title.userPreferred,
        },
        status:
          item.node.mediaRecommendation.status === 'RELEASING'
            ? MediaStatus.ONGOING
            : item.node.mediaRecommendation.status === 'FINISHED'
              ? MediaStatus.COMPLETED
              : item.node.mediaRecommendation.status === 'NOT_YET_RELEASED'
                ? MediaStatus.NOT_YET_AIRED
                : item.node.mediaRecommendation.status === 'CANCELLED'
                  ? MediaStatus.CANCELLED
                  : item.node.mediaRecommendation.status === 'HIATUS'
                    ? MediaStatus.HIATUS
                    : MediaStatus.UNKNOWN,
        episodes: item.node.mediaRecommendation.episodes,
        image:
          item.node.mediaRecommendation.coverImage.extraLarge ??
          item.node.mediaRecommendation.coverImage.large ??
          item.node.mediaRecommendation.coverImage.medium,
        imageHash: getHashFromImage(
          item.node.mediaRecommendation.coverImage.extraLarge ??
            item.node.mediaRecommendation.coverImage.large ??
            item.node.mediaRecommendation.coverImage.medium
        ),
        cover:
          item.node.mediaRecommendation.bannerImage ??
          item.node.mediaRecommendation.coverImage.extraLarge ??
          item.node.mediaRecommendation.coverImage.large ??
          item.node.mediaRecommendation.coverImage.medium,
        coverHash:
          item.node.mediaRecommendation.bannerImage ??
          item.node.mediaRecommendation.coverImage.extraLarge ??
          item.node.mediaRecommendation.coverImage.large ??
          item.node.mediaRecommendation.coverImage.medium,
        rating: item.node.mediaRecommendation.meanScore,
        type: item.node.mediaRecommendation.format,
      }));

      animeInfo.characters = data.data.Media.characters.edges.map((item: any) => ({
        id: item.node.id,
        role: item.role,
        name: {
          first: item.node.name.first,
          last: item.node.name.last,
          full: item.node.name.full,
          native: item.node.name.native,
          userPreferred: item.node.name.userPreferred,
        },
        image: item.node.image.large ?? item.node.image.medium,
        imageHash: getHashFromImage(item.node.image.large ?? item.node.image.medium),
        voiceActors: item.voiceActors.map((voiceActor: any) => ({
          id: voiceActor.id,
          language: voiceActor.languageV2,
          name: {
            first: voiceActor.name.first,
            last: voiceActor.name.last,
            full: voiceActor.name.full,
            native: voiceActor.name.native,
            userPreferred: voiceActor.name.userPreferred,
          },
          image: voiceActor.image.large ?? voiceActor.image.medium,
          imageHash: getHashFromImage(voiceActor.image.large ?? voiceActor.image.medium),
        })),
      }));
      animeInfo.color = data.data.Media.coverImage?.color;
      animeInfo.relations = data.data.Media.relations.edges.map((item: any) => ({
        id: item.node.id,
        malId: item.node.idMal,
        relationType: item.relationType,
        title: {
          romaji: item.node.title.romaji,
          english: item.node.title.english,
          native: item.node.title.native,
          userPreferred: item.node.title.userPreferred,
        },
        status:
          item.node.status === 'RELEASING'
            ? MediaStatus.ONGOING
            : item.node.status === 'FINISHED'
              ? MediaStatus.COMPLETED
              : item.node.status === 'NOT_YET_RELEASED'
                ? MediaStatus.NOT_YET_AIRED
                : item.node.status === 'CANCELLED'
                  ? MediaStatus.CANCELLED
                  : item.node.status === 'HIATUS'
                    ? MediaStatus.HIATUS
                    : MediaStatus.UNKNOWN,
        episodes: item.node.episodes,

        image: item.node.coverImage.extraLarge ?? item.node.coverImage.large ?? item.node.coverImage.medium,
        imageHash: getHashFromImage(
          item.node.coverImage.extraLarge ?? item.node.coverImage.large ?? item.node.coverImage.medium
        ),
        cover:
          item.node.bannerImage ??
          item.node.coverImage.extraLarge ??
          item.node.coverImage.large ??
          item.node.coverImage.medium,
        coverHash: getHashFromImage(
          item.node.bannerImage ??
            item.node.coverImage.extraLarge ??
            item.node.coverImage.large ??
            item.node.coverImage.medium
        ),
        rating: item.node.meanScore,
        type: item.node.format,
      }));

      return animeInfo;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * To get Staff details by anilistId
   * @param id staff id from anilist
   *
   */
  fetchStaffById = async (id: number) => {
    const staffInfo: IStaff = {
      id: String(id),
      name: { first: '', last: '', native: '', full: '' },
    };

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistStaffInfoQuery(id),
    };

    try {
      const { data } = await this.client.post(this.anilistGraphqlUrl, options).catch((err) => {
        throw new Error((err as Error).message);
      });
      const staff = data.data.Staff;

      staffInfo.id = staff?.id;
      staffInfo.name = staff?.name;
      staffInfo.image = staff?.image;
      staffInfo.description = staff?.description;
      staffInfo.siteUrl = staff?.siteUrl;

      staffInfo.roles = staff?.staffMedia.edges.map((media: any) => ({
        id: media?.node?.id,
        title: media?.node?.title,
        type: media?.node?.type,
        image: {
          extraLarge: media?.node?.coverImage?.extraLarge,
          large: media?.node?.coverImage?.large,
          medium: media?.node?.coverImage?.medium,
        },
        color: media?.node?.coverImage?.color,
      }));

      return staffInfo;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param id character id from anilist
   */
  fetchCharacterInfoById = async (id: string) => {
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      query: anilistCharacterQuery(),
      variables: {
        id: id,
      },
    };

    try {
      const {
        data: {
          data: { Character },
        },
      } = await this.client.post(this.anilistGraphqlUrl, options);

      const height = Character.description.match(/__Height:__(.*)/)?.[1].trim();
      const weight = Character.description.match(/__Weight:__(.*)/)?.[1].trim();
      const hairColor = Character.description.match(/__Hair Color:__(.*)/)?.[1].trim();
      const eyeColor = Character.description.match(/__Eye Color:__(.*)/)?.[1].trim();
      const relatives = Character.description
        .match(/__Relatives:__(.*)/)?.[1]
        .trim()
        .split(/(, \[)/g)
        .filter((g: string) => !g.includes(', ['))
        .map((r: string) => ({
          id: r.match(/\/(\d+)/)?.[1],
          name: r.match(/([^)]+)\]/)?.[1]!.replace(/\[/g, ''),
          relationship: r.match(/\(([^)]+)\).*?(\(([^)]+)\))/)?.[3],
        }));
      const race = Character.description
        .match(/__Race:__(.*)/)?.[1]
        .split(', ')
        .map((r: string) => r.trim());
      const rank = Character.description.match(/__Rank:__(.*)/)?.[1];
      const occupation = Character.description.match(/__Occupation:__(.*)/)?.[1];
      const previousPosition = Character.description.match(/__Previous Position:__(.*)/)?.[1]?.trim();
      const partner = Character.description
        .match(/__Partner:__(.*)/)?.[1]
        .split(/(, \[)/g)
        .filter((g: string) => !g.includes(', ['))
        .map((r: string) => ({
          id: r.match(/\/(\d+)/)?.[1],
          name: r.match(/([^)]+)\]/)?.[1]!.replace(/\[/g, ''),
        }));
      const dislikes = Character.description.match(/__Dislikes:__(.*)/)?.[1];
      const sign = Character.description.match(/__Sign:__(.*)/)?.[1];
      const zodicSign = Character.description.match(/__Zodiac sign:__(.*)/)?.[1]?.trim();
      const zodicAnimal = Character.description.match(/__Zodiac Animal:__(.*)/)?.[1]?.trim();
      const themeSong = Character.description.match(/__Theme Song:__(.*)/)?.[1]?.trim();
      Character.description = Character.description.replace(
        /__Theme Song:__(.*)\n|__Race:__(.*)\n|__Height:__(.*)\n|__Relatives:__(.*)\n|__Rank:__(.*)\n|__Zodiac sign:__(.*)\n|__Zodiac Animal:__(.*)\n|__Weight:__(.*)\n|__Eye Color:__(.*)\n|__Hair Color:__(.*)\n|__Dislikes:__(.*)\n|__Sign:__(.*)\n|__Partner:__(.*)\n|__Previous Position:__(.*)\n|__Occupation:__(.*)\n/gm,
        ''
      );

      const characterInfo = {
        id: Character.id,
        name: {
          first: Character.name?.first,
          last: Character.name?.last,
          full: Character.name?.full,
          native: Character.name?.native,
          userPreferred: Character.name?.userPreferred,
          alternative: Character.name?.alternative,
          alternativeSpoiler: Character.name?.alternativeSpoiler,
        },
        image: Character.image?.large ?? Character.image?.medium,
        imageHash: getHashFromImage(Character.image?.large ?? Character.image?.medium),
        description: Character.description,
        gender: Character.gender,
        dateOfBirth: {
          year: Character.dateOfBirth?.year,
          month: Character.dateOfBirth?.month,
          day: Character.dateOfBirth?.day,
        },
        bloodType: Character.bloodType,
        age: Character.age,
        hairColor: hairColor,
        eyeColor: eyeColor,
        height: height,
        weight: weight,
        occupation: occupation,
        partner: partner,
        relatives: relatives,
        race: race,
        rank: rank,
        previousPosition: previousPosition,
        dislikes: dislikes,
        sign: sign,
        zodicSign: zodicSign,
        zodicAnimal: zodicAnimal,
        themeSong: themeSong,
        relations: Character.media.edges?.map((v: any) => ({
          id: v.node.id,
          malId: v.node.idMal,
          role: v.characterRole,
          title: {
            romaji: v.node.title?.romaji,
            english: v.node.title?.english,
            native: v.node.title?.native,
            userPreferred: v.node.title?.userPreferred,
          },
          status:
            v.node.status === 'RELEASING'
              ? MediaStatus.ONGOING
              : v.node.status === 'FINISHED'
                ? MediaStatus.COMPLETED
                : v.node.status === 'NOT_YET_RELEASED'
                  ? MediaStatus.NOT_YET_AIRED
                  : v.node.status === 'CANCELLED'
                    ? MediaStatus.CANCELLED
                    : v.node.status === 'HIATUS'
                      ? MediaStatus.HIATUS
                      : MediaStatus.UNKNOWN,
          episodes: v.node.episodes,
          image: v.node.coverImage?.extraLarge ?? v.node.coverImage?.large ?? v.node.coverImage?.medium,
          imageHash: getHashFromImage(
            v.node.coverImage?.extraLarge ?? v.node.coverImage?.large ?? v.node.coverImage?.medium
          ),
          rating: v.node.averageScore,
          releaseDate: v.node.startDate?.year,
          type: v.node.format,
          color: v.node.coverImage?.color,
        })),
      };

      return characterInfo;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Anilist Anime class
   */
  static Anime = this;

  /**
   * Anilist Manga Class
   */
  static Manga = class Manga {
    provider: MangaParser;

    /**
     * Maps anilist manga to any manga provider (mangadex, mangasee, etc)
     * @param provider MangaParser
     */
    constructor(provider?: MangaParser) {
      this.provider = provider || new Mangasee123();
    }

    /**
     *
     * @param query query to search for
     * @param page (optional) page number (default: `1`)
     * @param perPage (optional) number of results per page (default: `20`)
     */
    search = async (query: string, page: number = 1, perPage: number = 20): Promise<ISearch<IMangaResult>> => {
      const options = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        query: anilistSearchQuery(query, page, perPage, 'MANGA'),
      };

      try {
        const { data } = await axios.post(new Anilist().anilistGraphqlUrl, options);

        const res: ISearch<IMangaResult> = {
          currentPage: data.data.Page.pageInfo.currentPage,
          hasNextPage: data.data.Page.pageInfo.hasNextPage,
          results: data.data.Page.media.map(
            (item: any): IMangaResult => ({
              id: item.id.toString(),
              malId: item.idMal,
              title: item.title
                ? {
                    romaji: item.title.romaji,
                    english: item.title.english,
                    native: item.title.native,
                    userPreferred: item.title.userPreferred,
                  }
                : item.title.romaji,
              status:
                item.status === 'RELEASING'
                  ? MediaStatus.ONGOING
                  : item.status === 'FINISHED'
                    ? MediaStatus.COMPLETED
                    : item.status === 'NOT_YET_RELEASED'
                      ? MediaStatus.NOT_YET_AIRED
                      : item.status === 'CANCELLED'
                        ? MediaStatus.CANCELLED
                        : item.status === 'HIATUS'
                          ? MediaStatus.HIATUS
                          : MediaStatus.UNKNOWN,
              image: item.coverImage?.extraLarge ?? item.coverImage?.large ?? item.coverImage?.medium,
              imageHash: getHashFromImage(
                item.coverImage?.extraLarge ?? item.coverImage?.large ?? item.coverImage?.medium
              ),
              cover: item.bannerImage,
              coverHash: getHashFromImage(item.bannerImage),
              popularity: item.popularity,
              description: item.description,
              rating: item.averageScore,
              genres: item.genres,
              color: item.coverImage?.color,
              totalChapters: item.chapters,
              volumes: item.volumes,
              type: item.format,
              releaseDate: item.seasonYear,
            })
          ),
        };

        return res;
      } catch (err) {
        throw new Error((err as Error).message);
      }
    };

    /**
     *
     * @param chapterId chapter id
     * @param args args to pass to the provider (if any)
     * @returns
     */
    fetchChapterPages = (chapterId: string, ...args: any): Promise<IMangaChapterPage[]> => {
      return this.provider.fetchChapterPages(chapterId, ...args);
    };

    fetchMangaInfo = async (id: string, ...args: any): Promise<IMangaInfo> => {
      const mangaInfo: IMangaInfo = {
        id: id,
        title: '',
      };

      const options = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        query: anilistMediaDetailQuery(id),
      };

      try {
        const { data } = await axios.post(new Anilist().anilistGraphqlUrl, options).catch((err) => {
          throw new Error('Media not found');
        });
        mangaInfo.malId = data.data.Media.idMal;
        mangaInfo.title = {
          romaji: data.data.Media.title.romaji,
          english: data.data.Media.title.english,
          native: data.data.Media.title.native,
          userPreferred: data.data.Media.title.userPreferred,
        };

        if (data.data.Media.trailer?.id) {
          mangaInfo.trailer = {
            id: data.data.Media.trailer.id,
            site: data.data.Media.trailer?.site,
            thumbnail: data.data.Media.trailer?.thumbnail,
            thumbnailHash: getHashFromImage(data.data.Media.trailer?.thumbnail),
          };
        }
        mangaInfo.image =
          data.data.Media.coverImage.extraLarge ??
          data.data.Media.coverImage.large ??
          data.data.Media.coverImage.medium;

        mangaInfo.imageHash = getHashFromImage(
          data.data.Media.coverImage.extraLarge ?? data.data.Media.coverImage.large ?? data.data.Media.coverImage.medium
        );
        mangaInfo.popularity = data.data.Media.popularity;
        mangaInfo.color = data.data.Media.coverImage?.color;
        mangaInfo.cover = data.data.Media.bannerImage ?? mangaInfo.image;
        mangaInfo.coverHash = getHashFromImage(data.data.Media.bannerImage ?? mangaInfo.image);
        mangaInfo.description = data.data.Media.description;
        switch (data.data.Media.status) {
          case 'RELEASING':
            mangaInfo.status = MediaStatus.ONGOING;
            break;
          case 'FINISHED':
            mangaInfo.status = MediaStatus.COMPLETED;
            break;
          case 'NOT_YET_RELEASED':
            mangaInfo.status = MediaStatus.NOT_YET_AIRED;
            break;
          case 'CANCELLED':
            mangaInfo.status = MediaStatus.CANCELLED;
            break;
          case 'HIATUS':
            mangaInfo.status = MediaStatus.HIATUS;
            break;
          default:
            mangaInfo.status = MediaStatus.UNKNOWN;
        }
        mangaInfo.releaseDate = data.data.Media.startDate.year;
        mangaInfo.startDate = {
          year: data.data.Media.startDate.year,
          month: data.data.Media.startDate.month,
          day: data.data.Media.startDate.day,
        };
        mangaInfo.endDate = {
          year: data.data.Media.endDate.year,
          month: data.data.Media.endDate.month,
          day: data.data.Media.endDate.day,
        };
        mangaInfo.rating = data.data.Media.averageScore;
        mangaInfo.genres = data.data.Media.genres;
        mangaInfo.season = data.data.Media.season;
        mangaInfo.studios = data.data.Media.studios.edges.map((item: any) => item.node.name);
        mangaInfo.type = data.data.Media.format;
        mangaInfo.recommendations = data.data.Media.recommendations.edges.map((item: any) => ({
          id: item.node.mediaRecommendation?.id,
          malId: item.node.mediaRecommendation?.idMal,
          title: {
            romaji: item.node.mediaRecommendation?.title?.romaji,
            english: item.node.mediaRecommendation?.title?.english,
            native: item.node.mediaRecommendation?.title?.native,
            userPreferred: item.node.mediaRecommendation?.title?.userPreferred,
          },
          status:
            item.node.mediaRecommendation?.status === 'RELEASING'
              ? MediaStatus.ONGOING
              : item.node.mediaRecommendation?.status === 'FINISHED'
                ? MediaStatus.COMPLETED
                : item.node.mediaRecommendation?.status === 'NOT_YET_RELEASED'
                  ? MediaStatus.NOT_YET_AIRED
                  : item.node.mediaRecommendation?.status === 'CANCELLED'
                    ? MediaStatus.CANCELLED
                    : item.node.mediaRecommendation?.status === 'HIATUS'
                      ? MediaStatus.HIATUS
                      : MediaStatus.UNKNOWN,
          chapters: item.node.mediaRecommendation?.chapters,
          image:
            item.node.mediaRecommendation?.coverImage?.extraLarge ??
            item.node.mediaRecommendation?.coverImage?.large ??
            item.node.mediaRecommendation?.coverImage?.medium,
          imageHash: getHashFromImage(
            item.node.mediaRecommendation?.coverImage?.extraLarge ??
              item.node.mediaRecommendation?.coverImage?.large ??
              item.node.mediaRecommendation?.coverImage?.medium
          ),
          cover:
            item.node.mediaRecommendation?.bannerImage ??
            item.node.mediaRecommendation?.coverImage?.extraLarge ??
            item.node.mediaRecommendation?.coverImage?.large ??
            item.node.mediaRecommendation?.coverImage?.medium,
          coverHash: getHashFromImage(
            item.node.mediaRecommendation?.bannerImage ??
              item.node.mediaRecommendation?.coverImage?.extraLarge ??
              item.node.mediaRecommendation?.coverImage?.large ??
              item.node.mediaRecommendation?.coverImage?.medium
          ),
          rating: item.node.mediaRecommendation?.meanScore,
          type: item.node.mediaRecommendation?.format,
        }));

        mangaInfo.characters = data.data.Media.characters.edges.map((item: any) => ({
          id: item.node?.id,
          role: item.role,
          name: {
            first: item.node.name.first,
            last: item.node.name.last,
            full: item.node.name.full,
            native: item.node.name.native,
            userPreferred: item.node.name.userPreferred,
          },
          image: item.node.image.large ?? item.node.image.medium,
          imageHash: getHashFromImage(item.node.image.large ?? item.node.image.medium),
        }));

        mangaInfo.relations = data.data.Media.relations.edges.map((item: any) => ({
          id: item.node.id,
          relationType: item.relationType,
          malId: item.node.idMal,
          title: {
            romaji: item.node.title.romaji,
            english: item.node.title.english,
            native: item.node.title.native,
            userPreferred: item.node.title.userPreferred,
          },
          status:
            item.node.status === 'RELEASING'
              ? MediaStatus.ONGOING
              : item.node.status === 'FINISHED'
                ? MediaStatus.COMPLETED
                : item.node.status === 'NOT_YET_RELEASED'
                  ? MediaStatus.NOT_YET_AIRED
                  : item.node.status === 'CANCELLED'
                    ? MediaStatus.CANCELLED
                    : item.node.status === 'HIATUS'
                      ? MediaStatus.HIATUS
                      : MediaStatus.UNKNOWN,
          chapters: item.node.chapters,
          image: item.node.coverImage.extraLarge ?? item.node.coverImage.large ?? item.node.coverImage.medium,
          imageHash: getHashFromImage(
            item.node.coverImage.extraLarge ?? item.node.coverImage.large ?? item.node.coverImage.medium
          ),
          color: item.node.coverImage?.color,
          type: item.node.format,
          cover:
            item.node.bannerImage ??
            item.node.coverImage.extraLarge ??
            item.node.coverImage.large ??
            item.node.coverImage.medium,
          coverHash: getHashFromImage(
            item.node.bannerImage ??
              item.node.coverImage.extraLarge ??
              item.node.coverImage.large ??
              item.node.coverImage.medium
          ),
          rating: item.node.meanScore,
        }));

        mangaInfo.chapters = await new Anilist().findManga(
          this.provider,
          {
            english: mangaInfo.title.english!,
            romaji: mangaInfo.title.romaji!,
          },
          mangaInfo.malId as number
        );
        mangaInfo.chapters = mangaInfo.chapters.reverse();

        return mangaInfo;
      } catch (error) {
        throw Error((error as Error).message);
      }
    };
  };

  private findMangaSlug = async (provider: MangaParser, title: string, malId: number): Promise<IMangaChapter[]> => {
    const slug = title.replace(/[^0-9a-zA-Z]+/g, ' ');

    let possibleManga: any;

    if (malId) {
      const malAsyncReq = await this.client.get(`${this.malSyncUrl}/mal/manga/${malId}`, {
        validateStatus: () => true,
      });

      if (malAsyncReq.status === 200) {
        const sitesT = malAsyncReq.data.Sites as {
          [k: string]: {
            [k: string]: { url: string; page: string; title: string };
          };
        };
        let sites = Object.values(sitesT).map((v, i) => {
          const obj: any = [...Object.values(Object.values(sitesT)[i]!)];
          const pages: any = obj.map((v: any) => ({
            page: v.page,
            url: v.url,
            title: v.title,
          }));
          return pages;
        }) as any[];

        sites = sites.flat();

        const possibleSource = sites.find((s) => s.page.toLowerCase() === provider.name.toLowerCase());

        if (possibleSource) possibleManga = await provider.fetchMangaInfo(possibleSource.url.split('/').pop()!);
        else possibleManga = await this.findMangaRaw(provider, slug, title);
      } else possibleManga = await this.findMangaRaw(provider, slug, title);
    } else possibleManga = await this.findMangaRaw(provider, slug, title);

    const possibleProviderChapters = possibleManga.chapters;

    return possibleProviderChapters;
  };

  private findMangaRaw = async (provider: MangaParser, slug: string, title: string) => {
    const findAnime = (await provider.search(slug)) as ISearch<IMangaResult>;

    if (findAnime.results.length === 0) return [];
    // TODO: use much better way than this

    const possibleManga = findAnime.results.find(
      (manga: IMangaResult) =>
        title.toLowerCase() === (typeof manga.title === 'string' ? manga.title.toLowerCase() : '')
    );

    if (!possibleManga) return (await provider.fetchMangaInfo(findAnime.results[0]!.id)) as IMangaInfo;
    return (await provider.fetchMangaInfo(possibleManga.id)) as IMangaInfo;
  };

  private findManga = async (
    provider: MangaParser,
    title: { romaji: string; english: string },
    malId: number
  ): Promise<IMangaChapter[]> => {
    title.english = title.english ?? title.romaji;
    title.romaji = title.romaji ?? title.english;

    title.english = title.english.toLowerCase();
    title.romaji = title.romaji.toLowerCase();

    if (title.english === title.romaji) return await this.findMangaSlug(provider, title.english, malId);

    const romajiPossibleEpisodes = this.findMangaSlug(provider, title.romaji, malId);

    if (romajiPossibleEpisodes) {
      return romajiPossibleEpisodes;
    }

    const englishPossibleEpisodes = this.findMangaSlug(provider, title.english, malId);
    return englishPossibleEpisodes;
  };
}

// (async () => {
//   const ani = new Anilist(new Zoro());
//   const anime = await ani.fetchAnimeInfo('21');
//   console.log(anime.episodes);
//   const sources = await ani.fetchEpisodeSources(anime.episodes![0]!.id, anime.episodes![0]!.number, anime.id);
//   console.log(sources);
// })();

export default Anilist;
