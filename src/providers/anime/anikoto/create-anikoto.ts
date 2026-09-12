import {
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type IAnimeEpisode,
  type ISource,
  type IEpisodeServer,
  type StreamingServers,
  type MediaFormat,
  type SubOrDub,
  type ProviderContext,
  type ProviderConfig,
} from '../../../models';

function createAniKoto(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, extractors, enums, createCustomBaseUrl, PolyURL } = ctx;
  const { MegaPlay } = extractors;
  const { StreamingServers: StreamingServersEnum, SubOrDub: SubOrDubEnum, MediaStatus: MediaStatusEnum } = enums;

  // Provider configuration
  const baseUrl = createCustomBaseUrl('https://anikototv.to', customBaseURL);

  const config: ProviderConfig = {
    name: 'AniKoto',
    languages: 'en',
    classPath: 'ANIME.AniKoto',
    logo: 'https://anikototv.to/favicon-32x32.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true,
  };

  const defaultHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  const ajaxHeaders = (referer?: string) => ({
    ...defaultHeaders,
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': referer || config.baseUrl,
  });

  const normalizePageNumber = (page: number): number => {
    return page <= 0 ? 1 : page;
  };

  // Helper to scrape card lists across search, types, genres, statuses
  const scrapeCardPage = async (url: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    try {
      const { data } = await axios.get(url, { headers: defaultHeaders });
      const $ = load(data);
      const results: IAnimeResult[] = [];

      $('.item').each((_, el) => {
        const item = $(el);
        const nameEl = item.find('.name.d-title, .name').first();
        const title = nameEl.text().trim();
        const japaneseTitle = nameEl.attr('data-jp') || undefined;

        const href = item.find('a.name, .poster a').first().attr('href') || '';
        const match = href.match(/\/watch\/([^/?#]+)/);
        const id = match ? match[1]! : href.replace(/^.*\/watch\//, '').replace(/\/.*$/, '');

        const image = item.find('.poster img, img').attr('src') || '';
        const subText = item.find('.ep-status.sub').first().text().trim();
        const sub = parseInt(subText, 10) || 0;

        const dubText = item.find('.ep-status.dub').first().text().trim();
        const dub = parseInt(dubText, 10) || 0;

        const type = (item.find('.meta .right').first().text().trim() || 'TV') as MediaFormat;
        const ratingStr = item.find('.m-item.rated span').first().text().trim();
        const rating = ratingStr ? parseFloat(ratingStr) : undefined;

        if (id && title) {
          results.push({
            id,
            title,
            japaneseTitle,
            image,
            url: href.startsWith('http') ? href : `${config.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
            type,
            sub,
            dub,
            rating,
          });
        }
      });

      const hasNextPage =
        $('.pagination .page-item .page-link[rel="next"]').length > 0 ||
        $('.pagination .page-item.active').next('.page-item').find('.page-link').length > 0;

      const lastPageHref = $('.pagination .page-item a[title="Last"]').attr('href') || '';
      const lastPageMatch = lastPageHref.match(/page=(\d+)/);
      const totalPages = lastPageMatch ? parseInt(lastPageMatch[1]!, 10) : undefined;

      return {
        currentPage: page,
        hasNextPage,
        totalPages,
        results,
      };
    } catch (err) {
      throw new Error(`[AniKoto] Failed to scrape card page: ${(err as Error).message}`);
    }
  };

  // Main provider functions
  const search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(
      `${config.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${normalizedPage}`,
      normalizedPage
    );
  };

  const fetchAdvancedSearch = async (
    page: number = 1,
    type?: string,
    status?: string,
    rated?: string,
    score?: number,
    season?: string,
    language?: string,
    _startDate?: { year: number; month: number; day: number },
    _endDate?: { year: number; month: number; day: number },
    sort?: string,
    genres?: string[]
  ): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    const params = new URLSearchParams();
    params.set('page', String(normalizedPage));

    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (rated) params.set('rated', rated);
    if (score) params.set('score', String(score));
    if (season) params.set('season', season);
    if (language) params.set('language', language);
    if (sort) params.set('sort', sort);
    if (genres && genres.length > 0) {
      for (const g of genres) {
        params.append('genres[]', g);
      }
    }

    return scrapeCardPage(`${config.baseUrl}/filter?${params.toString()}`, normalizedPage);
  };

  const fetchTopAiring = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/status/currently-airing?page=${normalizedPage}`, normalizedPage);
  };

  const fetchMostPopular = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/most-viewed?page=${normalizedPage}`, normalizedPage);
  };

  const fetchMostFavorite = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/filter?sort=most_favorite&page=${normalizedPage}`, normalizedPage);
  };

  const fetchLatestCompleted = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/status/finished-airing?page=${normalizedPage}`, normalizedPage);
  };

  const fetchRecentlyUpdated = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/latest-updated?page=${normalizedPage}`, normalizedPage);
  };

  const fetchRecentlyAdded = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/new-release?page=${normalizedPage}`, normalizedPage);
  };

  const fetchTopUpcoming = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/status/not-yet-aired?page=${normalizedPage}`, normalizedPage);
  };

  const fetchStudio = async (studioId: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/studio/${studioId}?page=${normalizedPage}`, normalizedPage);
  };

  const fetchSubbedAnime = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/filter?language=1&page=${normalizedPage}`, normalizedPage);
  };

  const fetchDubbedAnime = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/filter?language=2&page=${normalizedPage}`, normalizedPage);
  };

  const fetchMovie = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/movie?page=${normalizedPage}`, normalizedPage);
  };

  const fetchTV = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/tv?page=${normalizedPage}`, normalizedPage);
  };

  const fetchOVA = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/ova?page=${normalizedPage}`, normalizedPage);
  };

  const fetchONA = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/ona?page=${normalizedPage}`, normalizedPage);
  };

  const fetchSpecial = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/special?page=${normalizedPage}`, normalizedPage);
  };

  const fetchGenres = async (): Promise<string[]> => {
    try {
      const { data } = await axios.get(`${config.baseUrl}/home`, { headers: defaultHeaders });
      const $ = load(data);
      const genres: string[] = [];
      $('a[href*="/genre/"]').each((_, el) => {
        const g = $(el).text().trim();
        if (g && !genres.includes(g)) {
          genres.push(g);
        }
      });
      return genres.length > 0
        ? genres
        : [
            'Action',
            'Adventure',
            'Comedy',
            'Drama',
            'Fantasy',
            'Horror',
            'Mystery',
            'Romance',
            'Sci-Fi',
            'Slice of Life',
            'Supernatural',
          ];
    } catch {
      return [
        'Action',
        'Adventure',
        'Comedy',
        'Drama',
        'Fantasy',
        'Horror',
        'Mystery',
        'Romance',
        'Sci-Fi',
        'Slice of Life',
        'Supernatural',
      ];
    }
  };

  const genreSearch = async (genre: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    const cleanGenre = genre.toLowerCase().replace(/\s+/g, '-');
    return scrapeCardPage(`${config.baseUrl}/genre/${cleanGenre}?page=${normalizedPage}`, normalizedPage);
  };

  const fetchSchedule = async (date: string): Promise<IAnimeResult[]> => {
    try {
      const res = await axios.get(`${config.baseUrl}/ajax/schedule/date?date=${date}&tzOffset=-330`, {
        headers: ajaxHeaders(),
      });
      const html = res.data?.result || res.data;
      const $ = load(html);
      const results: IAnimeResult[] = [];

      $('a.item').each((_, el) => {
        const item = $(el);
        const href = item.attr('href') || '';
        const match = href.match(/\/watch\/([^/?#]+)/);
        const id = match ? match[1]! : href;
        const title = item.find('.title.d-title, .title').text().trim();
        const time = item.find('.time').text().trim();
        const episodeText = item.find('.ep span').text().trim();

        if (id && title) {
          results.push({
            id,
            title,
            url: href,
            time,
            episodeText,
          } as any);
        }
      });

      return results;
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch schedule: ${(err as Error).message}`);
    }
  };

  const fetchSpotlight = async (): Promise<IAnimeResult[]> => {
    try {
      const { data } = await axios.get(`${config.baseUrl}/home`, { headers: defaultHeaders });
      const $ = load(data);
      const results: IAnimeResult[] = [];

      $('.swiper-slide.item').each((_, el) => {
        const slide = $(el);
        const title = slide.find('.title.d-title, .title').text().trim();
        const japaneseTitle = slide.find('.title.d-title').attr('data-jp') || undefined;
        const href = slide.find('a[href*="/watch/"]').first().attr('href') || '';
        const match = href.match(/\/watch\/([^/?#]+)/);
        const id = match ? match[1]! : '';
        const description = slide.find('.synopsis').text().trim() || undefined;
        const image = slide.find('img').attr('src') || '';

        if (id && title) {
          results.push({
            id,
            title,
            japaneseTitle,
            description,
            image,
            url: href.startsWith('http') ? href : `${config.baseUrl}${href}`,
          });
        }
      });

      return results;
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch spotlight: ${(err as Error).message}`);
    }
  };

  const fetchSearchSuggestions = async (query: string): Promise<IAnimeResult[]> => {
    try {
      const res = await axios.get(`${config.baseUrl}/ajax/anime/search?keyword=${encodeURIComponent(query)}`, {
        headers: ajaxHeaders(),
      });
      const html = res.data?.result?.html || res.data?.result || res.data;
      const $ = load(html);
      const suggestions: IAnimeResult[] = [];

      $('a.item').each((_, el) => {
        const item = $(el);
        const href = item.attr('href') || '';
        const match = href.match(/\/watch\/([^/?#]+)/);
        const id = match ? match[1]! : '';
        const title = item.find('.name.d-title, .name').text().trim();
        const japaneseTitle = item.find('.name.d-title').attr('data-jp') || undefined;
        const image = item.find('.poster img, img').attr('src') || '';

        if (id && title) {
          suggestions.push({
            id,
            title,
            japaneseTitle,
            image,
            url: href,
          });
        }
      });

      return suggestions;
    } catch {
      return [];
    }
  };

  const fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    try {
      const animeSlug = id.replace(/^\/watch\//, '').replace(/\/.*$/, '');
      const watchUrl = `${config.baseUrl}/watch/${animeSlug}`;
      const { data: pageHtml } = await axios.get(watchUrl, { headers: defaultHeaders });
      const $ = load(pageHtml);

      const title = $('#w-info .title.d-title, h1.title').first().text().trim();
      const japaneseTitle =
        $('#w-info .title.d-title').attr('data-jp') || $('#w-info .names').text().split(';')[1]?.trim() || title;

      const image = $('#w-info .poster img').attr('src') || $('meta[property="og:image"]').attr('content') || '';
      const description = $('#w-info .synopsis .content, .synopsis')
        .text()
        .replace(/\[more\]/g, '')
        .trim();

      // Extract anime ID (data-id e.g. 7174)
      const dataId =
        $('#watch-main').attr('data-id') ||
        $('.layout-page-watchtv').attr('data-id') ||
        $('#w-rating').attr('data-id') ||
        $('[data-id]').first().attr('data-id');

      // Extract metadata
      let type: MediaFormat = 'TV' as MediaFormat;
      let premiered: string | undefined;
      let aired: string | undefined;
      let status: any = MediaStatusEnum.UNKNOWN;
      const genres: string[] = [];
      const studios: string[] = [];
      const producers: string[] = [];
      let duration: string | undefined;
      let rating: number | undefined;

      $('#w-info .bmeta .meta div').each((_, el) => {
        const text = $(el).text();
        if (text.includes('Type:')) {
          type = $(el).find('span').text().trim() as MediaFormat;
        } else if (text.includes('Premiered:')) {
          premiered = $(el).find('span').text().trim();
        } else if (text.includes('Aired:')) {
          aired = $(el).find('span').text().trim();
        } else if (text.includes('Status:')) {
          const s = $(el).find('span').text().trim().toLowerCase();
          if (s.includes('finished')) status = MediaStatusEnum.COMPLETED;
          else if (s.includes('airing') || s.includes('ongoing')) status = MediaStatusEnum.ONGOING;
          else if (s.includes('not yet')) status = MediaStatusEnum.NOT_YET_AIRED;
        } else if (text.includes('Genres:')) {
          $(el)
            .find('a')
            .each((_, a) => {
              const g = $(a).text().trim();
              if (g && !genres.includes(g)) genres.push(g);
            });
        } else if (text.includes('Studios:')) {
          $(el)
            .find('a')
            .each((_, a) => {
              const st = $(a).text().trim();
              if (st && !studios.includes(st)) studios.push(st);
            });
        } else if (text.includes('Producers:')) {
          $(el)
            .find('a')
            .each((_, a) => {
              const pr = $(a).text().trim();
              if (pr && pr !== 'unknown' && !producers.includes(pr)) producers.push(pr);
            });
        } else if (text.includes('Duration:')) {
          duration = $(el).find('span').text().trim();
        } else if (text.includes('MAL:')) {
          const r = $(el).find('span').text().trim();
          rating = r ? parseFloat(r) : undefined;
        }
      });

      // Fetch episodes from /ajax/episode/list/${dataId}
      const episodes: IAnimeEpisode[] = [];
      if (dataId) {
        try {
          const epRes = await axios.get(`${config.baseUrl}/ajax/episode/list/${dataId}`, {
            headers: ajaxHeaders(watchUrl),
          });
          const epHtml = epRes.data?.result || epRes.data;
          const $ep = load(epHtml);

          $ep('li a').each((_, a) => {
            const anchor = $ep(a);
            const dataIds = anchor.attr('data-ids') || anchor.attr('data-id') || '';
            const numAttr = anchor.attr('data-num') || anchor.attr('data-slug') || anchor.find('b').text().trim();
            const num = parseInt(numAttr, 10) || 1;
            const epTitle = anchor.find('.d-title').text().trim() || `Episode ${num}`;

            if (dataIds) {
              episodes.push({
                id: `${animeSlug}$episode$${dataIds}`,
                number: num,
                title: epTitle,
                url: `${config.baseUrl}/watch/${animeSlug}/ep-${num}`,
              });
            }
          });
        } catch {
          // Keep empty episodes if request fails
        }
      }

      return {
        id: animeSlug,
        title,
        japaneseTitle,
        image,
        description,
        type,
        status,
        genres,
        studios,
        producers,
        duration,
        rating,
        aired,
        season: premiered,
        totalEpisodes: episodes.length > 0 ? episodes.length : undefined,
        episodes,
      };
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch anime info: ${(err as Error).message}`);
    }
  };

  const fetchEpisodeServers = async (
    episodeId: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<IEpisodeServer[]> => {
    try {
      const dataIds = episodeId.includes('$episode$') ? episodeId.split('$episode$')[1]! : episodeId;
      const targetSubDub = subOrDub === SubOrDubEnum.DUB ? 'dub' : 'sub';

      const res = await axios.get(`${config.baseUrl}/ajax/server/list?servers=${encodeURIComponent(dataIds)}`, {
        headers: ajaxHeaders(),
      });

      const html = res.data?.result || res.data;
      const $ = load(html);
      const rawServers: { name: string; linkId: string }[] = [];

      let serverList = $(`.servers .type[data-type="${targetSubDub}"] li[data-link-id]`);
      if (!serverList.length) {
        // Fallback to any available type
        serverList = $('.servers li[data-link-id]');
      }

      serverList.each((_, el) => {
        const item = $(el);
        const name = item.text().trim();
        const linkId = item.attr('data-link-id');
        if (linkId) {
          rawServers.push({ name, linkId });
        }
      });

      // Resolve each server link to its embed URL via /ajax/server?get=
      const servers: IEpisodeServer[] = [];
      for (const s of rawServers) {
        try {
          const { data: linkData } = await axios.get(
            `${config.baseUrl}/ajax/server?get=${encodeURIComponent(s.linkId)}`,
            { headers: ajaxHeaders() }
          );

          const embedUrl = linkData?.result?.url;
          if (embedUrl) {
            servers.push({
              name: `megaplay-${s.name.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`,
              url: embedUrl,
            });
          }
        } catch {
          // Continue to next server
        }
      }

      return servers;
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch episode servers: ${(err as Error).message}`);
    }
  };

  const fetchEpisodeSources = async (
    episodeId: string,
    server: StreamingServers = StreamingServersEnum.MegaPlay,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<ISource> => {
    if (episodeId.startsWith('http')) {
      const serverUrl = new PolyURL(episodeId);
      switch (server) {
        case StreamingServersEnum.MegaPlay:
        default:
          return {
            headers: { Referer: serverUrl.href },
            ...(await MegaPlay().extract(serverUrl, config.baseUrl)),
          };
      }
    }

    try {
      const servers = await fetchEpisodeServers(episodeId, subOrDub);
      if (!servers.length) {
        throw new Error(`[AniKoto] No servers available for episode: ${episodeId}`);
      }

      const matchedServer =
        servers.find((s) => s.name.toLowerCase().includes(String(server).toLowerCase())) || servers[0]!;

      const serverUrl = new PolyURL(matchedServer.url);
      return {
        headers: { Referer: serverUrl.href },
        ...(await MegaPlay().extract(serverUrl, config.baseUrl)),
      };
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch episode sources: ${(err as Error).message}`);
    }
  };

  return {
    ...config,
    search,
    fetchAdvancedSearch,
    fetchTopAiring,
    fetchMostPopular,
    fetchMostFavorite,
    fetchLatestCompleted,
    fetchRecentlyUpdated,
    fetchRecentlyAdded,
    fetchTopUpcoming,
    fetchStudio,
    fetchSubbedAnime,
    fetchDubbedAnime,
    fetchMovie,
    fetchTV,
    fetchOVA,
    fetchONA,
    fetchSpecial,
    fetchGenres,
    genreSearch,
    fetchSchedule,
    fetchSpotlight,
    fetchSearchSuggestions,
    fetchAnimeInfo,
    fetchEpisodeServers,
    fetchEpisodeSources,
  };
}

export type AniKotoProviderInstance = ReturnType<typeof createAniKoto>;
export default createAniKoto;
