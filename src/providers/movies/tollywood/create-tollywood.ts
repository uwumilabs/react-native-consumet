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

/**
 * Tollywood Movie Provider for MovieRulz
 * Scrapes 5movierulz.tires for Telugu/Tollywood movies
 */
export function createTollywood(ctx: ProviderContext, customBaseURL?: string) {
  const { load, extractors, enums, axios, createCustomBaseUrl } = ctx;
  const { StreamTape } = extractors;
  const { StreamingServers: StreamingServersEnum, TvType: TvTypeEnum } = enums;

  const baseUrl = createCustomBaseUrl('https://www.5movierulz.tires', customBaseURL);

  const config: ProviderConfig = {
    name: 'Tollywood',
    languages: ['te', 'hi', 'en'],
    classPath: 'MOVIES.Tollywood',
    logo: 'https://www.5movierulz.tires/favicon.ico',
    baseUrl,
    isNSFW: false,
    isWorking: true,
  };

  const supportedTypes = new Set([TvTypeEnum.MOVIE]);

  /**
   * Search for Telugu/Tollywood movies
   */
  const search = async (query: string, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const searchResult: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };

    try {
      const { data } = await axios.get(`${config.baseUrl}`, {
        params: {
          s: query,
          p: page,
          cat: 'telugu',
          lang: 'te',
          opt: '0',
          ac: '0',
        },
      });

      const $ = load(data);

      $('div[id^="post-"]').each((_idx, el) => {
        const titleElement = $(el).find('h2');
        const linkElement = $(el).find('a');
        const imageElement = $(el).find('img');

        const title = titleElement.text().trim();
        const url = linkElement.attr('href');
        const image = imageElement.attr('src') || imageElement.attr('data-src');

        const yearMatch = title.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : undefined;

        const cleanTitle = title
          .replace(/\s*\(\d{4}\)\s*/g, '')
          .replace(/\s*(HDRip|DVDScr|BRRip|DVDRip|WebRip|CAM|HDTS|Telugu|Hindi|Dubbed|Movie|Watch Online Free)\s*/g, '')
          .trim();

        if (url && cleanTitle) {
          const movieId = url.replace(config.baseUrl, '').replace(/^\/+/, '').replace(/\/$/, '');

          searchResult.results.push({
            id: movieId,
            title: cleanTitle,
            url: url.startsWith('http') ? url : `${config.baseUrl}/${url}`,
            image: image?.startsWith('http') ? image : undefined,
            releaseDate: year,
            type: TvTypeEnum.MOVIE,
          });
        }
      });

      const nextButton = $('.pagination .next');
      searchResult.hasNextPage = nextButton.length > 0;

      return searchResult;
    } catch (err) {
      throw new Error(`Tollywood search failed: ${(err as Error).message}`);
    }
  };

  /**
   * Fetch Telugu featured movies
   */
  const fetchTeluguFeatured = async (page: number = 1): Promise<ISearch<IMovieResult>> => {
    const searchResult: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };

    try {
      const { data } = await axios.get(`${config.baseUrl}/category/telugu-featured/page/${page}/`);

      const $ = load(data);

      $('div[id^="post-"]').each((_idx, el) => {
        const titleElement = $(el).find('h2');
        const linkElement = $(el).find('a');
        const imageElement = $(el).find('img');

        const title = titleElement.text().trim();
        const url = linkElement.attr('href');
        const image = imageElement.attr('src') || imageElement.attr('data-src');

        const yearMatch = title.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : undefined;

        const cleanTitle = title
          .replace(/\s*\(\d{4}\)\s*/g, '')
          .replace(/\s*(HDRip|DVDScr|BRRip|DVDRip|WebRip|CAM|HDTS|Telugu|Movie|Watch Online Free)\s*/g, '')
          .trim();

        if (url && cleanTitle) {
          const movieId = url.replace(config.baseUrl, '').replace(/^\/+/, '').replace(/\/$/, '');

          searchResult.results.push({
            id: movieId,
            title: cleanTitle,
            url: url.startsWith('http') ? url : `${config.baseUrl}/${url}`,
            image: image?.startsWith('http') ? image : undefined,
            releaseDate: year,
            type: TvTypeEnum.MOVIE,
          });
        }
      });

      const nextButton = $('.pagination .next');
      searchResult.hasNextPage = nextButton.length > 0;

      return searchResult;
    } catch (err) {
      throw new Error(`Tollywood fetchTeluguFeatured failed: ${(err as Error).message}`);
    }
  };

  /**
   * Fetch Telugu movies by year
   */
  const fetchTeluguByYear = async (year: number, page: number = 1): Promise<ISearch<IMovieResult>> => {
    const searchResult: ISearch<IMovieResult> = {
      currentPage: page,
      hasNextPage: false,
      results: [],
    };

    try {
      const { data } = await axios.get(`${config.baseUrl}/category/telugu-movies-${year}/page/${page}/`);

      const $ = load(data);

      $('div[id^="post-"]').each((_idx, el) => {
        const titleElement = $(el).find('h2');
        const linkElement = $(el).find('a');
        const imageElement = $(el).find('img');

        const title = titleElement.text().trim();
        const url = linkElement.attr('href');
        const image = imageElement.attr('src') || imageElement.attr('data-src');

        const cleanTitle = title
          .replace(/\s*\(\d{4}\)\s*/g, '')
          .replace(/\s*(HDRip|DVDScr|BRRip|DVDRip|WebRip|CAM|HDTS|Telugu|Movie|Watch Online Free)\s*/g, '')
          .trim();

        if (url && cleanTitle) {
          const movieId = url.replace(config.baseUrl, '').replace(/^\/+/, '').replace(/\/$/, '');

          searchResult.results.push({
            id: movieId,
            title: cleanTitle,
            url: url.startsWith('http') ? url : `${config.baseUrl}/${url}`,
            image: image?.startsWith('http') ? image : undefined,
            releaseDate: year.toString(),
            type: TvTypeEnum.MOVIE,
          });
        }
      });

      const nextButton = $('.pagination .next');
      searchResult.hasNextPage = nextButton.length > 0;

      return searchResult;
    } catch (err) {
      throw new Error(`Tollywood fetchTeluguByYear failed: ${(err as Error).message}`);
    }
  };

  /**
   * Fetch media info for a movie
   */
  const fetchMediaInfo = async (mediaId: string): Promise<IMovieInfo> => {
    const url = mediaId.startsWith('http') ? mediaId : `${config.baseUrl}/${mediaId}`;

    const movieInfo: IMovieInfo = {
      id: mediaId,
      title: '',
      url,
    };

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = load(data);

      const title = $('h1').first().text().trim();
      movieInfo.title = title;

      const descriptionElement = $('div[class*="summary"], div[class*="description"], p.description').first();
      movieInfo.description = descriptionElement.text().trim() || '';

      const posterElement = $('img[class*="poster"], img.wp-post-image').first();
      movieInfo.image = posterElement.attr('src') || posterElement.attr('data-src');

      const yearMatch = title.match(/\((\d{4})\)/);
      movieInfo.releaseDate = yearMatch ? yearMatch[1] : undefined;

      const genres: string[] = [];
      $('a[rel="category tag"]').each((_idx, el) => {
        const genre = $(el).text().trim();
        if (genre && !genres.includes(genre)) {
          genres.push(genre);
        }
      });
      movieInfo.genres = genres;

      movieInfo.episodes = [
        {
          id: mediaId,
          title: title || 'Full Movie',
          number: 1,
          url,
        },
      ];

      movieInfo.type = TvTypeEnum.MOVIE;

      return movieInfo;
    } catch (err) {
      throw new Error(`Tollywood fetchMediaInfo failed: ${(err as Error).message}`);
    }
  };

  /**
   * Helper function to identify server name from URL
   */
  function getServerName(urlStr: string): string {
    if (urlStr.includes('streamtape')) return 'StreamTape';
    if (urlStr.includes('vcdnlare')) return 'VcdnLare';
    if (urlStr.includes('uperbox')) return 'UperBox';
    if (urlStr.includes('dropress')) return 'Dropress';
    if (urlStr.includes('vidshare')) return 'VidShare';
    if (urlStr.includes('mixdrop')) return 'MixDrop';
    if (urlStr.includes('dood')) return 'DoodStream';
    return 'Unknown';
  }

  /**
   * Fetch episode servers (streaming sources)
   */
  const fetchEpisodeServers = async (episodeId: string, _mediaId: string): Promise<IEpisodeServer[]> => {
    const url = episodeId.startsWith('http') ? episodeId : `${config.baseUrl}/${episodeId}`;

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = load(data);

      const servers: IEpisodeServer[] = [];

      const scripts = $('script').map((_idx, el) => $(el).html()).get();

      for (const script of scripts) {
        if (!script) continue;

        const iframeMatches = script.match(/https?:\/\/[^"'\s<>]+/gi) || [];

        for (const match of iframeMatches) {
          if (
            match.includes('streamtape') ||
            match.includes('vcdnlare') ||
            match.includes('uperbox') ||
            match.includes('dropress') ||
            match.includes('vidshare') ||
            match.includes('mixdrop') ||
            match.includes('dood')
          ) {
            const cleanUrl = match.replace(/[,\s"'"]$/, '');
            const serverName = getServerName(cleanUrl);

            if (!servers.find(s => s.url === cleanUrl)) {
              servers.push({
                name: serverName,
                url: cleanUrl,
              });
            }
          }
        }
      }

      $('iframe').each((_idx, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('streamtape') || src.includes('vcdnlare') || src.includes('uperbox') || src.includes('dropress'))) {
          const serverName = getServerName(src);
          if (!servers.find(s => s.url === src)) {
            servers.push({
              name: serverName,
              url: src,
            });
          }
        }
      });

      if (servers.length === 0) {
        servers.push({
          name: 'StreamTape',
          url,
        });
      }

      return servers;
    } catch (err) {
      throw new Error(`Tollywood fetchEpisodeServers failed: ${(err as Error).message}`);
    }
  };

  /**
   * Fetch episode sources (actual video URLs)
   */
  const fetchEpisodeSources = async (
    episodeId: string,
    mediaId: string,
    server: StreamingServers = StreamingServersEnum.StreamTape
  ): Promise<ISource> => {
    try {
      const servers = await fetchEpisodeServers(episodeId, mediaId);

      if (servers.length === 0) {
        throw new Error('No streaming servers found');
      }

      const serverData =
        servers.find(s => s.name.toLowerCase() === server.toLowerCase()) || servers[0]!;

      const serverUrl = new URL(serverData.url);

      if (serverData.url.includes('streamtape.com') || serverData.url.includes('streamtape')) {
        try {
          if (!StreamTape) {
            throw new Error('StreamTape extractor not available');
          }
          const streamTapeExtractor = new StreamTape();
          const sources = await streamTapeExtractor.extract(serverUrl);
          return {
            headers: { Referer: config.baseUrl },
            sources,
          };
        } catch {
          return {
            headers: { Referer: config.baseUrl },
            sources: [
              {
                url: serverData.url,
                isM3U8: serverData.url.includes('.m3u8'),
              },
            ],
          };
        }
      }

      if (serverData.url.includes('vcdnlare')) {
        return {
          headers: { Referer: config.baseUrl },
          sources: [
            {
              url: serverData.url,
              isM3U8: true,
            },
          ],
        };
      }

      if (serverData.url.includes('uperbox')) {
        return {
          headers: { Referer: config.baseUrl },
          sources: [
            {
              url: serverData.url,
              isM3U8: serverData.url.includes('.m3u8'),
            },
          ],
        };
      }

      if (serverData.url.includes('dropress')) {
        return {
          headers: { Referer: config.baseUrl },
          sources: [
            {
              url: serverData.url,
              isM3U8: serverData.url.includes('.m3u8'),
            },
          ],
        };
      }

      return {
        headers: { Referer: config.baseUrl },
        sources: [
          {
            url: serverData.url,
            isM3U8: serverData.url.includes('.m3u8'),
          },
        ],
      };
    } catch (err) {
      throw new Error(`Tollywood fetchEpisodeSources failed: ${(err as Error).message}`);
    }
  };

  /**
   * Fetch latest Telugu movies from homepage
   */
  const fetchLatestMovies = async (): Promise<IMovieResult[]> => {
    try {
      const { data } = await axios.get(config.baseUrl);

      const $ = load(data);
      const movies: IMovieResult[] = [];

      $('div[id^="post-"]').each((_idx, el) => {
        const titleElement = $(el).find('h2');
        const linkElement = $(el).find('a');
        const imageElement = $(el).find('img');

        const title = titleElement.text().trim();
        const url = linkElement.attr('href');
        const image = imageElement.attr('src') || imageElement.attr('data-src');

        const yearMatch = title.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : undefined;

        const cleanTitle = title
          .replace(/\s*\(\d{4}\)\s*/g, '')
          .replace(/\s*(HDRip|DVDScr|BRRip|DVDRip|WebRip|CAM|HDTS|Telugu|Hindi|Movie|Watch Online Free)\s*/g, '')
          .trim();

        if (url && cleanTitle) {
          const movieId = url.replace(config.baseUrl, '').replace(/^\/+/, '').replace(/\/$/, '');

          movies.push({
            id: movieId,
            title: cleanTitle,
            url: url.startsWith('http') ? url : `${config.baseUrl}/${url}`,
            image: image?.startsWith('http') ? image : undefined,
            releaseDate: year,
            type: TvTypeEnum.MOVIE,
          });
        }
      });

      return movies;
    } catch (err) {
      throw new Error(`Tollywood fetchLatestMovies failed: ${(err as Error).message}`);
    }
  };

  // Return functional provider object
  return {
    ...config,
    supportedTypes,

    // Core methods
    search,
    fetchMediaInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,

    // Tollywood-specific methods
    fetchTeluguFeatured,
    fetchTeluguByYear,
    fetchLatestMovies,
  };
}

export type TollywoodProviderInstance = ReturnType<typeof createTollywood>;
