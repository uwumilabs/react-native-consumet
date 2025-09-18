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
  type ProviderContext,
  type ProviderConfig,
} from '../../../models';

function createAnimeSuge(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, extractors, enums, createCustomBaseUrl, PolyURL } = ctx;
  const { MegaCloud } = extractors;
  const { StreamingServers: StreamingServersEnum, SubOrDub: SubOrDubEnum, MediaStatus: MediaStatusEnum } = enums;

  // Provider configuration - use the standardized base URL creation
  const baseUrl = createCustomBaseUrl('https://hianime.to', customBaseURL);

  const config: ProviderConfig = {
    name: 'AnimeSuge',
    languages: 'en',
    classPath: 'ANIME.AnimeSuge',
    logo: 'https://animesuge.bz/assets/images/favicon.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true,
  };

  // Helper functions
  const normalizePageNumber = (page: number): number => {
    return page <= 0 ? 1 : page;
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Referer': 'https://animesuge.bz/',
    'X-Requested-With': 'XMLHttpRequest',
  };

  // Main provider functions
  const search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/filter?keyword=${decodeURIComponent(query)}&page=${normalizedPage}`);
  };

  const fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    try {
      const animeUrl = `${config.baseUrl}/${id}`;
      const { data } = await axios.get(animeUrl);
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

      const dataId = $('.container').attr('data-id');
      // Fetch episodes
      const { data: epData } = await axios.get(`${config.baseUrl}/ajax/episode/list/${dataId}`, {
        headers: headers,
      });
      const $$ = load(epData.html);
      console.log($$.html());
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
      if (episodeId.includes('$episode$')) episodeId = episodeId.split('$episode$')[1]!;
      const response = await fetch(`${config.baseUrl}/ajax/v2/episode/servers?episodeId=${episodeId}`);
      const data = await response.json();
      console.log(data);
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

  const scrapeCard = async ($: CheerioAPI): Promise<IAnimeResult[]> => {
    try {
      const results: IAnimeResult[] = [];

      $('.item').each((i, ele) => {
        const card = $(ele);
        const atag = card.find('.item-top a');
        const id = atag.attr('href')?.split('/')[1]!.split('?')[0];
        const type = card.find('.item-status')?.first()?.text();
        results.push({
          id: id!,
          title: atag.text(),
          url: `${config.baseUrl}${atag.attr('href')}`,
          image: card.find('img')?.attr('data-src'),
          duration: card.find('.fdi-duration')?.text(),
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

  const scrapeCardPage = async (url: string): Promise<ISearch<IAnimeResult>> => {
    try {
      const res: ISearch<IAnimeResult> = {
        currentPage: 0,
        hasNextPage: false,
        totalPages: 0,
        results: [],
      };
      const { data } = await axios.get(url);
      const $ = load(data);

      const pagination = $('ul.pagination');
      res.currentPage = parseInt(pagination.find('.page-item.active')?.text());
      const nextPage = pagination.find('a[title=next]')?.attr('href');
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
    fetchAnimeInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
  };
}

// Type definition for the provider instance returned by createAnimeSuge
export type AnimeSugeProviderInstance = ReturnType<typeof createAnimeSuge>;

// Default export for backward compatibility
export default createAnimeSuge;
