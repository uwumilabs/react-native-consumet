import type { CheerioAPI } from 'cheerio';
import {
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IEpisodeServer,
  type StreamingServers,
  type MediaFormat,
  type SubOrDub,
  type WatchListType,
  type ProviderContext,
  type ProviderConfig,
} from '../../../models';

export function createZoro(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, extractors, enums, createCustomBaseUrl, PolyURL } = ctx;
  const { StreamSB, MegaCloud, StreamTape } = extractors;
  const {
    StreamingServers: StreamingServersEnum,
    SubOrDub: SubOrDubEnum,
    MediaStatus: MediaStatusEnum,
    WatchListType: WatchListTypeEnum,
  } = enums;

  // Provider configuration - use the standardized base URL creation
  const baseUrl = createCustomBaseUrl('https://hianime.to', customBaseURL);

  const config: ProviderConfig = {
    name: 'Zoro',
    languages: 'en',
    classPath: 'ANIME.Zoro',
    logo: 'https://is3-ssl.mzstatic.com/image/thumb/Purple112/v4/7e/91/00/7e9100ee-2b62-0942-4cdc-e9b93252ce1c/source/512x512bb.jpg',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true,
  };

  // Helper functions
  const normalizePageNumber = (page: number): number => {
    return page <= 0 ? 1 : page;
  };

  // Main provider functions
  const search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/search?keyword=${decodeURIComponent(query)}&page=${normalizedPage}`);
  };

  const fetchAdvancedSearch = async (
    page: number = 1,
    type?: string,
    status?: string,
    rated?: string,
    score?: number,
    season?: string,
    language?: string,
    startDate?: { year: number; month: number; day: number },
    endDate?: { year: number; month: number; day: number },
    sort?: string,
    genres?: string[]
  ): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);

    const mappings = {
      type: { movie: 1, tv: 2, ova: 3, ona: 4, special: 5, music: 6 },
      status: { finished_airing: 1, currently_airing: 2, not_yet_aired: 3 },
      rated: { g: 1, pg: 2, pg_13: 3, r: 4, r_plus: 5, rx: 6 },
      season: { spring: 1, summer: 2, fall: 3, winter: 4 },
      language: { sub: 1, dub: 2, sub_dub: 3 },
      genre: {
        action: 1,
        adventure: 2,
        cars: 3,
        comedy: 4,
        dementia: 5,
        demons: 6,
        mystery: 7,
        drama: 8,
        ecchi: 9,
        fantasy: 10,
        game: 11,
        historical: 12,
        horror: 13,
        kids: 14,
        magic: 15,
        martial_arts: 16,
        mecha: 17,
        music: 18,
        parody: 19,
        samurai: 20,
        romance: 21,
        school: 22,
        sci_fi: 23,
        shoujo: 24,
        shoujo_ai: 25,
        shounen: 26,
        shounen_ai: 27,
        space: 28,
        sports: 29,
        super_power: 30,
        vampire: 31,
        harem: 32,
        slice_of_life: 33,
        supernatural: 34,
        military: 35,
        police: 36,
        psychological: 37,
        thriller: 38,
        seinen: 39,
        josei: 40,
        isekai: 41,
      },
    };

    const params = new URLSearchParams();
    params.append('page', normalizedPage.toString());

    if (type && mappings.type[type as keyof typeof mappings.type]) {
      params.append('type', mappings.type[type as keyof typeof mappings.type].toString());
    }
    if (status && mappings.status[status as keyof typeof mappings.status]) {
      params.append('status', mappings.status[status as keyof typeof mappings.status].toString());
    }
    if (rated && mappings.rated[rated as keyof typeof mappings.rated]) {
      params.append('rated', mappings.rated[rated as keyof typeof mappings.rated].toString());
    }
    if (score) params.append('score', score.toString());
    if (season && mappings.season[season as keyof typeof mappings.season]) {
      params.append('season', mappings.season[season as keyof typeof mappings.season].toString());
    }
    if (language && mappings.language[language as keyof typeof mappings.language]) {
      params.append('language', mappings.language[language as keyof typeof mappings.language].toString());
    }
    if (sort) params.append('sort', sort);

    if (startDate) {
      params.append(
        'start_date',
        `${startDate.year}-${startDate.month.toString().padStart(2, '0')}-${startDate.day.toString().padStart(2, '0')}`
      );
    }
    if (endDate) {
      params.append(
        'end_date',
        `${endDate.year}-${endDate.month.toString().padStart(2, '0')}-${endDate.day.toString().padStart(2, '0')}`
      );
    }

    if (genres && genres.length > 0) {
      const genreIds = genres.map((g) => mappings.genre[g as keyof typeof mappings.genre]).filter(Boolean);
      if (genreIds.length > 0) {
        params.append('genres', genreIds.join(','));
      }
    }

    return scrapeCardPage(`${config.baseUrl}/filter?${params.toString()}`);
  };

  const fetchTopAiring = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/top-airing?page=${normalizedPage}`);
  };

  const fetchMostPopular = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/most-popular?page=${normalizedPage}`);
  };

  const fetchMostFavorite = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/most-favorite?page=${normalizedPage}`);
  };

  const fetchLatestCompleted = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/completed?page=${normalizedPage}`);
  };

  const fetchRecentlyUpdated = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/recently-updated?page=${normalizedPage}`);
  };

  const fetchRecentlyAdded = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/recently-added?page=${normalizedPage}`);
  };

  const fetchTopUpcoming = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/top-upcoming?page=${normalizedPage}`);
  };

  const fetchStudio = async (studio: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/producer/${studio}?page=${normalizedPage}`);
  };

  const fetchSubbedAnime = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/subbed-anime?page=${normalizedPage}`);
  };

  const fetchDubbedAnime = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/dubbed-anime?page=${normalizedPage}`);
  };

  const fetchMovie = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/movie?page=${normalizedPage}`);
  };

  const fetchTV = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/tv?page=${normalizedPage}`);
  };

  const fetchOVA = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/ova?page=${normalizedPage}`);
  };

  const fetchONA = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/ona?page=${normalizedPage}`);
  };

  const fetchSpecial = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/special?page=${normalizedPage}`);
  };

  const fetchGenres = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/genre?page=${normalizedPage}`);
  };

  const genreSearch = async (genre: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/genre/${genre}?page=${normalizedPage}`);
  };

  const fetchSchedule = async (date: string): Promise<IAnimeResult[]> => {
    try {
      const response = await fetch(`${config.baseUrl}/ajax/schedule/list?tzOffset=-330&date=${date}`);
      const data = await response.json();
      const $ = load(data.html);

      return await scrapeCard($);
    } catch (error) {
      throw new Error(`Failed to fetch schedule: ${error}`);
    }
  };

  const fetchSpotlight = async (): Promise<IAnimeResult[]> => {
    try {
      const response = await fetch(config.baseUrl);
      const data = await response.text();
      const $ = load(data);

      const results: IAnimeResult[] = [];

      $('.deslide-item').each((_, element) => {
        const id = $(element).find('a').attr('href')?.split('/')[1] || '';
        const title = $(element).find('.desi-head-title').text().trim();
        const poster =
          $(element)
            .find('.desi-buttons-wrap .btn-secondary')
            .attr('href')
            ?.match(/url=([^&]+)/)?.[1] || '';
        const description = $(element).find('.desi-description').text().trim();

        if (id) {
          results.push({
            id,
            title,
            url: `${config.baseUrl}/${id}`,
            image: decodeURIComponent(poster),
            description,
          });
        }
      });

      return results;
    } catch (error) {
      throw new Error(`Failed to fetch spotlight: ${error}`);
    }
  };

  const fetchSearchSuggestions = async (query: string): Promise<IAnimeResult[]> => {
    try {
      const response = await fetch(`${config.baseUrl}/ajax/search/suggest?keyword=${encodeURIComponent(query)}`);
      const data = await response.json();
      const $ = load(data.html);

      return await scrapeCard($);
    } catch (error) {
      throw new Error(`Failed to fetch search suggestions: ${error}`);
    }
  };

  const fetchContinueWatching = async (): Promise<IAnimeResult[]> => {
    try {
      const response = await fetch(`${config.baseUrl}/ajax/home/widget/continue-watching`);
      const data = await response.json();
      const $ = load(data.html);

      return await scrapeCard($);
    } catch (error) {
      throw new Error(`Failed to fetch continue watching: ${error}`);
    }
  };

  const fetchWatchList = async (watchListType: WatchListType): Promise<IAnimeResult[]> => {
    try {
      const response = await fetch(`${config.baseUrl}/ajax/user/watchlist/${watchListType}`);
      const data = await response.json();
      const $ = load(data.html);

      return await scrapeCard($);
    } catch (error) {
      throw new Error(`Failed to fetch watch list: ${error}`);
    }
  };

  const fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    try {
      const animeUrl = `${config.baseUrl}/${id}`;
      const response = await fetch(animeUrl);
      const data = await response.text();
      const $ = load(data);

      const info: IAnimeInfo = {
        id: id,
        title: $('.anisc-detail h2.film-name').text().trim(),
        url: animeUrl,
        genres: [],
        totalEpisodes: 0,
      };

      info.image = $('.film-poster img').attr('src');
      info.description = $('.film-description .text').text().trim();

      // Extract genres
      $('.item-list a[href*="/genre/"]').each((_, el) => {
        info.genres?.push($(el).text().trim());
      });

      // Extract other info from the info list
      $('.anisc-info .item').each((_, item) => {
        const label = $(item).find('.item-head').text().trim().toLowerCase();
        const value =
          $(item).find('.name').text().trim() || $(item).text().replace($(item).find('.item-head').text(), '').trim();

        if (label.includes('studio')) info.studios = [value];
        if (label.includes('duration')) info.duration = value;
        if (label.includes('status')) {
          switch (value) {
            case 'Finished Airing':
              info.status = MediaStatusEnum.COMPLETED;
              break;
            case 'Currently Airing':
              info.status = MediaStatusEnum.ONGOING;
              break;
            case 'Not yet aired':
              info.status = MediaStatusEnum.NOT_YET_AIRED;
              break;
            default:
              info.status = MediaStatusEnum.UNKNOWN;
              break;
          }
        }
        if (label.includes('type')) info.type = value as MediaFormat;
        if (label.includes('score')) info.rating = parseFloat(value);
        if (label.includes('premiered')) info.releaseDate = value;
        if (label.includes('japanese')) info.japaneseTitle = value;
      });

      // Check for sub/dub availability
      const hasSub: boolean = $('div.film-stats div.tick div.tick-item.tick-sub').length > 0;
      const hasDub: boolean = $('div.film-stats div.tick div.tick-item.tick-dub').length > 0;

      if (hasSub) {
        info.subOrDub = SubOrDubEnum.SUB;
        info.hasSub = hasSub;
      }
      if (hasDub) {
        info.subOrDub = SubOrDubEnum.DUB;
        info.hasDub = hasDub;
      }
      if (hasSub && hasDub) {
        info.subOrDub = SubOrDubEnum.BOTH;
      }

      // Fetch episodes
      const episodesResponse = await fetch(`${config.baseUrl}/ajax/v2/episode/list/${id.split('-').pop()}`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${config.baseUrl}/watch/${id}`,
        },
      });
      const episodesData = await episodesResponse.json();
      const $$ = load(episodesData.html);

      const episodeElements = $$('div.detail-infor-content > div > a');
      const subCount = parseInt($('div.film-stats div.tick div.tick-item.tick-sub').text().trim()) || 0;
      const dubCount = parseInt($('div.film-stats div.tick div.tick-item.tick-dub').text().trim()) || 0;

      info.totalEpisodes = episodeElements.length;
      info.episodes = [];

      episodeElements.each((i, el) => {
        const $el = $$(el);
        const href = $el.attr('href') || '';
        const number = parseInt($el.attr('data-number') || '0');

        info.episodes?.push({
          id: href.split('/')[2]?.replace('?ep=', '$episode$') || '',
          number: number,
          title: $el.attr('title'),
          isFiller: $el.hasClass('ssl-item-filler'),
          isSubbed: number <= subCount,
          isDubbed: number <= dubCount,
          url: config.baseUrl + href,
        });
      });

      return info;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const fetchEpisodeSources = async (
    episodeId: string,
    server: StreamingServers = StreamingServersEnum.MegaCloud,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<ISource> => {
    if (episodeId.startsWith('http')) {
      const serverUrl = new PolyURL(episodeId);
      switch (server) {
        case StreamingServersEnum.MegaCloud:
          return {
            headers: { Referer: serverUrl.href },
            ...(await MegaCloud().extract(serverUrl, config.baseUrl)),
          };
        default:
          return {
            headers: { Referer: serverUrl.href },
            ...(await MegaCloud().extract(serverUrl, config.baseUrl)),
          };
      }
    }
    if (!episodeId.includes('$episode$')) throw new Error('Invalid episode id');

    episodeId = `${config.baseUrl}/watch/${episodeId.replace('$episode$', '?ep=').replace(/\$auto|\$sub|\$dub/gi, '')}`;
    try {
      const servers = await fetchEpisodeServers(episodeId.split('?ep=')[1]!, subOrDub);
      const i = servers.findIndex((s) => s.name.toLowerCase().includes(server));
      if (i === -1) {
        throw new Error(`Server ${server} not found`);
      }

      const serverUrl: URL = new URL(servers[i]!.url);

      return await fetchEpisodeSources(serverUrl.href, server, SubOrDubEnum.SUB);
    } catch (err) {
      throw err;
    }
  };

  const fetchEpisodeServers = async (episodeId: string, subOrDub: SubOrDub): Promise<IEpisodeServer[]> => {
    try {
      const response = await fetch(`${config.baseUrl}/ajax/v2/episode/servers?episodeId=${episodeId}`);
      const data = await response.json();
      const $ = load(data.html);
      const scrapedServers: any[] = [];
      let selector;
      try {
        selector = `.ps_-block.ps_-block-sub.servers-${false ? 'raw' : subOrDub} > .ps__-list .server-item`;
      } catch {
        selector = `.ps_-block.ps_-block-sub.servers-${true ? 'raw' : subOrDub} > .ps__-list .server-item`;
      }
      $(selector).each((_, element) => {
        const name = $(element).text().trim();
        const sourcesId = $(element).attr('data-id') || '';
        const subOrDubValue = $(element).attr('data-type') === 'sub' ? SubOrDubEnum.SUB : SubOrDubEnum.DUB;

        scrapedServers.push({
          name,
          sourcesId,
          subOrDub: subOrDubValue,
        });
      });
      const servers: IEpisodeServer[] = await Promise.all(
        scrapedServers.map(async (server) => {
          const { data } = await axios.get(`https://hianime.to/ajax/v2/episode/sources?id=${server.sourcesId}`);
          return {
            name: `megacloud-${server.name.toLowerCase()}`,
            url: data.link,
          };
        })
      );
      return servers;
    } catch (error) {
      throw new Error(`Failed to fetch episode servers: ${error}`);
    }
  };

  const verifyLoginState = async (connectSid?: string): Promise<boolean> => {
    try {
      const headers: any = {};
      if (connectSid) {
        headers.Cookie = `connect.sid=${connectSid}`;
      }
      const response = await fetch(`${config.baseUrl}/ajax/login-state`, { headers });
      const data = await response.json();
      return data.is_login;
    } catch (err) {
      return false;
    }
  };

  const scrapeCard = async ($: CheerioAPI): Promise<IAnimeResult[]> => {
    try {
      const results: IAnimeResult[] = [];

      $('.flw-item').each((i, ele) => {
        const card = $(ele);
        const atag = card.find('.film-name a');
        const id = atag.attr('href')?.split('/')[1]!.split('?')[0];
        const watchList = card.find('.dropdown-menu .added').text().trim() as WatchListType;
        const type = card
          .find('.fdi-item')
          ?.first()
          ?.text()
          .replace(' (? eps)', '')
          .replace(/\s\(\d+ eps\)/g, '');
        results.push({
          id: id!,
          title: atag.text(),
          url: `${config.baseUrl}${atag.attr('href')}`,
          image: card.find('img')?.attr('data-src'),
          duration: card.find('.fdi-duration')?.text(),
          watchList: watchList || WatchListTypeEnum.NONE,
          japaneseTitle: atag.attr('data-jname'),
          type: type as MediaFormat,
          nsfw: card.find('.tick-rate')?.text() === '18+' ? true : false,
          sub: parseInt(card.find('.tick-item.tick-sub')?.text()) || 0,
          dub: parseInt(card.find('.tick-item.tick-dub')?.text()) || 0,
          episodes: parseInt(card.find('.tick-item.tick-eps')?.text()) || 0,
        });
      });
      return results;
    } catch (err) {
      //console.log(err);
      throw new Error(`Failed to scrape card: ${err}`);
    }
  };

  const scrapeCardPage = async (url: string, headers?: object): Promise<ISearch<IAnimeResult>> => {
    try {
      const res: ISearch<IAnimeResult> = {
        currentPage: 0,
        hasNextPage: false,
        totalPages: 0,
        results: [],
      };
      const response = await fetch(url, headers);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }

      const data = await response.text();
      const $ = load(data);

      const pagination = $('ul.pagination');
      res.currentPage = parseInt(pagination.find('.page-item.active')?.text());
      const nextPage = pagination.find('a[title=Next]')?.attr('href');
      if (nextPage !== undefined && nextPage !== '') {
        res.hasNextPage = true;
      }
      const totalPages = pagination.find('a[title=Last]').attr('href')?.split('=').pop();
      if (totalPages === undefined || totalPages === '') {
        res.totalPages = res.currentPage;
      } else {
        res.totalPages = parseInt(totalPages);
      }

      res.results = await scrapeCard($);
      if (res.results.length === 0) {
        res.currentPage = 0;
        res.hasNextPage = false;
        res.totalPages = 0;
      }
      return res;
    } catch (err) {
      console.error('scrapeCardPage error:', err);
      throw new Error(`Failed to scrape page ${url}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Return the functional provider object
  return {
    // Configuration
    name: config.name,
    get baseUrl() {
      return config.baseUrl;
    },
    set baseUrl(value: string) {
      config.baseUrl = value.startsWith('http') ? value : `http://${value}`;
    },
    logo: config.logo,
    classPath: config.classPath,

    // Core methods, pass only the necessary methods, dont pass helpers or unused methods
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
    fetchContinueWatching,
    fetchWatchList,
    fetchAnimeInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
  };
}

// Type definition for the provider instance returned by createZoro
export type ZoroProviderInstance = ReturnType<typeof createZoro>;

// Default export for backward compatibility
export default createZoro;
