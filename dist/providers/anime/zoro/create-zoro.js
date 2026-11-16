"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createZoro = createZoro;
const media_status_1 = require("../../common/media-status");
const servers_1 = require("../../common/servers");
const helpers_1 = require("../helpers");
const hianime_1 = require("../hianime");
// The zone the schedule's airing times come back in: UTC+5:30 (IST), as minutes behind UTC (the
// form Date.getTimezoneOffset uses). It is fixed, not the device's zone.
const IST_TZ_OFFSET = -330;
const FILTERS = {
  type: {
    movie: 1,
    tv: 2,
    ova: 3,
    ona: 4,
    special: 5,
    music: 6
  },
  status: {
    finished_airing: 1,
    currently_airing: 2,
    not_yet_aired: 3
  },
  rated: {
    g: 1,
    pg: 2,
    pg_13: 3,
    r: 4,
    r_plus: 5,
    rx: 6
  },
  season: {
    spring: 1,
    summer: 2,
    fall: 3,
    winter: 4
  },
  language: {
    sub: 1,
    dub: 2,
    sub_dub: 3
  },
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
    isekai: 41
  }
};
const filterId = (filter, value) => value ? filter[value] : undefined;
const isoDate = date => `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
function createZoro(ctx, customBaseURL) {
  const {
    axios,
    load,
    extractors,
    enums,
    createCustomBaseUrl,
    PolyURL
  } = ctx;
  const {
    MegaCloud
  } = extractors;
  const {
    SubOrDub: SubOrDubEnum,
    WatchListType: WatchListTypeEnum
  } = enums;
  const baseUrl = createCustomBaseUrl('https://hianime.to', customBaseURL);
  const config = {
    name: 'Zoro',
    languages: 'en',
    classPath: 'ANIME.Zoro',
    logo: 'https://hianime.to/images/icons-512.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  const scrapeCard = $ => $('.flw-item').toArray().map(ele => {
    const card = $(ele);
    const atag = card.find('.film-name a');
    const watchList = card.find('.dropdown-menu .added').text().trim();
    const type = card.find('.fdi-item')?.first()?.text().replace(' (? eps)', '').replace(/\s\(\d+ eps\)/g, '');
    return {
      id: atag.attr('href')?.split('/')[1].split('?')[0],
      title: atag.text(),
      url: `${baseUrl}${atag.attr('href')}`,
      image: card.find('img')?.attr('data-src'),
      duration: card.find('.fdi-duration')?.text(),
      watchList: watchList || WatchListTypeEnum.NONE,
      japaneseTitle: atag.attr('data-jname'),
      type: type,
      nsfw: card.find('.tick-rate')?.text() === '18+',
      sub: parseInt(card.find('.tick-item.tick-sub')?.text()) || 0,
      dub: parseInt(card.find('.tick-item.tick-dub')?.text()) || 0,
      episodes: parseInt(card.find('.tick-item.tick-eps')?.text()) || 0
    };
  });
  /** Page `page` of the listing at `path` (`/top-airing`, `/search?keyword=…`). */
  const scrapeCardPage = async (path, page) => {
    const {
      data
    } = await axios.get((0, hianime_1.pageUrl)(`${baseUrl}${path}`, page));
    const $ = load(data);
    return (0, hianime_1.cardPage)($, scrapeCard($), page);
  };
  /** The cards in the HTML an ajax endpoint answers with (`{ html }`). */
  const scrapeAjaxCards = async path => {
    const {
      data
    } = await axios.get(`${baseUrl}${path}`);
    return scrapeCard(load(data.html));
  };
  const search = async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return scrapeCardPage(`/search?keyword=${encodeURIComponent(query)}`, page);
  };
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
  const fetchAdvancedSearch = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    let type = arguments.length > 1 ? arguments[1] : undefined;
    let status = arguments.length > 2 ? arguments[2] : undefined;
    let rated = arguments.length > 3 ? arguments[3] : undefined;
    let score = arguments.length > 4 ? arguments[4] : undefined;
    let season = arguments.length > 5 ? arguments[5] : undefined;
    let language = arguments.length > 6 ? arguments[6] : undefined;
    let startDate = arguments.length > 7 ? arguments[7] : undefined;
    let endDate = arguments.length > 8 ? arguments[8] : undefined;
    let sort = arguments.length > 9 ? arguments[9] : undefined;
    let genres = arguments.length > 10 ? arguments[10] : undefined;
    const genreIds = (genres ?? []).map(genre => filterId(FILTERS.genre, genre)).filter(Boolean);
    const filters = [['type', filterId(FILTERS.type, type)], ['status', filterId(FILTERS.status, status)], ['rated', filterId(FILTERS.rated, rated)], ['score', score], ['season', filterId(FILTERS.season, season)], ['language', filterId(FILTERS.language, language)], ['sort', sort], ['start_date', startDate && isoDate(startDate)], ['end_date', endDate && isoDate(endDate)], ['genres', genreIds.join(',')]];
    const params = new URLSearchParams();
    for (const [key, value] of filters) if (value) params.append(key, String(value));
    const query = params.toString();
    return scrapeCardPage(query ? `/filter?${query}` : '/filter', page);
  };
  const fetchTopAiring = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/top-airing', page);
  };
  const fetchMostPopular = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/most-popular', page);
  };
  const fetchMostFavorite = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/most-favorite', page);
  };
  const fetchLatestCompleted = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/completed', page);
  };
  const fetchRecentlyUpdated = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/recently-updated', page);
  };
  const fetchRecentlyAdded = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/recently-added', page);
  };
  const fetchTopUpcoming = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/top-upcoming', page);
  };
  /** @param studio the studio's id, e.g. "toei-animation" */
  const fetchStudio = async function (studio) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return scrapeCardPage(`/producer/${studio}`, page);
  };
  const fetchSubbedAnime = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/subbed-anime', page);
  };
  const fetchDubbedAnime = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/dubbed-anime', page);
  };
  const fetchMovie = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/movie', page);
  };
  const fetchTV = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/tv', page);
  };
  const fetchOVA = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/ova', page);
  };
  const fetchONA = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/ona', page);
  };
  const fetchSpecial = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/special', page);
  };
  const fetchGenres = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/genre', page);
  };
  const genreSearch = async function (genre) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return scrapeCardPage(`/genre/${genre}`, page);
  };
  /**
   * The anime airing on a day.
   * @param date `YYYY-MM-DD`; airing times are in IST (UTC+5:30)
   */
  const fetchSchedule = async date => scrapeAjaxCards(`/ajax/schedule/list?tzOffset=${IST_TZ_OFFSET}&date=${date}`);
  const fetchSpotlight = async () => {
    const {
      data
    } = await axios.get(baseUrl);
    const $ = load(data);
    const results = [];
    $('.deslide-item').each((_, element) => {
      const id = $(element).find('a').attr('href')?.split('/')[1] || '';
      const poster = $(element).find('.desi-buttons-wrap .btn-secondary').attr('href')?.match(/url=([^&]+)/)?.[1] || '';
      if (id) {
        results.push({
          id,
          title: $(element).find('.desi-head-title').text().trim(),
          url: `${baseUrl}/${id}`,
          image: decodeURIComponent(poster),
          description: $(element).find('.desi-description').text().trim()
        });
      }
    });
    return results;
  };
  const fetchSearchSuggestions = async query => scrapeAjaxCards(`/ajax/search/suggest?keyword=${encodeURIComponent(query)}`);
  /** What the signed-in user is watching; the request needs the site's session cookie. */
  const fetchContinueWatching = async () => scrapeAjaxCards('/ajax/home/widget/continue-watching');
  /** The signed-in user's watch list of that type; the request needs the site's session cookie. */
  const fetchWatchList = async watchListType => scrapeAjaxCards(`/ajax/user/watchlist/${watchListType}`);
  const fetchAnimeInfo = async id => {
    const animeUrl = `${baseUrl}/${id}`;
    const {
      data
    } = await axios.get(animeUrl);
    const $ = load(data);
    const info = {
      id: id,
      title: $('.anisc-detail h2.film-name').text().trim(),
      url: animeUrl,
      genres: [],
      totalEpisodes: 0
    };
    info.image = $('.film-poster img').attr('src');
    info.description = $('.film-description .text').text().trim();
    $('.item-list a[href*="/genre/"]').each((_, el) => {
      info.genres?.push($(el).text().trim());
    });
    $('.anisc-info .item').each((_, item) => {
      const label = $(item).find('.item-head').text().trim().toLowerCase();
      const value = $(item).find('.name').text().trim() || $(item).text().replace($(item).find('.item-head').text(), '').trim();
      if (label.includes('studio')) info.studios = [value];
      if (label.includes('duration')) info.duration = value;
      if (label.includes('status')) info.status = (0, media_status_1.toMediaStatus)(value, ctx.enums.MediaStatus);
      if (label.includes('type')) info.type = value;
      if (label.includes('score')) info.rating = parseFloat(value);
      if (label.includes('premiered')) info.releaseDate = value;
      if (label.includes('japanese')) info.japaneseTitle = value;
    });
    const subTick = $('div.film-stats div.tick div.tick-item.tick-sub');
    const dubTick = $('div.film-stats div.tick div.tick-item.tick-dub');
    info.hasSub = subTick.length > 0;
    info.hasDub = dubTick.length > 0;
    if (info.hasSub) info.subOrDub = info.hasDub ? SubOrDubEnum.BOTH : SubOrDubEnum.SUB;else if (info.hasDub) info.subOrDub = SubOrDubEnum.DUB;
    const {
      data: episodesData
    } = await axios.get(`${baseUrl}/ajax/v2/episode/list/${id.split('-').pop()}`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${baseUrl}/watch/${id}`
      }
    });
    const $$ = load(episodesData.html);
    const episodeElements = $$('div.detail-infor-content > div > a');
    const subCount = parseInt(subTick.text().trim()) || 0;
    const dubCount = parseInt(dubTick.text().trim()) || 0;
    info.totalEpisodes = episodeElements.length;
    info.episodes = episodeElements.toArray().map(el => {
      const $el = $$(el);
      const href = $el.attr('href') || '';
      const number = parseInt($el.attr('data-number') || '0');
      // href: /watch/<anime id>?ep=<episode id>
      const [animeId = '', episode] = (href.split('/')[2] ?? '').split('?ep=');
      return {
        id: episode ? (0, hianime_1.toEpisodeId)(animeId, episode) : animeId,
        number: number,
        title: $el.attr('title'),
        isFiller: $el.hasClass('ssl-item-filler'),
        isSubbed: number <= subCount,
        isDubbed: number <= dubCount,
        url: baseUrl + href
      };
    });
    return info;
  };
  /** MegaCloud's sources for an embed URL. */
  const extractFrom = async embedUrl => {
    const serverUrl = new PolyURL(embedUrl);
    return {
      headers: {
        Referer: serverUrl.href
      },
      ...(await MegaCloud(ctx).extract(serverUrl, baseUrl))
    };
  };
  /**
   * @param episodeId an episode id from fetchAnimeInfo, or a server's embed URL
   * @param server a server name from fetchEpisodeServers, or the start of one; the first server when omitted
   * @param subOrDub default `SubOrDub.SUB`
   */
  const fetchEpisodeSources = async function (episodeId, server) {
    let subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    if (episodeId.startsWith('http')) return extractFrom(episodeId);
    if (!(0, hianime_1.siteEpisodeId)(episodeId)) throw new Error('Invalid episode id');
    const servers = await fetchEpisodeServers(episodeId, subOrDub);
    return extractFrom((0, servers_1.pickServer)(servers, server).url);
  };
  /** @param episodeId an episode id from fetchAnimeInfo, or the site's own episode id */
  const fetchEpisodeServers = async function (episodeId) {
    let subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    const {
      data
    } = await axios.get(`${baseUrl}/ajax/v2/episode/servers?episodeId=${(0, hianime_1.siteEpisodeId)(episodeId) ?? episodeId}`);
    const $ = load(data.html);
    const items = $(`.ps_-block.ps_-block-sub.servers-${subOrDub} > .ps__-list .server-item`).toArray();
    return Promise.all(items.map(async element => {
      const {
        data: source
      } = await axios.get(`${baseUrl}/ajax/v2/episode/sources?id=${$(element).attr('data-id') || ''}`);
      return {
        name: (0, helpers_1.serverName)('megacloud', $(element).text()),
        url: source.link
      };
    }));
  };
  return {
    ...config,
    capabilities: {
      aniZipEpisodes: true,
      subDub: 'combined'
    },
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
    fetchEpisodeServers
  };
}
//# sourceMappingURL=create-zoro.js.map