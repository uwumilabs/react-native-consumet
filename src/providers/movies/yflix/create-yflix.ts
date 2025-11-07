import {
  type IMovieInfo,
  type IEpisodeServer,
  type StreamingServers,
  type ISource,
  type IMovieResult,
  type ISearch,
} from '../../../models';
import type { ProviderConfig, ProviderContext } from '../../../models/provider-context';

export function createYFlix(ctx: ProviderContext, customBaseURL?: string) {
  const { load, extractors, enums, axios, createCustomBaseUrl, PolyURL } = ctx;
  const { MegaUp } = extractors;
  const { TvType: TvTypeEnum, StreamingServers: StreamingServersEnum } = enums;

  const apiBase = 'https://enc-dec.app/api';

  const baseUrl = createCustomBaseUrl('https://yflix.to', customBaseURL);

  const config: ProviderConfig = {
    name: 'YFlix',
    languages: 'all',
    classPath: 'MOVIES.YFlix',
    logo: `${baseUrl}/assets/uploads/2f505f3de3c99889c1a72557f3e3714fc0c457b0.png`,
    baseUrl,
    isNSFW: false,
    isWorking: true,
  };

  const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);

  const GenerateToken = async (n: string): Promise<string> => {
    try {
      const res = await axios.get(`${apiBase}/enc-movies-flix?text=${encodeURIComponent(n)}`);
      return res.data.result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  const DecodeIframeData = async (
    n: string
  ): Promise<{
    url: string;
  }> => {
    try {
      const res = await axios.post(`${apiBase}/dec-movies-flix`, { text: n });
      return res.data.result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  /**
   *
   * @param query search query string
   * @param page page number (default 1) (optional)
   */
  const search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const searchResult: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };
    try {
      const { data } = await axios.get(`${baseUrl}/browser?keyword=${query.replace(/[\W_]+/g, '+')}&page=${page}`);

      const $ = load(data);

      const navSelector = 'nav.navigation > ul.pagination';
      searchResult.hasNextPage =
        $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;

      $('.film-section > div.item').each((i, el) => {
        const releaseDate = $(el).find('div.metadata > span:nth-child(2)').text();
        searchResult.results.push({
          id: $(el).find('div.inner > a').attr('href')?.split('/watch/')[1]!,
          title: $(el).find('div.info > a').text().trim()!,
          url: `${baseUrl}${$(el).find('div.inner > a').attr('href')}`,
          image: $(el).find('img').attr('data-src') || $(el).find('img').attr('src'),
          releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
          seasons: releaseDate.includes('SS') ? parseInt(releaseDate.split('SS')[1]!) : undefined,
          type:
            $(el).find('div.metadata > span:nth-child(1)').text() === 'Movie' ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES,
        });
      });

      return searchResult;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param mediaId media link or id
   */
  const fetchMediaInfo = async (mediaId: string): Promise<IMovieInfo> => {
    if (!mediaId.startsWith(baseUrl)) {
      mediaId = `${baseUrl}/watch/${mediaId}`;
    }

    const movieInfo: IMovieInfo = {
      id: mediaId.split('to/').pop()!,
      title: '',
      url: mediaId,
    };
    try {
      const { data } = await axios.get(mediaId);
      const $ = load(data);
      const recommendationsArray: IMovieResult[] = [];

      $('section.movie-related > div.film-section > div.item').each((i, el) => {
        const releaseDate = $(el).find('div.metadata > span:nth-child(2)').text();
        recommendationsArray.push({
          id: $(el).find('div.inner > a').attr('href')?.split('/watch/')[1]!,
          title: $(el).find('div.info > a').text().trim()!,
          image: $(el).find('img').attr('data-src') || $(el).find('img').attr('src'),
          releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
          seasons: releaseDate.includes('SS') ? parseInt(releaseDate.split('SS')[1]!) : undefined,
          type:
            $(el).find('div.metadata > span:nth-child(1)').text() === 'Movie' ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES,
        });
      });

      const uid = $('#movie-rating').attr('data-id')!;
      movieInfo.cover = $('div.detail-bg').attr('style')?.slice(22).replace(')', '').replace(';', '');
      movieInfo.title = $('h1.title').text();
      movieInfo.image = $('.poster  img').attr('src');
      movieInfo.description = $('.description').text().trim();
      movieInfo.releaseDate = $('ul.mics > li:contains(Released:)').text().replace('Released:', '').trim();
      movieInfo.genres = $('ul.mics > li:contains(Genres:) a')
        .map((i, el) => $(el).text().split('&'))
        .get()
        .map((v) => v.trim());
      movieInfo.casts = $('ul.mics > li:contains(Casts:) a')
        .map((i, el) => $(el).text())
        .get();
      movieInfo.country = $('ul.mics > li:contains(Country:) a').text().trim();
      movieInfo.rating = parseFloat($('.metadata > span.IMDb').text().replace('IMDb', '').trim());
      movieInfo.recommendations = recommendationsArray as any;

      const episodesAjax = await axios.get(`${baseUrl}/ajax/episodes/list?id=${uid}&_=${await GenerateToken(uid!)}`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${baseUrl}/watch/${mediaId}`,
        },
      });
      const $$ = load(episodesAjax.data.result);
      movieInfo.episodes = [];

      $$('.episodes').each((_, el) => {
        const season = parseInt($$(el).attr('data-season')!, 10);

        $$(el)
          .find('li a')
          .each((_, link) => {
            const $link = $(link);

            const id = $link.attr('eid')?.trim() || '';
            const url = baseUrl + $link.attr('href')?.trim() || '';
            const number = parseInt($link.attr('num') || '', 10);
            const releaseDate = $link.attr('title')?.trim() || '';
            const title = $link.find('span:last-child').text().trim();

            movieInfo.episodes?.push({
              id,
              title,
              url,
              number,
              season,
              releaseDate,
            });
          });
      });

      return movieInfo;
    } catch (err) {
      console.log(err);
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param episodeId episode id
   * @param mediaId media id
   * @param server server type (default `MegaUp`) (optional)
   */
  const fetchEpisodeSources = async (
    episodeId: string,
    mediaId: string,
    server: StreamingServers = StreamingServersEnum.MegaUp
  ): Promise<ISource> => {
    if (episodeId.startsWith('http')) {
      const serverUrl = new PolyURL(episodeId);
      switch (server) {
        case StreamingServersEnum.MegaUp:
          return {
            headers: { Referer: serverUrl.href },
            ...((await MegaUp().extract(serverUrl)) as ISource),
          };
        default:
          return {
            headers: { Referer: serverUrl.href },
            ...((await MegaUp().extract(serverUrl)) as ISource),
          };
      }
    }

    try {
      const servers = await fetchEpisodeServers(episodeId, mediaId);

      const i = servers.findIndex((s) => s.name.toLowerCase().includes(server));

      if (i === -1) {
        throw new Error(`Server ${server} not found`);
      }

      const serverUrl: URL = new URL(servers[i]?.url!);
      const sources = await fetchEpisodeSources(serverUrl.href, mediaId, server);
      return sources;
    } catch (err) {
      console.log(err, 'err');
      throw new Error((err as Error).message);
    }
  };

  /**
   *
   * @param episodeId takes episode link or movie id
   * @param mediaId takes movie link or id (found on movie info object)
   */
  const fetchEpisodeServers = async (episodeId: string, mediaId: string): Promise<IEpisodeServer[]> => {
    try {
      const { data } = await axios.get(
        `${baseUrl}/ajax/links/list?eid=${episodeId}&_=${await GenerateToken(episodeId)}`
      );
      const $ = load(data.result);

      const servers: IEpisodeServer[] = [];
      const serverItems = $('ul > li.server');
      await Promise.all(
        serverItems.map(async (i, server) => {
          const id = $(server).attr('data-lid');
          const { data } = await axios.get(`${baseUrl}/ajax/links/view?id=${id}&_=${await GenerateToken(id!)}`);
          const decodedIframeData = await DecodeIframeData(data.result);
          servers.push({
            name: `MegaUp ${$(server).text().trim()}`.toLowerCase()!,
            url: decodedIframeData.url,
          });
        })
      );
      return servers;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const fetchRecentMovies = async (): Promise<IMovieResult[]> => {
    try {
      const { data } = await axios.get(`${baseUrl}/home`);
      const $ = load(data);

      const movies = $(
        'section.block_area:contains("Latest Movies") > div:nth-child(2) > div:nth-child(1) > div.flw-item'
      )
        .map((i, el) => {
          const releaseDate = $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text();
          const movie: any = {
            id: $(el).find('div.film-poster > a').attr('href')?.slice(1)!,
            title: $(el).find('div.film-detail > h3.film-name > a').attr('title')!,
            url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
            image: $(el).find('div.film-poster > img').attr('data-src'),
            releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
            duration: $(el).find('div.film-detail > div.fd-infor > span.fdi-duration').text() || null,
            type:
              $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                ? TvTypeEnum.MOVIE
                : TvTypeEnum.TVSERIES,
          };
          return movie;
        })
        .get();
      return movies;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const fetchRecentTvShows = async (): Promise<IMovieResult[]> => {
    try {
      const { data } = await axios.get(`${baseUrl}/home`);
      const $ = load(data);

      const tvshows = $(
        'section.block_area:contains("Latest TV Shows") > div:nth-child(2) > div:nth-child(1) > div.flw-item'
      )
        .map((i, el) => {
          const tvshow = {
            id: $(el).find('div.film-poster > a').attr('href')?.slice(1)!,
            title: $(el).find('div.film-detail > h3.film-name > a').attr('title')!,
            url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
            image: $(el).find('div.film-poster > img').attr('data-src'),
            season: $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text().replace('SS', '').trim(),
            latestEpisode:
              $(el).find('div.film-detail > div.fd-infor > span:nth-child(3)').text().replace('EPS', '').trim() || null,
            type:
              $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                ? TvTypeEnum.MOVIE
                : TvTypeEnum.TVSERIES,
          };
          return tvshow;
        })
        .get();
      return tvshows;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const fetchTrendingMovies = async (): Promise<IMovieResult[]> => {
    try {
      const { data } = await axios.get(`${baseUrl}/home`);
      const $ = load(data);

      const movies = $('div#trending-movies div.film_list-wrap div.flw-item')
        .map((i, el) => {
          const releaseDate = $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text();
          const movie: any = {
            id: $(el).find('div.film-poster > a').attr('href')?.slice(1)!,
            title: $(el).find('div.film-detail > h3.film-name > a').attr('title')!,
            url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
            image: $(el).find('div.film-poster > img').attr('data-src'),
            releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
            duration: $(el).find('div.film-detail > div.fd-infor > span.fdi-duration').text() || null,
            type:
              $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                ? TvTypeEnum.MOVIE
                : TvTypeEnum.TVSERIES,
          };
          return movie;
        })
        .get();
      return movies;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const fetchTrendingTvShows = async (): Promise<IMovieResult[]> => {
    try {
      const { data } = await axios.get(`${baseUrl}/home`);
      const $ = load(data);

      const tvshows = $('div#trending-tv div.film_list-wrap div.flw-item')
        .map((i, el) => {
          const tvshow = {
            id: $(el).find('div.film-poster > a').attr('href')?.slice(1)!,
            title: $(el).find('div.film-detail > h3.film-name > a').attr('title')!,
            url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
            image: $(el).find('div.film-poster > img').attr('data-src'),
            season: $(el).find('div.film-detail > div.fd-infor > span:nth-child(1)').text().replace('SS', '').trim(),
            latestEpisode:
              $(el).find('div.film-detail > div.fd-infor > span:nth-child(3)').text().replace('EPS', '').trim() || null,
            type:
              $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                ? TvTypeEnum.MOVIE
                : TvTypeEnum.TVSERIES,
          };
          return tvshow;
        })
        .get();
      return tvshows;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const fetchByCountry = async (country: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const result: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };
    const navSelector = 'div.pre-pagination > nav:nth-child(1) > ul:nth-child(1)';

    try {
      const { data } = await axios.get(`${baseUrl}/country/${country}/?page=${page}`);
      const $ = load(data);

      result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;

      $('div.container > section.block_area > div.block_area-content > div.film_list-wrap > div.flw-item')
        .each((i, el) => {
          const resultItem: IMovieResult = {
            id: $(el).find('div.film-poster > a').attr('href')?.slice(1) ?? '',
            title: $(el).find('div.film-detail > h2.film-name > a').attr('title') ?? '',
            url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
            image: $(el).find('div.film-poster > img').attr('data-src'),
            type:
              $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                ? TvTypeEnum.MOVIE
                : TvTypeEnum.TVSERIES,
          };
          const season = $(el)
            .find('div.film-detail > div.fd-infor > span:nth-child(1)')
            .text()
            .replace('SS', '')
            .trim();
          const latestEpisode =
            $(el).find('div.film-detail > div.fd-infor > span:nth-child(3)').text().replace('EPS', '').trim() ?? null;
          if (resultItem.type === TvTypeEnum.TVSERIES) {
            resultItem.season = season;
            resultItem.latestEpisode = latestEpisode;
          } else {
            resultItem.releaseDate = season;
            resultItem.duration = latestEpisode;
          }
          result.results.push(resultItem);
        })
        .get();
      return result;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const fetchByGenre = async (genre: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const result: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };
    try {
      const { data } = await axios.get(`${baseUrl}/genre/${genre}?page=${page}`);

      const $ = load(data);

      const navSelector = 'div.pre-pagination > nav:nth-child(1) > ul:nth-child(1)';

      result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;

      $('.film_list-wrap > div.flw-item')
        .each((i, el) => {
          const resultItem: IMovieResult = {
            id: $(el).find('div.film-poster > a').attr('href')?.slice(1) ?? '',
            title: $(el).find('div.film-detail > h2 > a').attr('title') ?? '',
            url: `${baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
            image: $(el).find('div.film-poster > img').attr('data-src'),
            type:
              $(el).find('div.film-detail > div.fd-infor > span.float-right').text() === 'Movie'
                ? TvTypeEnum.MOVIE
                : TvTypeEnum.TVSERIES,
          };
          const season = $(el)
            .find('div.film-detail > div.fd-infor > span:nth-child(1)')
            .text()
            .replace('SS', '')
            .trim();
          const latestEpisode =
            $(el).find('div.film-detail > div.fd-infor > span:nth-child(3)').text().replace('EPS', '').trim() ?? null;
          if (resultItem.type === TvTypeEnum.TVSERIES) {
            resultItem.season = season;
            resultItem.latestEpisode = latestEpisode;
          } else {
            resultItem.releaseDate = season;
            resultItem.duration = latestEpisode;
          }
          result.results.push(resultItem);
        })
        .get();

      return result;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
    fetchRecentMovies,
    fetchRecentTvShows,
    fetchTrendingMovies,
    fetchTrendingTvShows,
    fetchByCountry,
    fetchByGenre,
  };
}

export type YFlixProviderInstance = ReturnType<typeof createYFlix>;
