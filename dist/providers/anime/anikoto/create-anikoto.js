"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createAniKoto = createAniKoto;
const media_status_1 = require("../../common/media-status");
const servers_1 = require("../../common/servers");
const helpers_1 = require("../helpers");
const hianime_1 = require("../hianime");
// The zone the schedule's airing times come back in: UTC+5:30 (IST), as minutes behind UTC (the
// form Date.getTimezoneOffset uses). It is fixed, not the device's zone.
const IST_TZ_OFFSET = -330;
function createAniKoto(ctx, customBaseURL) {
  const {
    axios,
    load,
    extractors,
    enums,
    createCustomBaseUrl,
    PolyURL,
    USER_AGENT
  } = ctx;
  const {
    MegaPlay
  } = extractors;
  const {
    SubOrDub: SubOrDubEnum
  } = enums;
  const baseUrl = createCustomBaseUrl('https://anikototv.to', customBaseURL);
  const config = {
    name: 'AniKoto',
    languages: 'en',
    classPath: 'ANIME.AniKoto',
    logo: 'https://anikototv.to/favicon-32x32.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  const defaultHeaders = {
    'User-Agent': USER_AGENT
  };
  const ajaxHeaders = referer => ({
    ...defaultHeaders,
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': referer || config.baseUrl
  });
  const scrapeCard = $ => {
    const results = [];
    $('.item').each((_, el) => {
      const item = $(el);
      const nameEl = item.find('.name.d-title, .name').first();
      const title = nameEl.text().trim();
      const href = item.find('a.name, .poster a').first().attr('href') || '';
      const match = href.match(/\/watch\/([^/?#]+)/);
      const id = match ? match[1] : href.replace(/^.*\/watch\//, '').replace(/\/.*$/, '');
      const ratingStr = item.find('.m-item.rated span').first().text().trim();
      if (id && title) {
        results.push({
          id,
          title,
          japaneseTitle: nameEl.attr('data-jp') || undefined,
          image: item.find('.poster img, img').attr('src') || '',
          url: href.startsWith('http') ? href : `${config.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
          type: item.find('.meta .right').first().text().trim() || 'TV',
          sub: parseInt(item.find('.ep-status.sub').first().text().trim(), 10) || 0,
          dub: parseInt(item.find('.ep-status.dub').first().text().trim(), 10) || 0,
          rating: ratingStr ? parseFloat(ratingStr) : undefined
        });
      }
    });
    return results;
  };
  /** Page `page` of the listing at `path` (`/most-viewed`, `/search?keyword=…`). */
  const scrapeCardPage = async (path, page) => {
    const {
      data
    } = await axios.get((0, hianime_1.pageUrl)(`${config.baseUrl}${path}`, page), {
      headers: defaultHeaders
    });
    const $ = load(data);
    return (0, hianime_1.cardPage)($, scrapeCard($), page);
  };
  const search = async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return scrapeCardPage(`/search?keyword=${encodeURIComponent(query)}`, page);
  };
  /**
   * Search with filters; each is optional. The site has no date filters: `_startDate` and
   * `_endDate` are only there so the parameters line up with Zoro's.
   */
  const fetchAdvancedSearch = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    let type = arguments.length > 1 ? arguments[1] : undefined;
    let status = arguments.length > 2 ? arguments[2] : undefined;
    let rated = arguments.length > 3 ? arguments[3] : undefined;
    let score = arguments.length > 4 ? arguments[4] : undefined;
    let season = arguments.length > 5 ? arguments[5] : undefined;
    let language = arguments.length > 6 ? arguments[6] : undefined;
    let _startDate = arguments.length > 7 ? arguments[7] : undefined;
    let _endDate = arguments.length > 8 ? arguments[8] : undefined;
    let sort = arguments.length > 9 ? arguments[9] : undefined;
    let genres = arguments.length > 10 ? arguments[10] : undefined;
    const params = new URLSearchParams();
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
  const fetchTopAiring = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/status/currently-airing', page);
  };
  const fetchMostPopular = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/most-viewed', page);
  };
  const fetchMostFavorite = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/filter?sort=most_favorite', page);
  };
  const fetchLatestCompleted = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/status/finished-airing', page);
  };
  const fetchRecentlyUpdated = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/latest-updated', page);
  };
  const fetchRecentlyAdded = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/new-release', page);
  };
  const fetchTopUpcoming = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/status/not-yet-aired', page);
  };
  /** @param studioId the studio's slug */
  const fetchStudio = async function (studioId) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return scrapeCardPage(`/studio/${studioId}`, page);
  };
  const fetchSubbedAnime = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/filter?language=1', page);
  };
  const fetchDubbedAnime = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/filter?language=2', page);
  };
  const fetchMovie = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/type/movie', page);
  };
  const fetchTV = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/type/tv', page);
  };
  const fetchOVA = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/type/ova', page);
  };
  const fetchONA = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/type/ona', page);
  };
  const fetchSpecial = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage('/type/special', page);
  };
  const fetchGenres = async () => {
    const {
      data
    } = await axios.get(`${config.baseUrl}/home`, {
      headers: defaultHeaders
    });
    const $ = load(data);
    const genres = [];
    $('a[href*="/genre/"]').each((_, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g)) genres.push(g);
    });
    return genres;
  };
  /** @param genre a genre name or slug ("Slice of Life", "slice-of-life") */
  const genreSearch = async function (genre) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return scrapeCardPage(`/genre/${genre.toLowerCase().replace(/\s+/g, '-')}`, page);
  };
  /**
   * The anime airing on a day.
   * @param date `YYYY-MM-DD`; airing times are in IST (UTC+5:30)
   */
  const fetchSchedule = async date => {
    const res = await axios.get(`${config.baseUrl}/ajax/schedule/date?date=${date}&tzOffset=${IST_TZ_OFFSET}`, {
      headers: ajaxHeaders()
    });
    const $ = load(res.data?.result || res.data);
    const results = [];
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
          episodeText: item.find('.ep span').text().trim()
        });
      }
    });
    return results;
  };
  const fetchSpotlight = async () => {
    const {
      data
    } = await axios.get(`${config.baseUrl}/home`, {
      headers: defaultHeaders
    });
    const $ = load(data);
    const results = [];
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
          url: href.startsWith('http') ? href : `${config.baseUrl}${href}`
        });
      }
    });
    return results;
  };
  const fetchSearchSuggestions = async query => {
    const res = await axios.get(`${config.baseUrl}/ajax/anime/search?keyword=${encodeURIComponent(query)}`, {
      headers: ajaxHeaders()
    });
    const $ = load(res.data?.result?.html || res.data?.result || res.data);
    const suggestions = [];
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
          url: href
        });
      }
    });
    return suggestions;
  };
  /** @param id the anime's slug, as in its /watch/ URL */
  const fetchAnimeInfo = async id => {
    const animeSlug = id.replace(/^\/watch\//, '').replace(/\/.*$/, '');
    const watchUrl = `${config.baseUrl}/watch/${animeSlug}`;
    const {
      data: pageHtml
    } = await axios.get(watchUrl, {
      headers: defaultHeaders
    });
    const $ = load(pageHtml);
    const title = $('#w-info .title.d-title, h1.title').first().text().trim();
    const japaneseTitle = $('#w-info .title.d-title').attr('data-jp') || $('#w-info .names').text().split(';')[1]?.trim() || title;
    const image = $('#w-info .poster img').attr('src') || $('meta[property="og:image"]').attr('content') || '';
    const description = $('#w-info .synopsis .content, .synopsis').text().replace(/\[more\]/g, '').trim();
    // The site's numeric anime id (e.g. 7174), which the episode list is fetched by.
    const dataId = $('#watch-main').attr('data-id') || $('.layout-page-watchtv').attr('data-id') || $('#w-rating').attr('data-id') || $('[data-id]').first().attr('data-id');
    let type = 'TV';
    let premiered;
    let aired;
    let status;
    const genres = [];
    const studios = [];
    const producers = [];
    let duration;
    let rating;
    const linkTexts = (el, list, skip) => $(el).find('a').each((_, a) => {
      const text = $(a).text().trim();
      if (text && text !== skip && !list.includes(text)) list.push(text);
    });
    $('#w-info .bmeta .meta div').each((_, el) => {
      const text = $(el).text();
      const value = $(el).find('span').text().trim();
      if (text.includes('Type:')) type = value;else if (text.includes('Premiered:')) premiered = value;else if (text.includes('Aired:')) aired = value;else if (text.includes('Status:')) status = (0, media_status_1.toMediaStatus)(value, ctx.enums.MediaStatus);else if (text.includes('Genres:')) linkTexts(el, genres);else if (text.includes('Studios:')) linkTexts(el, studios);else if (text.includes('Producers:')) linkTexts(el, producers, 'unknown');else if (text.includes('Duration:')) duration = value;else if (text.includes('MAL:')) rating = value ? parseFloat(value) : undefined;
    });
    const episodes = [];
    if (dataId) {
      const epRes = await axios.get(`${config.baseUrl}/ajax/episode/list/${dataId}`, {
        headers: ajaxHeaders(watchUrl)
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
            id: (0, hianime_1.toEpisodeId)(animeSlug, dataIds),
            number: num,
            title: listItem.attr('title') || anchor.find('.d-title').text().trim() || `Episode ${num}`,
            url: `${config.baseUrl}/watch/${animeSlug}/ep-${num}`,
            isFiller: anchor.hasClass('filler'),
            isSubbed: anchor.attr('data-sub') === '1',
            isDubbed: anchor.attr('data-dub') === '1'
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
      episodes
    };
  };
  /** @param episodeId an episode id from fetchAnimeInfo, or the site's own episode id */
  const fetchEpisodeServers = async function (episodeId) {
    let subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    const dataIds = (0, hianime_1.siteEpisodeId)(episodeId) ?? episodeId;
    const targetSubDub = subOrDub === SubOrDubEnum.DUB ? 'dub' : 'sub';
    const res = await axios.get(`${config.baseUrl}/ajax/server/list?servers=${encodeURIComponent(dataIds)}`, {
      headers: ajaxHeaders()
    });
    const $ = load(res.data?.result || res.data);
    let serverList = $(`.servers .type[data-type="${targetSubDub}"] li[data-link-id]`);
    if (!serverList.length) serverList = $('.servers li[data-link-id]');
    const servers = [];
    for (const el of serverList.toArray()) {
      const linkId = $(el).attr('data-link-id');
      if (!linkId) continue;
      try {
        const {
          data: linkData
        } = await axios.get(`${config.baseUrl}/ajax/server?get=${encodeURIComponent(linkId)}`, {
          headers: ajaxHeaders()
        });
        const embedUrl = linkData?.result?.url;
        if (embedUrl) servers.push({
          name: (0, helpers_1.serverName)('megaplay', $(el).text()),
          url: embedUrl
        });
      } catch {
        // A server whose link doesn't resolve is left out; the others still play.
      }
    }
    return servers;
  };
  /** MegaPlay's sources for an embed URL. */
  const extractFrom = async embedUrl => {
    const serverUrl = new PolyURL(embedUrl);
    return {
      headers: {
        Referer: serverUrl.href
      },
      ...(await MegaPlay(ctx).extract(serverUrl, config.baseUrl))
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
    return extractFrom((0, servers_1.pickServer)(await fetchEpisodeServers(episodeId, subOrDub), server).url);
  };
  return {
    ...config,
    capabilities: {
      aniZipEpisodes: true
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
    fetchAnimeInfo,
    fetchEpisodeServers,
    fetchEpisodeSources
  };
}
//# sourceMappingURL=create-anikoto.js.map