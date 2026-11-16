import type { CheerioAPI } from 'cheerio';
import {
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IEpisodeServer,
  type MediaFormat,
  type SubOrDub,
  type WatchListType,
  type ProviderContext,
  type ProviderConfig,
  type ProviderCapabilities,
} from '../../../models';
import { toMediaStatus } from '../../common/media-status';
import { pickServer, serverName } from '../../common/servers';
import { IST_TZ_OFFSET, cardPage, linkedGenres, pageUrl, siteEpisodeId, toEpisodeId } from '../hianime';

const FILTERS = {
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

const filterId = (filter: Record<string, number>, value?: string): number | undefined =>
  value ? filter[value] : undefined;

const isoDate = (date: { year: number; month: number; day: number }) =>
  `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;

export function createZoro(ctx: ProviderContext, customBaseURL?: string) {
  const { axios, load, extractors, enums, createCustomBaseUrl, PolyURL, PolyURLSearchParams } = ctx;
  const { MegaCloud } = extractors;
  const { SubOrDub: SubOrDubEnum, WatchListType: WatchListTypeEnum } = enums;

  const baseUrl = createCustomBaseUrl('https://hianime.to', customBaseURL);

  const config: ProviderConfig = {
    name: 'Zoro',
    languages: 'en',
    classPath: 'ANIME.Zoro',
    logo: 'https://hianime.to/images/icons-512.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true,
  };

  const scrapeCard = ($: CheerioAPI): IAnimeResult[] =>
    $('.flw-item')
      .toArray()
      .map((ele) => {
        const card = $(ele);
        const atag = card.find('.film-name a');
        const watchList = card.find('.dropdown-menu .added').text().trim() as WatchListType;
        const type = card
          .find('.fdi-item')
          ?.first()
          ?.text()
          .replace(' (? eps)', '')
          .replace(/\s\(\d+ eps\)/g, '');
        return {
          id: atag.attr('href')?.split('/')[1]!.split('?')[0]!,
          title: atag.text(),
          url: `${baseUrl}${atag.attr('href')}`,
          image: card.find('img')?.attr('data-src'),
          duration: card.find('.fdi-duration')?.text(),
          watchList: watchList || WatchListTypeEnum.NONE,
          japaneseTitle: atag.attr('data-jname'),
          type: type as MediaFormat,
          nsfw: card.find('.tick-rate')?.text() === '18+',
          sub: parseInt(card.find('.tick-item.tick-sub')?.text()) || 0,
          dub: parseInt(card.find('.tick-item.tick-dub')?.text()) || 0,
          episodes: parseInt(card.find('.tick-item.tick-eps')?.text()) || 0,
        };
      });

  /** Page `page` of the listing at `path` (`/top-airing`, `/search?keyword=…`). */
  const scrapeCardPage = async (path: string, page: number): Promise<ISearch<IAnimeResult>> => {
    const { data } = await axios.get(pageUrl(`${baseUrl}${path}`, page));
    const $ = load(data);
    return cardPage($, scrapeCard($), page);
  };

  /** The cards in the HTML an ajax endpoint answers with (`{ html }`). */
  const scrapeAjaxCards = async (path: string): Promise<IAnimeResult[]> => {
    const { data } = await axios.get(`${baseUrl}${path}`);
    return scrapeCard(load(data.html));
  };

  const search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> =>
    scrapeCardPage(`/search?keyword=${encodeURIComponent(query)}`, page);

  /**
   * Search with filters; each is optional.
   *
   * @param type one of: movie, tv, ova, ona, special, music
   * @param status one of: finished_airing, currently_airing, not_yet_aired
   * @param rated one of: g, pg, pg_13, r, r_plus, rx
   * @param score a number from 1 to 10
   * @param season one of: spring, summer, fall, winter
   * @param language one of: sub, dub, sub_dub
   * @param sort one of: recently_added, recently_updated, score, name_az, released_date, most_watched
   * @param genres any of: action, adventure, cars, comedy, dementia, demons, mystery, drama, ecchi, fantasy, game,
   * historical, horror, kids, magic, martial_arts, mecha, music, parody, samurai, romance, school, sci_fi, shoujo,
   * shoujo_ai, shounen, shounen_ai, space, sports, super_power, vampire, harem, military, slice_of_life,
   * supernatural, police, psychological, thriller, seinen, isekai, josei
   */
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
    const genreIds = (genres ?? []).map((genre) => filterId(FILTERS.genre, genre)).filter(Boolean);
    const filters: Array<[string, string | number | undefined]> = [
      ['type', filterId(FILTERS.type, type)],
      ['status', filterId(FILTERS.status, status)],
      ['rated', filterId(FILTERS.rated, rated)],
      ['score', score],
      ['season', filterId(FILTERS.season, season)],
      ['language', filterId(FILTERS.language, language)],
      ['sort', sort],
      ['start_date', startDate && isoDate(startDate)],
      ['end_date', endDate && isoDate(endDate)],
      ['genres', genreIds.join(',')],
    ];
    const params = new PolyURLSearchParams();
    for (const [key, value] of filters) if (value) params.append(key, String(value));

    const query = params.toString();
    return scrapeCardPage(query ? `/filter?${query}` : '/filter', page);
  };

  const fetchTopAiring = async (page: number = 1) => scrapeCardPage('/top-airing', page);
  const fetchMostPopular = async (page: number = 1) => scrapeCardPage('/most-popular', page);
  const fetchMostFavorite = async (page: number = 1) => scrapeCardPage('/most-favorite', page);
  const fetchLatestCompleted = async (page: number = 1) => scrapeCardPage('/completed', page);
  const fetchRecentlyUpdated = async (page: number = 1) => scrapeCardPage('/recently-updated', page);
  const fetchRecentlyAdded = async (page: number = 1) => scrapeCardPage('/recently-added', page);
  const fetchTopUpcoming = async (page: number = 1) => scrapeCardPage('/top-upcoming', page);
  /** @param studio the studio's id, e.g. "toei-animation" */
  const fetchStudio = async (studio: string, page: number = 1) => scrapeCardPage(`/producer/${studio}`, page);
  const fetchSubbedAnime = async (page: number = 1) => scrapeCardPage('/subbed-anime', page);
  const fetchDubbedAnime = async (page: number = 1) => scrapeCardPage('/dubbed-anime', page);
  const fetchMovie = async (page: number = 1) => scrapeCardPage('/movie', page);
  const fetchTV = async (page: number = 1) => scrapeCardPage('/tv', page);
  const fetchOVA = async (page: number = 1) => scrapeCardPage('/ova', page);
  const fetchONA = async (page: number = 1) => scrapeCardPage('/ona', page);
  const fetchSpecial = async (page: number = 1) => scrapeCardPage('/special', page);
  /** The genres the home page links to, by name; genreSearch takes their slugs. */
  const fetchGenres = async (): Promise<string[]> => linkedGenres(load((await axios.get(`${baseUrl}/home`)).data));
  const genreSearch = async (genre: string, page: number = 1) => scrapeCardPage(`/genre/${genre}`, page);

  /**
   * The anime airing on a day.
   * @param date `YYYY-MM-DD`; airing times are in IST (UTC+5:30)
   */
  const fetchSchedule = async (date: string): Promise<IAnimeResult[]> =>
    scrapeAjaxCards(`/ajax/schedule/list?tzOffset=${IST_TZ_OFFSET}&date=${date}`);

  const fetchSpotlight = async (): Promise<IAnimeResult[]> => {
    const { data } = await axios.get(baseUrl);
    const $ = load(data);
    const results: IAnimeResult[] = [];

    $('.deslide-item').each((_, element) => {
      const id = $(element).find('a').attr('href')?.split('/')[1] || '';
      const poster =
        $(element)
          .find('.desi-buttons-wrap .btn-secondary')
          .attr('href')
          ?.match(/url=([^&]+)/)?.[1] || '';
      if (id) {
        results.push({
          id,
          title: $(element).find('.desi-head-title').text().trim(),
          url: `${baseUrl}/${id}`,
          image: decodeURIComponent(poster),
          description: $(element).find('.desi-description').text().trim(),
        });
      }
    });

    return results;
  };

  const fetchSearchSuggestions = async (query: string): Promise<IAnimeResult[]> =>
    scrapeAjaxCards(`/ajax/search/suggest?keyword=${encodeURIComponent(query)}`);

  /** What the signed-in user is watching; the request needs the site's session cookie. */
  const fetchContinueWatching = async (): Promise<IAnimeResult[]> =>
    scrapeAjaxCards('/ajax/home/widget/continue-watching');

  /** The signed-in user's watch list of that type; the request needs the site's session cookie. */
  const fetchWatchList = async (watchListType: WatchListType): Promise<IAnimeResult[]> =>
    scrapeAjaxCards(`/ajax/user/watchlist/${watchListType}`);

  const fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    const animeUrl = `${baseUrl}/${id}`;
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

    $('.item-list a[href*="/genre/"]').each((_, el) => {
      info.genres?.push($(el).text().trim());
    });

    $('.anisc-info .item').each((_, item) => {
      const label = $(item).find('.item-head').text().trim().toLowerCase();
      const value =
        $(item).find('.name').text().trim() || $(item).text().replace($(item).find('.item-head').text(), '').trim();

      if (label.includes('studio')) info.studios = [value];
      if (label.includes('duration')) info.duration = value;
      if (label.includes('status')) info.status = toMediaStatus(value);
      if (label.includes('type')) info.type = value as MediaFormat;
      if (label.includes('score')) info.rating = parseFloat(value);
      if (label.includes('premiered')) info.releaseDate = value;
      if (label.includes('japanese')) info.japaneseTitle = value;
    });

    const subTick = $('div.film-stats div.tick div.tick-item.tick-sub');
    const dubTick = $('div.film-stats div.tick div.tick-item.tick-dub');
    info.hasSub = subTick.length > 0;
    info.hasDub = dubTick.length > 0;
    if (info.hasSub) info.subOrDub = info.hasDub ? SubOrDubEnum.BOTH : SubOrDubEnum.SUB;
    else if (info.hasDub) info.subOrDub = SubOrDubEnum.DUB;

    const { data: episodesData } = await axios.get(`${baseUrl}/ajax/v2/episode/list/${id.split('-').pop()}`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${baseUrl}/watch/${id}`,
      },
    });
    const $$ = load(episodesData.html);

    const episodeElements = $$('div.detail-infor-content > div > a');
    const subCount = parseInt(subTick.text().trim()) || 0;
    const dubCount = parseInt(dubTick.text().trim()) || 0;

    info.totalEpisodes = episodeElements.length;
    info.episodes = episodeElements.toArray().map((el) => {
      const $el = $$(el);
      const href = $el.attr('href') || '';
      const number = parseInt($el.attr('data-number') || '0');
      // href: /watch/<anime id>?ep=<episode id>
      const [animeId = '', episode] = (href.split('/')[2] ?? '').split('?ep=');
      return {
        id: episode ? toEpisodeId(animeId, episode) : animeId,
        number: number,
        title: $el.attr('title'),
        isFiller: $el.hasClass('ssl-item-filler'),
        isSubbed: number <= subCount,
        isDubbed: number <= dubCount,
        url: baseUrl + href,
      };
    });

    return info;
  };

  const extractFrom = (embedUrl: string): Promise<ISource> => MegaCloud(ctx).extract(new PolyURL(embedUrl), baseUrl);

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
    if (!siteEpisodeId(episodeId)) throw new Error('Invalid episode id');

    const servers = await fetchEpisodeServers(episodeId, subOrDub);
    return extractFrom(pickServer(servers, server).url);
  };

  /** @param episodeId an episode id from fetchAnimeInfo, or the site's own episode id */
  const fetchEpisodeServers = async (
    episodeId: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<IEpisodeServer[]> => {
    const { data } = await axios.get(
      `${baseUrl}/ajax/v2/episode/servers?episodeId=${siteEpisodeId(episodeId) ?? episodeId}`
    );
    const $ = load(data.html);
    const items = $(`.ps_-block.ps_-block-sub.servers-${subOrDub} > .ps__-list .server-item`).toArray();

    return Promise.all(
      items.map(async (element) => {
        const { data: source } = await axios.get(
          `${baseUrl}/ajax/v2/episode/sources?id=${$(element).attr('data-id') || ''}`
        );
        return { name: serverName('megacloud', $(element).text()), url: source.link };
      })
    );
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
    fetchContinueWatching,
    fetchWatchList,
    fetchAnimeInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
  };
}

export type ZoroProviderInstance = ReturnType<typeof createZoro>;
