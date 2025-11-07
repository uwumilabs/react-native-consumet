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
  type Intro,
} from '../../../models';

function createAnimeKai(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, enums, createCustomBaseUrl, USER_AGENT, PolyURL, extractors } = ctx;
  const { StreamingServers: StreamingServersEnum, MediaStatus: MediaStatusEnum, SubOrDub: SubOrDubEnum } = enums;
  const { MegaUp } = extractors;

  const baseUrl = createCustomBaseUrl('https://anikai.to', customBaseURL);
  const apiBase = 'https://enc-dec.app/api';

  const config: ProviderConfig = {
    name: 'AnimeKai',
    languages: 'en',
    classPath: 'ANIME.AnimeKai',
    logo: 'https://anikai.to/assets/uploads/37585a3ffa8ec292ee9e2255f3f63b48ceca17e5241280b3dc21.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true,
  };

  const buildHeaders = (): Record<string, string> => ({
    'User-Agent':
      USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Connection': 'keep-alive',
    'Accept': 'text/html, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.5',
    'Sec-GPC': '1',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Priority': 'u=0',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache',
    'Referer': `${config.baseUrl}/`,
    'Cookie': '__p_mov=1; usertype=guest; session=vLrU4aKItp0QltI2asH83yugyWDsSSQtyl9sxWKO',
  });

  const normalizePage = (page: number = 1): number => (page <= 0 ? 1 : page);

  const scrapeCard = async ($: CheerioAPI): Promise<IAnimeResult[]> => {
    const results: IAnimeResult[] = [];

    $('.aitem').each((_, element) => {
      const card = $(element);
      const anchor = card.find('div.inner > a');
      const id = anchor.attr('href')?.replace('/watch/', '');
      if (!id) return;

      const infoElements = card.find('.info').children();
      const type = infoElements.last()?.text().trim();

      results.push({
        id,
        title: anchor.text().trim(),
        url: `${config.baseUrl}${anchor.attr('href')}`,
        image: card.find('img')?.attr('data-src') ?? card.find('img')?.attr('src') ?? undefined,
        japaneseTitle: card.find('a.title')?.attr('data-jp')?.trim(),
        type: (type as MediaFormat) ?? undefined,
        sub: parseInt(card.find('.info span.sub')?.text() || '0', 10),
        dub: parseInt(card.find('.info span.dub')?.text() || '0', 10),
        episodes: parseInt(infoElements.eq(-2).text().trim() || card.find('.info span.sub')?.text() || '0', 10) || 0,
      });
    });

    return results;
  };

  const scrapeCardPage = async (url: string): Promise<ISearch<IAnimeResult>> => {
    const res: ISearch<IAnimeResult> = {
      currentPage: 0,
      hasNextPage: false,
      totalPages: 0,
      results: [],
    };

    const { data } = await axios.get(url, { headers: buildHeaders() });
    const $ = load(data);

    const pagination = $('ul.pagination');
    res.currentPage = parseInt(pagination.find('.page-item.active span.page-link').text().trim(), 10) || 0;
    const nextHref = pagination.find('.page-item.active').next().find('a.page-link').attr('href');
    res.hasNextPage = Boolean(nextHref && nextHref.includes('page='));

    const totalHref = pagination.find('.page-item:last-child a.page-link').attr('href');
    res.totalPages =
      totalHref && totalHref.includes('page=')
        ? parseInt(totalHref.split('page=')[1] ?? '0', 10) || 0
        : res.currentPage;

    res.results = await scrapeCard($);
    if (res.results.length === 0) {
      res.currentPage = 0;
      res.hasNextPage = false;
      res.totalPages = 0;
    }

    return res;
  };

  const search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    const normalizedPage = normalizePage(page);
    const sanitizedQuery = query.replace(/[^\w]+/g, '+');
    return scrapeCardPage(`${config.baseUrl}/browser?keyword=${sanitizedQuery}&page=${normalizedPage}`);
  };

  const fetchLatestCompleted = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return scrapeCardPage(`${config.baseUrl}/completed?page=${normalizePage(page)}`);
  };

  const fetchRecentlyAdded = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return scrapeCardPage(`${config.baseUrl}/recent?page=${normalizePage(page)}`);
  };

  const fetchRecentlyUpdated = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return scrapeCardPage(`${config.baseUrl}/updates?page=${normalizePage(page)}`);
  };

  const fetchNewReleases = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return scrapeCardPage(`${config.baseUrl}/new-releases?page=${normalizePage(page)}`);
  };

  const fetchMovie = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return scrapeCardPage(`${config.baseUrl}/movie?page=${normalizePage(page)}`);
  };

  const fetchTV = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return scrapeCardPage(`${config.baseUrl}/tv?page=${normalizePage(page)}`);
  };

  const fetchOVA = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return scrapeCardPage(`${config.baseUrl}/ova?page=${normalizePage(page)}`);
  };

  const fetchONA = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return scrapeCardPage(`${config.baseUrl}/ona?page=${normalizePage(page)}`);
  };

  const fetchSpecial = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    return scrapeCardPage(`${config.baseUrl}/special?page=${normalizePage(page)}`);
  };

  const fetchGenres = async (): Promise<string[]> => {
    const genres: string[] = [];
    const { data } = await axios.get(`${config.baseUrl}/home`, { headers: buildHeaders() });
    const $ = load(data);

    $('#menu')
      .find('ul.c4 li a')
      .each((_, element) => {
        const genreText = $(element).text().toLowerCase();
        if (genreText) genres.push(genreText);
      });

    return genres;
  };

  const genreSearch = async (genre: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    if (!genre) {
      throw new Error('genre is empty');
    }

    return scrapeCardPage(`${config.baseUrl}/genres/${genre}?page=${normalizePage(page)}`);
  };

  const fetchSchedule = async (
    date: string = new Date().toISOString().split('T')[0]!
  ): Promise<ISearch<IAnimeResult>> => {
    const res: ISearch<IAnimeResult> = { results: [] };
    const scheduleUnix = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
    const { data } = await axios.get(`${config.baseUrl}/ajax/schedule/items?tz=5.5&time=${scheduleUnix}`, {
      headers: buildHeaders(),
    });
    const $ = load(data.result);

    $('ul.collapsed li').each((_, element) => {
      const card = $(element);
      const titleElement = card.find('span.title');
      const episodeText = card.find('span').last().text().trim();

      const id = card.find('a').attr('href')?.split('/')[2] ?? '';
      if (!id) return;

      res.results.push({
        id,
        title: titleElement.text().trim(),
        japaneseTitle: titleElement.attr('data-jp') || undefined,
        airingTime: card.find('span.time').text().trim(),
        airingEpisode: episodeText.replace('EP ', ''),
      });
    });

    return res;
  };

  const fetchSpotlight = async (): Promise<ISearch<IAnimeResult>> => {
    const res: ISearch<IAnimeResult> = { results: [] };
    const { data } = await axios.get(`${config.baseUrl}/home`, { headers: buildHeaders() });
    const $ = load(data);

    $('div.swiper-wrapper > div.swiper-slide').each((_, element) => {
      const card = $(element);
      const titleElement = card.find('div.detail > p.title');
      const id = card.find('div.swiper-ctrl > a.btn').attr('href')?.replace('/watch/', '') || '';
      if (!id) return;

      const infoElements = card.find('div.detail > div.info').children();

      res.results.push({
        id,
        title: titleElement.text(),
        japaneseTitle: titleElement.attr('data-jp') || undefined,
        banner: card.attr('style')?.match(/background-image:\s*url\(["']?(.+?)["']?\)/)?.[1] || null,
        url: `${config.baseUrl}/watch/${id}`,
        type: infoElements.eq(-2).text().trim() as MediaFormat,
        genres: infoElements
          .last()
          .text()
          .trim()
          .split(',')
          .map((genre) => genre.trim()),
        releaseDate: card.find('div.detail > div.mics > div:contains("Release") span').text().trim(),
        quality: card.find('div.detail > div.mics > div:contains("Quality") span').text().trim(),
        sub: parseInt(card.find('div.detail > div.info > span.sub').text().trim() || '0', 10),
        dub: parseInt(card.find('div.detail > div.info > span.dub').text().trim() || '0', 10),
        description: card.find('div.detail > p.desc').text().trim(),
      });
    });

    return res;
  };

  const fetchSearchSuggestions = async (query: string): Promise<ISearch<IAnimeResult>> => {
    const { data } = await axios.get(`${config.baseUrl}/ajax/anime/search?keyword=${query.replace(/[^\w]+/g, '+')}`, {
      headers: buildHeaders(),
    });
    const $ = load(data.result.html);
    const res: ISearch<IAnimeResult> = { results: [] };

    $('a.aitem').each((_, element) => {
      const card = $(element);
      const id = card.attr('href')?.split('/')[2];
      if (!id) return;

      const infoElements = card.find('.info').children();
      const titleElement = card.find('.title');

      res.results.push({
        id,
        title: titleElement.text().trim(),
        url: `${config.baseUrl}/watch/${id}`,
        image: card.find('.poster img').attr('src') || undefined,
        japaneseTitle: titleElement.attr('data-jp') || undefined,
        type: infoElements.eq(-3).text().trim() as MediaFormat,
        year: infoElements.eq(-2).text().trim(),
        sub: parseInt(card.find('.info span.sub')?.text() || '0', 10),
        dub: parseInt(card.find('.info span.dub')?.text() || '0', 10),
        episodes: parseInt(infoElements.eq(-4).text().trim() || card.find('.info span.sub')?.text() || '0', 10) || 0,
      });
    });

    return res;
  };

  const fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    const info: IAnimeInfo = { id, title: '' };

    const { data } = await axios.get(`${config.baseUrl}/watch/${id}`, { headers: buildHeaders() });
    const $ = load(data);

    info.title = $('.entity-scroll > .title').text().trim();
    info.japaneseTitle = $('.entity-scroll > .title').attr('data-jp')?.trim();
    info.image = $('div.poster > div > img').attr('src');
    info.description = $('.entity-scroll > .desc').text().trim();
    info.type = $('.entity-scroll > .info').children().last().text().trim().toUpperCase() as MediaFormat;
    info.url = `${config.baseUrl}/watch/${id}`;

    info.recommendations = [];
    $('section.sidebar-section:not(#related-anime) .aitem-col .aitem').each((_, element) => {
      const card = $(element);
      const recommendationId = card.attr('href')?.replace('/watch/', '');
      if (!recommendationId) return;

      info.recommendations?.push({
        id: recommendationId,
        title: card.find('.title').text().trim(),
        url: `${config.baseUrl}${card.attr('href')}`,
        image: card.attr('style')?.match(/background-image:\s*url\('(.+?)'\)/)?.[1] ?? undefined,
        japaneseTitle: card.find('.title').attr('data-jp')?.trim(),
        type: card.find('.info').children().last().text().trim() as MediaFormat,
        sub: parseInt(card.find('.info span.sub')?.text() || '0', 10),
        dub: parseInt(card.find('.info span.dub')?.text() || '0', 10),
        episodes:
          parseInt(
            card.find('.info').children().eq(-2).text().trim() || card.find('.info span.sub')?.text() || '0',
            10
          ) || 0,
      });
    });

    info.relations = [];
    $('section#related-anime .tab-body .aitem-col').each((_, element) => {
      const card = $(element);
      const relationAnchor = card.find('a.aitem');
      const relationId = relationAnchor.attr('href')?.replace('/watch/', '');
      if (!relationId) return;

      info.relations?.push({
        id: relationId,
        title: relationAnchor.find('.title').text().trim(),
        url: `${config.baseUrl}${relationAnchor.attr('href')}`,
        image: relationAnchor.attr('style')?.match(/background-image:\s*url\('(.+?)'\)/)?.[1] ?? undefined,
        japaneseTitle: relationAnchor.find('.title').attr('data-jp')?.trim(),
        type: card.find('.info').children().eq(-2).text().trim() as MediaFormat,
        sub: parseInt(card.find('.info span.sub')?.text() || '0', 10),
        dub: parseInt(card.find('.info span.dub')?.text() || '0', 10),
        relationType: card.find('.info').children().last().text().trim(),
        episodes:
          parseInt(
            card.find('.info').children().eq(-3).text().trim() || card.find('.info span.sub')?.text() || '0',
            10
          ) || 0,
      });
    });

    const hasSub = $('.entity-scroll > .info > span.sub').length > 0;
    const hasDub = $('.entity-scroll > .info > span.dub').length > 0;

    if (hasSub && hasDub) {
      info.subOrDub = SubOrDubEnum.BOTH;
    } else if (hasSub) {
      info.subOrDub = SubOrDubEnum.SUB;
    } else if (hasDub) {
      info.subOrDub = SubOrDubEnum.DUB;
    }

    info.hasSub = hasSub;
    info.hasDub = hasDub;

    info.genres = [];
    $('.entity-scroll > .detail')
      .find("div:contains('Genres')")
      .each(function () {
        const genre = $(this).text().trim();
        if (genre) info.genres?.push(genre);
      });

    const statusText = $('.entity-scroll > .detail').find("div:contains('Status') > span").text().trim();

    switch (statusText) {
      case 'Completed':
        info.status = MediaStatusEnum.COMPLETED;
        break;
      case 'Releasing':
        info.status = MediaStatusEnum.ONGOING;
        break;
      case 'Not yet aired':
        info.status = MediaStatusEnum.NOT_YET_AIRED;
        break;
      default:
        info.status = MediaStatusEnum.UNKNOWN;
        break;
    }

    info.season = $('.entity-scroll > .detail').find("div:contains('Premiered') > span").text().trim();

    const totalEpisodes = $('div.eplist > ul > li').length;
    info.totalEpisodes = totalEpisodes;

    const aniId = $('.rate-box#anime-rating').attr('data-id');
    if (!aniId) {
      throw new Error('Failed to locate anime id');
    }

    const episodeToken = await GenerateToken(aniId);
    const episodesResponse = await axios.get(`${config.baseUrl}/ajax/episodes/list?ani_id=${aniId}&_=${episodeToken}`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.baseUrl}/watch/${id}`,
        ...buildHeaders(),
      },
    });
    const $$ = load(episodesResponse.data.result);

    const subCount = parseInt($('.entity-scroll > .info > span.sub').text().trim() || '0', 10);
    const dubCount = parseInt($('.entity-scroll > .info > span.dub').text().trim() || '0', 10);

    info.episodes = [];
    $$('div.eplist > ul > li > a').each((_, element) => {
      const el = $$(element);
      const href = `${el.attr('href')}ep=${el.attr('num')}` || '';
      const number = parseInt(el.attr('data-number') || '0', 10);
      const token = el.attr('token');
      if (!token) return;

      const epId = `${info.id}$ep=${el.attr('num')}$token=${token}`;

      info.episodes?.push({
        id: epId,
        number,
        title: el.children('span').text().trim(),
        isFiller: el.hasClass('filler'),
        isSubbed: number <= subCount,
        isDubbed: number <= dubCount,
        url: `${config.baseUrl}${href}`,
      });
    });

    return info;
  };

  const fetchEpisodeServers = async (
    episodeId: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<IEpisodeServer[]> => {
    let requestUrl = episodeId;

    if (!episodeId.startsWith(`${config.baseUrl}/ajax`)) {
      const token = episodeId.split('$token=')[1];
      if (!token) {
        throw new Error('Invalid episodeId format: missing token');
      }
      const listToken = await GenerateToken(token);
      requestUrl = `${config.baseUrl}/ajax/links/list?token=${token}&_=${listToken}`;
    }

    const { data } = await axios.get(requestUrl, { headers: buildHeaders() });
    const $ = load(data.result);
    const servers: IEpisodeServer[] = [];
    const subOrDubKey = subOrDub === SubOrDubEnum.SUB ? 'softsub' : 'dub';

    const serverItems = $(`.server-items.lang-group[data-id="${subOrDubKey}"] .server`);
    await Promise.all(
      serverItems.map(async (_, server) => {
        const serverId = $(server).attr('data-lid');
        if (!serverId) return;

        const viewToken = await GenerateToken(serverId);
        const { data: linkData } = await axios.get(`${config.baseUrl}/ajax/links/view?id=${serverId}&_=${viewToken}`, {
          headers: buildHeaders(),
        });
        const decoded = await DecodeIframeData(linkData.result);

        servers.push({
          name: `MegaUp ${$(server).text().trim()}`.toLowerCase(),
          url: decoded.url,
          intro: {
            start: decoded.skip.intro[0],
            end: decoded.skip.intro[1],
          },
          outro: {
            start: decoded.skip.outro[0],
            end: decoded.skip.outro[1],
          },
        });
      })
    );

    return servers;
  };

  const fetchEpisodeSources = async (
    episodeId: string,
    server: StreamingServers = StreamingServersEnum.MegaUp,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<ISource> => {
    if (episodeId.startsWith('http')) {
      const serverUrl = new PolyURL(episodeId);
      switch (server) {
        case StreamingServersEnum.MegaUp:
          return {
            headers: { Referer: serverUrl.href },
            ...(await MegaUp().extract(serverUrl)),
            download: serverUrl.href.replace(/\/e\//, '/download/'),
          };
        default:
          return {
            headers: { Referer: serverUrl.href },
            ...(await MegaUp().extract(serverUrl)),
            download: serverUrl.href.replace(/\/e\//, '/download/'),
          };
      }
    }

    try {
      const servers = await fetchEpisodeServers(episodeId, subOrDub);
      const i = servers.findIndex((s) => s.name.toLowerCase().includes(server)); //for now only megaup is available, hence directly using it

      if (i === -1) {
        throw new Error(`Server ${server} not found`);
      }

      const serverUrl: URL = new URL(servers[i]!.url);
      const sources = await fetchEpisodeSources(serverUrl.href, server, subOrDub);
      sources.intro = servers[i]?.intro as Intro;
      sources.outro = servers[i]?.outro as Intro;
      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  const GenerateToken = async (text: string): Promise<string> => {
    try {
      const { data } = await axios.get(`${apiBase}/enc-kai`, {
        params: { text },
      });
      return data.result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  const DecodeIframeData = async (
    payload: string
  ): Promise<{
    url: string;
    skip: {
      intro: [number, number];
      outro: [number, number];
    };
  }> => {
    try {
      const { data } = await axios.post(`${apiBase}/dec-kai`, { text: payload });
      return data.result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  return {
    ...config,
    search,
    fetchLatestCompleted,
    fetchRecentlyAdded,
    fetchRecentlyUpdated,
    fetchNewReleases,
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
    fetchEpisodeSources,
    fetchEpisodeServers,
  };
}

export type AnimeKaiProviderInstance = ReturnType<typeof createAnimeKai>;

export default createAnimeKai;
