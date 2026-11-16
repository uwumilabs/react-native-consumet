import type { CheerioAPI } from 'cheerio';
import {
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type IAnimeEpisode,
  type ISource,
  type IEpisodeServer,
  type MediaFormat,
  type MediaStatus,
  type SubOrDub,
  type ProviderContext,
  type ProviderConfig,
  type ProviderCapabilities,
} from '../../../models';
import { toMediaStatus } from '../../common/media-status';
import { pickServer, serverName } from '../../common/servers';
import { IST_TZ_OFFSET, cardPage, linkedGenres, pageUrl, siteEpisodeId, toEpisodeId } from '../hianime';

export function createAniKoto(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, extractors, enums, createCustomBaseUrl, PolyURL, PolyURLSearchParams, USER_AGENT } = ctx;
  const { MegaPlay } = extractors;
  const { SubOrDub: SubOrDubEnum } = enums;

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

  const defaultHeaders = { 'User-Agent': USER_AGENT };

  const ajaxHeaders = (referer?: string) => ({
    ...defaultHeaders,
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': referer || config.baseUrl,
  });

  const scrapeCard = ($: CheerioAPI): IAnimeResult[] => {
    const results: IAnimeResult[] = [];
    $('.item').each((_, el) => {
      const item = $(el);
      const nameEl = item.find('.name.d-title, .name').first();
      const title = nameEl.text().trim();
      const href = item.find('a.name, .poster a').first().attr('href') || '';
      const match = href.match(/\/watch\/([^/?#]+)/);
      const id = match ? match[1]! : href.replace(/^.*\/watch\//, '').replace(/\/.*$/, '');
      const ratingStr = item.find('.m-item.rated span').first().text().trim();

      if (id && title) {
        results.push({
          id,
          title,
          japaneseTitle: nameEl.attr('data-jp') || undefined,
          image: item.find('.poster img, img').attr('src') || '',
          url: href.startsWith('http') ? href : `${config.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
          type: (item.find('.meta .right').first().text().trim() || 'TV') as MediaFormat,
          sub: parseInt(item.find('.ep-status.sub').first().text().trim(), 10) || 0,
          dub: parseInt(item.find('.ep-status.dub').first().text().trim(), 10) || 0,
          rating: ratingStr ? parseFloat(ratingStr) : undefined,
        });
      }
    });
    return results;
  };

  /** Page `page` of the listing at `path` (`/most-viewed`, `/search?keyword=…`). */
  const scrapeCardPage = async (path: string, page: number): Promise<ISearch<IAnimeResult>> => {
    const { data } = await axios.get(pageUrl(`${config.baseUrl}${path}`, page), { headers: defaultHeaders });
    const $ = load(data);
    return cardPage($, scrapeCard($), page);
  };

  const search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> =>
    scrapeCardPage(`/search?keyword=${encodeURIComponent(query)}`, page);

  /**
   * Search with filters; each is optional. The site has no date filters: `_startDate` and
   * `_endDate` are only there so the parameters line up with Zoro's.
   */
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
    const params = new PolyURLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (rated) params.set('rated', rated);
    if (score) params.set('score', String(score));
    if (season) params.set('season', season);
    if (language) params.set('language', language);
    if (sort) params.set('sort', sort);
    for (const genre of genres ?? []) params.append('genres[]', genre);

    const query = params.toString();
    return scrapeCardPage(query ? `/filter?${query}` : '/filter', page);
  };

  const fetchTopAiring = async (page: number = 1) => scrapeCardPage('/status/currently-airing', page);
  const fetchMostPopular = async (page: number = 1) => scrapeCardPage('/most-viewed', page);
  const fetchMostFavorite = async (page: number = 1) => scrapeCardPage('/filter?sort=most_favorite', page);
  const fetchLatestCompleted = async (page: number = 1) => scrapeCardPage('/status/finished-airing', page);
  const fetchRecentlyUpdated = async (page: number = 1) => scrapeCardPage('/latest-updated', page);
  const fetchRecentlyAdded = async (page: number = 1) => scrapeCardPage('/new-release', page);
  const fetchTopUpcoming = async (page: number = 1) => scrapeCardPage('/status/not-yet-aired', page);
  /** @param studioId the studio's slug */
  const fetchStudio = async (studioId: string, page: number = 1) => scrapeCardPage(`/studio/${studioId}`, page);
  const fetchSubbedAnime = async (page: number = 1) => scrapeCardPage('/filter?language=1', page);
  const fetchDubbedAnime = async (page: number = 1) => scrapeCardPage('/filter?language=2', page);
  const fetchMovie = async (page: number = 1) => scrapeCardPage('/type/movie', page);
  const fetchTV = async (page: number = 1) => scrapeCardPage('/type/tv', page);
  const fetchOVA = async (page: number = 1) => scrapeCardPage('/type/ova', page);
  const fetchONA = async (page: number = 1) => scrapeCardPage('/type/ona', page);
  const fetchSpecial = async (page: number = 1) => scrapeCardPage('/type/special', page);

  /** The genres the home page links to, by name; genreSearch takes them. */
  const fetchGenres = async (): Promise<string[]> =>
    linkedGenres(load((await axios.get(`${config.baseUrl}/home`, { headers: defaultHeaders })).data));

  /** @param genre a genre name or slug ("Slice of Life", "slice-of-life") */
  const genreSearch = async (genre: string, page: number = 1): Promise<ISearch<IAnimeResult>> =>
    scrapeCardPage(`/genre/${genre.toLowerCase().replace(/\s+/g, '-')}`, page);

  /**
   * The anime airing on a day.
   * @param date `YYYY-MM-DD`; airing times are in IST (UTC+5:30)
   */
  const fetchSchedule = async (date: string): Promise<IAnimeResult[]> => {
    const res = await axios.get(`${config.baseUrl}/ajax/schedule/date?date=${date}&tzOffset=${IST_TZ_OFFSET}`, {
      headers: ajaxHeaders(),
    });
    const $ = load(res.data?.result || res.data);
    const results: IAnimeResult[] = [];

    $('a.item').each((_, el) => {
      const item = $(el);
      const href = item.attr('href') || '';
      const id = href.match(/\/watch\/([^/?#]+)/)?.[1] ?? href;
      const title = item.find('.title.d-title, .title').text().trim();
      if (id && title) {
        results.push({
          id,
          title,
          url: href,
          time: item.find('.time').text().trim(),
          episodeText: item.find('.ep span').text().trim(),
        });
      }
    });

    return results;
  };

  const fetchSpotlight = async (): Promise<IAnimeResult[]> => {
    const { data } = await axios.get(`${config.baseUrl}/home`, { headers: defaultHeaders });
    const $ = load(data);
    const results: IAnimeResult[] = [];

    $('.swiper-slide.item').each((_, el) => {
      const slide = $(el);
      const title = slide.find('.title.d-title, .title').text().trim();
      const href = slide.find('a[href*="/watch/"]').first().attr('href') || '';
      const id = href.match(/\/watch\/([^/?#]+)/)?.[1] ?? '';
      if (id && title) {
        results.push({
          id,
          title,
          japaneseTitle: slide.find('.title.d-title').attr('data-jp') || undefined,
          description: slide.find('.synopsis').text().trim() || undefined,
          image: slide.find('img').attr('src') || '',
          url: href.startsWith('http') ? href : `${config.baseUrl}${href}`,
        });
      }
    });

    return results;
  };

  const fetchSearchSuggestions = async (query: string): Promise<IAnimeResult[]> => {
    const res = await axios.get(`${config.baseUrl}/ajax/anime/search?keyword=${encodeURIComponent(query)}`, {
      headers: ajaxHeaders(),
    });
    const $ = load(res.data?.result?.html || res.data?.result || res.data);
    const suggestions: IAnimeResult[] = [];

    $('a.item').each((_, el) => {
      const item = $(el);
      const href = item.attr('href') || '';
      const id = href.match(/\/watch\/([^/?#]+)/)?.[1] ?? '';
      const title = item.find('.name.d-title, .name').text().trim();
      if (id && title) {
        suggestions.push({
          id,
          title,
          japaneseTitle: item.find('.name.d-title').attr('data-jp') || undefined,
          image: item.find('.poster img, img').attr('src') || '',
          url: href,
        });
      }
    });

    return suggestions;
  };

  /** @param id the anime's slug, as in its /watch/ URL */
  const fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
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

    // The site's numeric anime id (e.g. 7174), which the episode list is fetched by.
    const dataId =
      $('#watch-main').attr('data-id') ||
      $('.layout-page-watchtv').attr('data-id') ||
      $('#w-rating').attr('data-id') ||
      $('[data-id]').first().attr('data-id');

    let type: MediaFormat = 'TV' as MediaFormat;
    let premiered: string | undefined;
    let aired: string | undefined;
    let status: MediaStatus | undefined;
    const genres: string[] = [];
    const studios: string[] = [];
    const producers: string[] = [];
    let duration: string | undefined;
    let rating: number | undefined;

    const linkTexts = (el: any, list: string[], skip?: string) =>
      $(el)
        .find('a')
        .each((_, a) => {
          const text = $(a).text().trim();
          if (text && text !== skip && !list.includes(text)) list.push(text);
        });

    $('#w-info .bmeta .meta div').each((_, el) => {
      const text = $(el).text();
      const value = $(el).find('span').text().trim();
      if (text.includes('Type:')) type = value as MediaFormat;
      else if (text.includes('Premiered:')) premiered = value;
      else if (text.includes('Aired:')) aired = value;
      else if (text.includes('Status:')) status = toMediaStatus(value);
      else if (text.includes('Genres:')) linkTexts(el, genres);
      else if (text.includes('Studios:')) linkTexts(el, studios);
      else if (text.includes('Producers:')) linkTexts(el, producers, 'unknown');
      else if (text.includes('Duration:')) duration = value;
      else if (text.includes('MAL:')) rating = value ? parseFloat(value) : undefined;
    });

    const episodes: IAnimeEpisode[] = [];
    if (dataId) {
      const epRes = await axios.get(`${config.baseUrl}/ajax/episode/list/${dataId}`, {
        headers: ajaxHeaders(watchUrl),
      });
      const $ep = load(epRes.data?.result || epRes.data);

      $ep('li').each((_, li) => {
        const listItem = $ep(li);
        const anchor = listItem.find('a').first();
        const dataIds = anchor.attr('data-ids') || anchor.attr('data-id') || '';
        const numAttr = anchor.attr('data-num') || anchor.attr('data-slug') || anchor.find('b').text().trim();
        const num = parseInt(numAttr, 10) || 1;
        if (dataIds) {
          episodes.push({
            id: toEpisodeId(animeSlug, dataIds),
            number: num,
            title: listItem.attr('title') || anchor.find('.d-title').text().trim() || `Episode ${num}`,
            url: `${config.baseUrl}/watch/${animeSlug}/ep-${num}`,
            isFiller: anchor.hasClass('filler'),
            isSubbed: anchor.attr('data-sub') === '1',
            isDubbed: anchor.attr('data-dub') === '1',
          });
        }
      });
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
  };

  /** @param episodeId an episode id from fetchAnimeInfo, or the site's own episode id */
  const fetchEpisodeServers = async (
    episodeId: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<IEpisodeServer[]> => {
    const dataIds = siteEpisodeId(episodeId) ?? episodeId;
    const targetSubDub = subOrDub === SubOrDubEnum.DUB ? 'dub' : 'sub';

    const res = await axios.get(`${config.baseUrl}/ajax/server/list?servers=${encodeURIComponent(dataIds)}`, {
      headers: ajaxHeaders(),
    });
    const $ = load(res.data?.result || res.data);

    // The list is grouped by language; a page without groups lists every server in one.
    const groups = $('.servers .type[data-type]');
    const serverList = groups.length
      ? groups.filter(`[data-type="${targetSubDub}"]`).find('li[data-link-id]')
      : $('.servers li[data-link-id]');

    const servers: IEpisodeServer[] = [];
    for (const el of serverList.toArray()) {
      const linkId = $(el).attr('data-link-id');
      if (!linkId) continue;
      try {
        const { data: linkData } = await axios.get(`${config.baseUrl}/ajax/server?get=${encodeURIComponent(linkId)}`, {
          headers: ajaxHeaders(),
        });
        const embedUrl = linkData?.result?.url;
        if (embedUrl) servers.push({ name: serverName('megaplay', $(el).text()), url: embedUrl });
      } catch {
        // A server whose link doesn't resolve is left out; the others still play.
      }
    }

    return servers;
  };

  const extractFrom = (embedUrl: string): Promise<ISource> =>
    MegaPlay(ctx).extract(new PolyURL(embedUrl), config.baseUrl);

  /**
   * @param episodeId an episode id from fetchAnimeInfo, or a server's embed URL
   * @param server a server name from fetchEpisodeServers, or the start of one; the first server when omitted
   * @param subOrDub default `SubOrDub.SUB`
   */
  const fetchEpisodeSources = async (
    episodeId: string,
    server?: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<ISource> => {
    if (episodeId.startsWith('http')) return extractFrom(episodeId);
    return extractFrom(pickServer(await fetchEpisodeServers(episodeId, subOrDub), server).url);
  };

  return {
    ...config,
    capabilities: { aniZipEpisodes: true } as ProviderCapabilities,
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
