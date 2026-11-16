"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createAniNeko = createAniNeko;
const media_status_1 = require("../../common/media-status");
const servers_1 = require("../../common/servers");
const helpers_1 = require("../helpers");
function createAniNeko(ctx, customBaseURL) {
  const {
    axios,
    load,
    enums,
    createCustomBaseUrl,
    USER_AGENT,
    PolyURL,
    extractors
  } = ctx;
  const {
    VidHide
  } = extractors;
  const {
    SubOrDub: SubOrDubEnum
  } = enums;
  const baseUrl = createCustomBaseUrl('https://anineko.to', customBaseURL);
  const config = {
    name: 'AniNeko',
    languages: 'en',
    classPath: 'ANIME.AniNeko',
    logo: 'https://anineko.to/favicon.ico',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  const hdrs = referer => ({
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': referer ?? `${baseUrl}/`
  });
  const scrapeCards = $ => {
    const results = [];
    $('article.nv-anime-card').each((_, el) => {
      const card = $(el);
      // href: /watch/<id>
      const id = (card.find('a').first().attr('href') ?? '').replace(/^\/watch\//, '').replace(/\/$/, '');
      if (!id) return;
      const title = card.find('h3.nv-anime-title a').text().trim() || card.find('img').attr('alt')?.trim() || '';
      const image = card.find('img').attr('src') || card.find('img').attr('data-src') || undefined;
      const type = card.find('.nv-anime-badge, .badge').first().text().trim();
      results.push({
        id,
        title,
        url: `${baseUrl}/watch/${id}`,
        image,
        type: type || undefined
      });
    });
    return results;
  };
  /** Page `page` of the browse listing with the filters in `params`; undefined ones are left out. */
  const fetchBrowsePage = async function (params) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    const qs = new URLSearchParams({
      page: String(page)
    });
    for (const [key, value] of Object.entries(params)) if (value !== undefined) qs.append(key, String(value));
    const {
      data: html
    } = await axios.get(`${baseUrl}/browse?${qs}`, {
      headers: hdrs()
    });
    const $ = load(html);
    const totalText = $('[class*="result"], [class*="total"]').first().text();
    const total = parseInt(totalText.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, '') ?? '0', 10);
    return {
      currentPage: page,
      hasNextPage: $('a[rel="next"], .pagination .next:not(.disabled) a').length > 0,
      totalResults: total,
      results: scrapeCards($)
    };
  };
  /** The genres genreSearch takes. */
  const GENRES = ['Action', 'Adventure', 'Cars', 'Comedy', 'Dementia', 'Demons', 'Drama', 'Ecchi', 'Fantasy', 'Game', 'Harem', 'Historical', 'Horror', 'Isekai', 'Josei', 'Kids', 'Magic', 'Mahou Shoujo', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire'];
  /** The values of genreSearch's `extra.type`. */
  const TYPES = {
    TV: '1',
    Movie: '2',
    OVA: '3',
    ONA: '4',
    Special: '5',
    Music: '6',
    TV_SHORT: '7'
  };
  /** The values of genreSearch's `extra.status`. */
  const STATUS = {
    Ongoing: 'Ongoing',
    Completed: 'Completed',
    Upcoming: 'Upcoming'
  };
  /** The values of genreSearch's `extra.language`. */
  const LANGUAGE = {
    Subbed: 'Subbed',
    Dubbed: 'Dubbed'
  };
  const SORT = {
    LatestUpdate: 'recently_updated',
    ReleaseDate: 'release_date',
    RecentlyAdded: 'recently_added',
    TitleAZ: 'title_az'
  };
  const search = async function (query) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return fetchBrowsePage({
      keyword: query,
      sort: SORT.LatestUpdate
    }, page);
  };
  const fetchRecentlyUpdated = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchBrowsePage({
      sort: SORT.LatestUpdate
    }, page);
  };
  const fetchNewReleases = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchBrowsePage({
      sort: SORT.ReleaseDate
    }, page);
  };
  const fetchRecentlyAdded = async function () {
    let page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchBrowsePage({
      sort: SORT.RecentlyAdded
    }, page);
  };
  /**
   * @param genre one of `GENRES`
   * @param extra more filters: `type` one of `TYPES`, `status` one of `STATUS`, `language` one of `LANGUAGE`
   */
  const genreSearch = async function (genre) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    let extra = arguments.length > 2 ? arguments[2] : undefined;
    return fetchBrowsePage({
      'sort': SORT.LatestUpdate,
      'genre[]': genre,
      'type[]': extra?.type,
      'status[]': extra?.status,
      'language[]': extra?.language,
      'year[]': extra?.year
    }, page);
  };
  const fetchAnimeInfo = async id => {
    const {
      data: html
    } = await axios.get(`${baseUrl}/watch/${id}`, {
      headers: hdrs()
    });
    const $ = load(html);
    const info = {
      id,
      title: ''
    };
    info.title = $('h1.nv-anime-title, h1.anime-title, h1').first().text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || '';
    info.url = `${baseUrl}/watch/${id}`;
    info.image = $('meta[property="og:image"]').attr('content') || $('img.nv-anime-poster, .poster img, img.cover').first().attr('src') || undefined;
    info.description = $('meta[property="og:description"]').attr('content')?.trim() || $('[class*="desc"], [class*="synopsis"], [class*="summary"]').first().text().trim() || undefined;
    const metaText = label => $(`[class*="info"] *:contains("${label}")`).filter((_, el) => $(el).text().trim().startsWith(label)).first().next().text().trim() || $(`[class*="info"] *:contains("${label}")`).first().text().replace(label, '').trim();
    info.status = (0, media_status_1.toMediaStatus)(metaText('Status'), ctx.enums.MediaStatus);
    info.type = metaText('Type').toUpperCase() || undefined;
    info.releaseDate = metaText('Aired') || metaText('Release') || undefined;
    info.genres = [];
    $('a[href*="/browse"][href*="genre"]').each((_, el) => {
      const g = $(el).text().trim();
      if (g) info.genres?.push(g);
    });
    // Each episode's badges say SUB, HSUB (hard-subbed) or DUB.
    let hasSub = false;
    let hasDub = false;
    $('article.nv-info-episode-item, .episode-item').each((_, el) => {
      const badges = $(el).text().toLowerCase();
      if (badges.includes('sub') || badges.includes('hsub')) hasSub = true;
      if (badges.includes('dub')) hasDub = true;
    });
    info.hasSub = hasSub;
    info.hasDub = hasDub;
    info.episodes = [];
    $('div.nv-info-episode-grid article.nv-info-episode-item, .episode-item').each((_, el) => {
      const item = $(el);
      // /watch/<slug>/ep-<n>; the item also links /download/<slug>/ep-<n>
      const watchHref = item.find('a[href*="/watch/"]').attr('href') || item.find('a').first().attr('href') || '';
      if (!watchHref) return;
      const epNumMatch = watchHref.match(/\/ep-(\d+(?:\.\d+)?)/);
      const number = epNumMatch ? parseFloat(epNumMatch[1]) : 0;
      const epId = watchHref.replace(/^\/watch\//, '');
      const badgeText = item.text().toLowerCase();
      const isSubbed = badgeText.includes('sub') || badgeText.includes('hsub');
      const isDubbed = badgeText.includes('dub');
      const titleEl = item.find('[class*="title"], span').first();
      const title = titleEl.text().trim() || `Episode ${number}`;
      info.episodes?.push({
        id: epId,
        number,
        title,
        isSubbed,
        isDubbed,
        url: `${baseUrl}${watchHref}`
      });
    });
    info.totalEpisodes = info.episodes.length;
    return info;
  };
  /**
   * The extractor that reads an embed URL, by its host. Only VidHide is a library extractor; the
   * others' pages give the stream directly. Hosts, from the site's Kotlin extension:
   * vivibebe.site / vibevibe.workers.dev / bibiemb.xyz, otakuhg.site / otakuvid.online (VidHide),
   * playmogo.com / dood.*.
   */
  const extractorFor = embedUrl => {
    const domain = new PolyURL(embedUrl).hostname.toLowerCase();
    if (domain.includes('vivibebe') || domain.includes('vibevibe') || domain.includes('bibiemb')) {
      return {
        name: 'vivibebe',
        extract: async pageUrl => {
          const {
            data: pageHtml
          } = await axios.get(embedUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              'Referer': pageUrl
            }
          });
          const m3u8 = pageHtml.match(/const\s+src\s*=\s*"([^"]+\.m3u8[^"]*)"/)?.[1];
          if (!m3u8) throw new Error(`[AniNeko] Could not find M3U8 in ${domain}`);
          // The subtitle is a query parameter of the embed URL.
          const params = new PolyURL(embedUrl).searchParams;
          const subUrl = params.get('sub') || params.get('caption_1') || params.get('c1_file') || null;
          const subLabel = params.get('c1_label') || params.get('sub_1') || 'English';
          return {
            sources: [{
              url: m3u8,
              isM3U8: true,
              quality: 'auto'
            }],
            subtitles: subUrl ? [{
              url: subUrl,
              lang: subLabel
            }] : [],
            headers: {
              Referer: `https://${domain}/`
            }
          };
        }
      };
    }
    if (domain.includes('dood') || domain.includes('playmogo')) {
      return {
        name: 'dood',
        extract: async pageUrl => {
          const {
            data: doodHtml
          } = await axios.get(embedUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              'Referer': pageUrl
            }
          });
          const mp4 = doodHtml.match(/source\s+src="([^"]+\.mp4[^"]*)"/)?.[1] || doodHtml.match(/file:\s*["']([^"']+)["']/)?.[1];
          if (!mp4) throw new Error(`[AniNeko] Could not extract source from ${domain}`);
          return {
            sources: [{
              url: mp4,
              isM3U8: false,
              quality: 'auto'
            }],
            subtitles: []
          };
        }
      };
    }
    return {
      name: 'vidhide',
      extract: async () => VidHide(ctx).extract(new PolyURL(embedUrl))
    };
  };
  /** @param episodeId an episode id from fetchAnimeInfo (`<slug>/ep-<n>`), or a watch page URL */
  const fetchEpisodeServers = async function (episodeId) {
    let subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    const url = episodeId.startsWith('http') ? episodeId : `${baseUrl}/watch/${episodeId}`;
    const {
      data: html
    } = await axios.get(url, {
      headers: hdrs(`${baseUrl}/`)
    });
    const $ = load(html);
    const servers = [];
    const seen = new Set();
    // Each language panel lists its servers:
    //   <div class="nv-server-grid lang-group" data-id="hsub|sub|dub">
    //     <button class="nv-server-btn server-video server" data-video="<url>" data-tab="hsub|sub|dub">
    //       HD-2 <span>Hard Sub</span>
    //     </button>
    //   </div>
    // SUB lists the hard-sub and soft-sub panels, DUB the dub panel.
    const panelIds = subOrDub === SubOrDubEnum.DUB ? ['dub'] : ['hsub', 'sub'];
    for (const panelId of panelIds) {
      $(`div.lang-group[data-id="${panelId}"] button.server-video[data-video]`).each((_, btn) => {
        const embedUrl = $(btn).attr('data-video')?.trim();
        if (!embedUrl) return;
        const label = $(btn).clone().children('span').remove().end().text().trim();
        const spanText = $(btn).find('span').text().trim().toLowerCase();
        const subType = spanText.includes('hard') ? 'hardsub' : spanText.includes('dub') ? 'dub' : 'softsub';
        const name = (0, helpers_1.serverName)(extractorFor(embedUrl).name, `${label}-${subType}`);
        if (seen.has(name)) return;
        seen.add(name);
        servers.push({
          name,
          url: embedUrl
        });
      });
    }
    return servers;
  };
  /**
   * @param episodeId an episode id from fetchAnimeInfo (`<slug>/ep-<n>`), or an embed URL
   * @param server a server name from fetchEpisodeServers, or the start of one; the first server when omitted
   * @param subOrDub default `SubOrDub.SUB`
   */
  const fetchEpisodeSources = async function (episodeId, server) {
    let subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    if (episodeId.startsWith('http')) return extractorFor(episodeId).extract(baseUrl);
    const picked = (0, servers_1.pickServer)(await fetchEpisodeServers(episodeId, subOrDub), server);
    if (!picked.url) throw new Error(`[AniNeko] No embed URL for server "${picked.name}"`);
    return extractorFor(picked.url).extract(`${baseUrl}/watch/${episodeId}`);
  };
  return {
    ...config,
    capabilities: {
      aniZipEpisodes: true
    },
    GENRES,
    TYPES,
    STATUS,
    LANGUAGE,
    SORT,
    search,
    fetchRecentlyUpdated,
    fetchNewReleases,
    fetchRecentlyAdded,
    genreSearch,
    fetchAnimeInfo,
    fetchEpisodeServers,
    fetchEpisodeSources
  };
}
//# sourceMappingURL=create-anineko.js.map