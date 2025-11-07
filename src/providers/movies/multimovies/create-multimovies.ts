import {
  type IMovieInfo,
  type IEpisodeServer,
  type StreamingServers,
  type ISource,
  type IMovieResult,
  type ISearch,
  type ProviderContext,
  type ProviderConfig,
} from '../../../models';

export function createMultiMovies(ctx: ProviderContext, customBaseURL?: string) {
  const { load, extractors, enums, axios, createCustomBaseUrl, PolyURL, USER_AGENT, NativeConsumet } = ctx;
  const { StreamWish, VidHide } = extractors;
  const { StreamingServers: StreamingServersEnum, TvType: TvTypeEnum } = enums;
  const { makePostRequest } = NativeConsumet;

  const baseUrl = createCustomBaseUrl('https://multimovies.center', customBaseURL);

  const config: ProviderConfig = {
    name: 'MultiMovies',
    languages: 'all',
    classPath: 'MOVIES.MultiMovies',
    logo: `${baseUrl}/wp-content/uploads/2024/01/cropped-CompressJPEG.online_512x512_image.png`,
    baseUrl,
    isNSFW: false,
    isWorking: true,
  };

  const supportedTypes = new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);

  /**
   * Search for movies/TV shows
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
      let url;
      if (page === 1) {
        url = `${config.baseUrl}/?s=${query.replace(/[\W_]+/g, '+')}`;
      } else {
        url = `${config.baseUrl}/page/${page}/?s=${query.replace(/[\W_]+/g, '+')}`;
      }
      const { data } = await axios.get(url);
      const $ = load(data);

      const navSelector = 'div.pagination';
      searchResult.hasNextPage = $(navSelector).find('#nextpagination').length > 0;
      const articles = $('.search-page .result-item article').toArray();

      await Promise.all(
        articles.map(async (el) => {
          const seasonSet = new Set<number>();

          const href =
            $(el)
              .find('.thumbnail a')
              .attr('href')
              ?.replace(/^https?:\/\/[^/]+\//, '')
              .replace(/^\/|\/$/g, '') ?? '';

          const episodesInfo = await fetchMediaInfo(href);
          const episodes = episodesInfo?.episodes || [];

          for (const episode of episodes) {
            if (episode.season != null) {
              seasonSet.add(episode.season);
            }
          }
          searchResult.results.push({
            id: href,
            title: $(el).find('.details .title a').text().trim(),
            url: $(el).find('.thumbnail a').attr('href') ?? '',
            image: $(el).find('.thumbnail img').attr('src') ?? '',
            rating: parseFloat($(el).find('.meta .rating').text().replace('IMDb ', '')) || 0,
            releaseDate: $(el).find('.meta .year').text().trim(),
            seasons: seasonSet.size,
            description: $(el).find('.contenido p').text().trim(),
            type: $(el).find('.thumbnail a').attr('href')?.includes('/movies/')
              ? TvTypeEnum.MOVIE
              : TvTypeEnum.TVSERIES,
          });
        })
      );

      return searchResult;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Fetch media information
   * @param mediaId media link or id
   */
  const fetchMediaInfo = async (mediaId: string): Promise<IMovieInfo> => {
    if (!mediaId.startsWith(config.baseUrl)) {
      mediaId = `${config.baseUrl}/${mediaId}`;
    }
    const movieInfo: IMovieInfo = {
      id: mediaId.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/|\/$/g, '')!,
      title: '',
      url: mediaId,
    };
    try {
      const { data } = await axios.get(mediaId);
      const $ = load(data);
      const recommendationsArray: IMovieResult[] = [];

      $('div#single_relacionados  article').each((i, el) => {
        recommendationsArray.push({
          id: $(el)
            .find('a')
            .attr('href')
            ?.replace(/^https?:\/\/[^/]+\//, '')
            .replace(/^\/|\/$/g, '')!,
          title: $(el).find('a img').attr('alt')!,
          image: $(el).find('a img').attr('data-src') ?? $(el).find('a img').attr('src'),
          type: $(el).find('.thumbnail a').attr('href')?.includes('/movies/')
            ? TvTypeEnum.TVSERIES
            : (TvTypeEnum.MOVIE ?? null),
        });
      });
      movieInfo.cover = $('div#info .galeria').first().find('.g-item a').attr('href')?.trim() ?? '';
      movieInfo.title = $('.sheader > .data > h1').text();
      movieInfo.image = $('.sheader > .poster > img').attr('src') ?? $('.sheader > .poster > img').attr('data-src');
      movieInfo.description = $('div#info div[itemprop="description"] p').text();
      movieInfo.type = movieInfo.id.split('/')[0] === 'tvshows' ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE;
      movieInfo.releaseDate = $('.sheader > .data > .extra > span.date').text().trim();
      movieInfo.trailer = {
        id:
          $('div#trailer .embed  iframe').attr('data-litespeed-src')?.split('embed/')[1]?.split('?')[0] ??
          $('div#trailer .embed  iframe').attr('src')?.split('embed/')[1]?.split('?')[0]!,
        url: $('div#trailer .embed iframe').attr('data-litespeed-src') ?? $('div#trailer .embed iframe').attr('src'),
      };
      movieInfo.genres = $('.sgeneros a')
        .map((i, el) => $(el).text())
        .get()
        .map((v) => v.trim());
      movieInfo.characters = [];
      $('div#cast .persons .person').each((i, el) => {
        const url = $(el).find('.img > a').attr('href');
        const image = $(el).find('.img > a > img').attr('data-src') ?? $(el).find('.img > a > img').attr('src');
        const name = $(el).find('.data > .name > a').text();
        const character = $(el).find('.data > .caracter').text();

        (movieInfo.characters as any[]).push({
          url,
          image,
          name,
          character,
        });
      });
      movieInfo.country = $('.sheader > .data > .extra > span.country').text();
      movieInfo.duration = $('.sheader > .data > .extra > span.runtime').text();
      movieInfo.rating = parseFloat($('.starstruck-rating span.dt_rating_vgs[itemprop="ratingValue"]').text());
      movieInfo.recommendations = recommendationsArray as any;

      if (movieInfo.type === TvTypeEnum.TVSERIES) {
        movieInfo.episodes = [];
        $('#seasons .se-c').each((i, el) => {
          const seasonNumber = parseInt($(el).find('.se-t').text().trim());
          $(el)
            .find('.episodios li')
            .each((j, ep) => {
              const episode = {
                id: $(ep)
                  .find('.episodiotitle a')
                  .attr('href')
                  ?.replace(/^https?:\/\/[^/]+\//, '')
                  .replace(/^\/|\/$/g, '')!,
                season: seasonNumber,
                number: parseInt($(ep).find('.numerando').text().trim().split('-')[1]!),
                title: $(ep).find('.episodiotitle a').text().trim(),
                url: $(ep).find('.episodiotitle a').attr('href')?.trim() ?? '',
                releaseDate: String(new Date($(ep).find('.episodiotitle .date').text().trim()).getFullYear()),
                image:
                  $(ep).find('.imagen img').attr('data-src')?.trim() ?? $(ep).find('.imagen img').attr('src')?.trim(),
              };

              movieInfo.episodes?.push(episode);
            });
        });
      } else {
        movieInfo.episodes = [
          {
            id: movieInfo.id,
            title: movieInfo.title,
            url: movieInfo.url,
            image: movieInfo.cover || movieInfo.image,
          },
        ];
      }

      return movieInfo;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Fetch episode sources
   * @param episodeId episode id
   * @param mediaId media id
   * @param server server type (default `StreamWish`) (optional)
   */
  const fetchEpisodeSources = async (
    episodeId: string,
    mediaId?: string,
    server: StreamingServers = StreamingServersEnum.StreamWish,
    fileId?: string
  ): Promise<ISource> => {
    if (episodeId.startsWith('http')) {
      const serverUrl = new PolyURL(episodeId);
      const referer = serverUrl.origin;
      const downloadUrl = fileId ? `${serverUrl.href.toString().replace('/e/', '/f/')}/${fileId}` : '';

      switch (server) {
        case StreamingServersEnum.StreamWish:
          return {
            headers: { Referer: referer },
            ...(await StreamWish().extract(serverUrl, referer)),
            download: downloadUrl,
          };
        case StreamingServersEnum.VidHide:
          return {
            headers: { Referer: referer },
            ...(await VidHide().extract(serverUrl)),
            download: fileId ? `https://gdmirrorbot.nl/file/${fileId}` : '',
          };
        default:
          return {
            headers: { Referer: referer },
            ...(await StreamWish().extract(serverUrl, referer)),
            download: downloadUrl,
          };
      }
    }

    try {
      const servers = await fetchEpisodeServers(episodeId, episodeId);
      const i = servers.findIndex((s) => s.name.toLowerCase() === server.toLowerCase());
      if (i === -1) {
        throw new Error(`Server ${server} not found`);
      }

      const serverUrl: URL = new URL(servers[i]!.url);
      let fId = '';

      if (!episodeId.startsWith('http')) {
        const { fileId: id } = await getServer(`${config.baseUrl}/${episodeId}`);
        fId = id ?? '';
      }
      // fileId to be used for download link
      return await fetchEpisodeSources(serverUrl.href, mediaId, server, fId);
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Fetch episode servers
   * @param episodeId takes episode link or movie id
   * @param mediaId takes movie link or id (found on movie info object, this is just a placeholder for compatibility)
   */
  const fetchEpisodeServers = async (episodeId: string, mediaId: string): Promise<IEpisodeServer[]> => {
    if (!episodeId.startsWith(config.baseUrl)) {
      episodeId = `${config.baseUrl}/${episodeId}`;
    }

    try {
      const { servers } = await getServer(episodeId);
      return servers;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Fetch popular movies
   * @param page page number (default 1)
   */
  const fetchPopular = async (page: number = 1): Promise<ISearch<IMovieResult>> => {
    const result: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };
    try {
      const { data } = await axios.get(`${config.baseUrl}/trending/page/${page}/`);
      const $ = load(data);
      const navSelector = 'div.pagination';

      result.hasNextPage = $(navSelector).find('#nextpagination').length > 0;
      $('.items > article')
        .each((i, el) => {
          const resultItem: IMovieResult = {
            id: $(el).attr('id')!,
            title: $(el).find('div.data > h3').text() ?? '',
            url: $(el).find('div.poster > a').attr('href'),
            image: $(el).find('div.poster > img').attr('data-src') ?? '',
            type: $(el).find('div.poster > a').attr('href')?.includes('/movies/')
              ? TvTypeEnum.MOVIE
              : TvTypeEnum.TVSERIES,
            rating: $(el).find('div.poster > div.rating').text() ?? '',
            releaseDate: $(el).find('div.data > span').text() ?? '',
          };
          result.results.push(resultItem);
        })
        .get();

      return result;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Fetch by genre
   * @param genre genre name
   * @param page page number (default 1)
   */
  const fetchByGenre = async (genre: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const result: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };
    try {
      const { data } = await axios.get(`${config.baseUrl}/genre/${genre}/page/${page}`);

      const $ = load(data);
      const navSelector = 'div.pagination';

      result.hasNextPage = $(navSelector).find('#nextpagination').length > 0;
      $('.items > article')
        .each((i, el) => {
          const resultItem: IMovieResult = {
            id: $(el).attr('id')!,
            title: $(el).find('div.data > h3').text() ?? '',
            url: $(el).find('div.poster > a').attr('href'),
            image: $(el).find('div.poster > img').attr('data-src') ?? '',
            type: $(el).find('div.poster > a').attr('href')?.includes('/movies/')
              ? TvTypeEnum.MOVIE
              : TvTypeEnum.TVSERIES,
            rating: $(el).find('div.poster > div.rating').text() ?? '',
            releaseDate: $(el).find('div.data > span').text() ?? '',
          };
          result.results.push(resultItem);
        })
        .get();

      return result;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * Get server information
   * @param url episode url
   */
  const getServer = async (url: string): Promise<{ servers: IEpisodeServer[]; fileId: string }> => {
    try {
      const { data } = await axios.get(url);
      const $ = load(data);
      // Extract player config
      const playerConfig = {
        postId: $('#player-option-1').attr('data-post'),
        nume: $('#player-option-1').attr('data-nume'),
        type: $('#player-option-1').attr('data-type'),
      };

      if (!playerConfig.postId || !playerConfig.nume || !playerConfig.type) {
        throw new Error('Missing player configuration');
      }

      const formData = new FormData();
      formData.append('action', 'doo_player_ajax');
      formData.append('post', playerConfig.postId);
      formData.append('nume', playerConfig.nume);
      formData.append('type', playerConfig.type);

      const headers = {
        'User-Agent': USER_AGENT,
      };

      //   const { data: playerRes } = await axios.post(`${baseUrl}/wp-admin/admin-ajax.php`, formData, {
      //     headers,
      //   });
      console.log(`${baseUrl}/wp-admin/admin-ajax.php`);
      const res = await fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
        method: 'POST',
        headers: {
          ...headers,
          //'Content-Type':'multipart/form-data',
        },
        body: formData as any,
      });
      const postTestOkHttp = await makePostRequest(
        `${baseUrl}/wp-admin/admin-ajax.php`,
        {
          ...headers,
          //'Content-Type':'multipart/form-data',
        },
        formData as any
      );
      console.timeEnd('POST Request - OkHttp');
      console.log('POST Response (OkHttp):', {
        statusCode: postTestOkHttp.statusCode,
        body: postTestOkHttp.body, // Full response body
        headers: postTestOkHttp.headers,
      });
      const playerRes = await res.json();
      console.log({ playerRes });
      const iframeUrl = playerRes.embed_url?.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i)?.[1] || playerRes.embed_url;

      // Handle non-multimovies case
      if (!iframeUrl.includes('multimovies')) {
        if (iframeUrl.includes('dhcplay')) {
          return {
            servers: [{ name: 'StreamWish', url: iframeUrl }],
            fileId: iframeUrl.split('/').pop() ?? '',
          };
        }
        // let playerBaseUrl = iframeUrl.split('/').slice(0, 3).join('/');
        // const redirectResponse = await axios.head(playerBaseUrl, {
        //   headers: headers,
        //   maxRedirects: 5,
        //   validateStatus: () => true,
        // });
        // const redirectResponse = await fetch(playerBaseUrl, {
        //   method: 'HEAD',
        //   headers: headers,
        //   redirect: 'follow',
        // });

        // const isRedirected = redirectResponse.request._redirectable._isRedirect ? redirectResponse : null;
        // const finalResponse = true ? redirectResponse : null;

        // // Update base URL if redirect occurred
        // if (finalResponse) {
        //   playerBaseUrl = finalResponse?.url;
        // }

        const fileId = iframeUrl.split('/').pop();
        if (!fileId) {
          throw new Error('No player ID found');
        }

        const streamRequestData = new FormData();
        streamRequestData.append('sid', fileId);

        // const streamResponse = await axios.post(`https://pro.gtxgamer.site/embedhelper.php`, streamRequestData, {
        //   headers,
        // });
        const streamRes = await fetch(`https://pro.gtxgamer.site/embedhelper.php`, {
          method: 'POST',
          headers: {
            ...headers,
            // 'Content-Type':'multipart/form-data',
          },
          body: streamRequestData as any,
        });
        const streamResponse = await streamRes.json();
        if (!streamResponse) {
          throw new Error('No stream data found');
        }

        // Decode and parse mresult
        const decodedMresult = JSON.parse(atob(streamResponse.mresult));
        const mresultKeys = Object.keys(decodedMresult);
        // Find common keys
        const commonKeys = mresultKeys.filter((key) => streamResponse.siteUrls.hasOwnProperty(key));

        // Convert to a Set (if needed)
        const commonStreamSites = new Set(commonKeys);
        const servers = Array.from(commonStreamSites).map((site) => {
          return {
            name:
              streamResponse.siteFriendlyNames[site] === 'StreamHG'
                ? 'StreamWish'
                : streamResponse.siteFriendlyNames[site] === 'EarnVids'
                  ? 'VidHide'
                  : streamResponse.siteFriendlyNames[site],
            url: streamResponse.siteUrls[site] + JSON.parse(atob(streamResponse.mresult))[site],
          };
        });
        return { servers, fileId };
      } else {
        return {
          servers: [{ name: 'StreamWish', url: iframeUrl }],
          fileId: iframeUrl.split('/').pop() ?? '',
        };
      }
    } catch (err) {
      console.log(err);
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
    fetchPopular,
    fetchByGenre,
  };
}

export type MultiMoviesProviderInstance = ReturnType<typeof createMultiMovies>;
