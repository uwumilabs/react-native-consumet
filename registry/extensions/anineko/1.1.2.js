"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, {
    get: all[name],
    enumerable: true
  });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    });
  }
  return to;
};
var __toCommonJS = mod => __copyProps(__defProp({}, "__esModule", {
  value: true
}), mod);

// src/providers/anime/anineko/create-anineko.ts
var create_anineko_exports = {};
__export(create_anineko_exports, {
  createAniNeko: () => createAniNeko
});
module.exports = __toCommonJS(create_anineko_exports);
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
    MediaStatus: MediaStatusEnum,
    SubOrDub: SubOrDubEnum
  } = enums;
  const baseUrl = createCustomBaseUrl("https://anineko.to", customBaseURL);
  const config = {
    name: "AniNeko",
    languages: "en",
    classPath: "ANIME.AniNeko",
    logo: "https://anineko.to/favicon.ico",
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  const UA = USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
  const hdrs = referer => ({
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": referer ?? `${baseUrl}/`
  });
  const scrapeCards = html => {
    const $ = load(html);
    const results = [];
    $("article.nv-anime-card").each((_, el) => {
      const card = $(el);
      const anchor = card.find("a").first();
      const href = anchor.attr("href") ?? "";
      const id = href.replace(/^\/watch\//, "").replace(/\/$/, "");
      if (!id) return;
      const title = card.find("h3.nv-anime-title a").text().trim() || card.find("img").attr("alt")?.trim() || "";
      const image = card.find("img").attr("src") || card.find("img").attr("data-src") || void 0;
      const type = card.find(".nv-anime-badge, .badge").first().text().trim();
      results.push({
        id,
        title,
        url: `${baseUrl}/watch/${id}`,
        image,
        type: type || void 0
      });
    });
    return results;
  };
  const parsePagination = (html, page) => {
    const $ = load(html);
    const totalText = $('[class*="result"], [class*="total"]').first().text();
    const totalMatch = totalText.match(/(\d[\d,]*)/);
    const total = totalMatch ? parseInt(totalMatch[1].replace(",", ""), 10) : 0;
    const hasNextPage = $('a[rel="next"], .pagination .next:not(.disabled) a').length > 0;
    return {
      total,
      hasNextPage
    };
  };
  const fetchBrowsePage = async function (params) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    const qs = new URLSearchParams({
      page: String(page),
      ...Object.fromEntries(Object.entries(params).map(_ref => {
        let [k, v] = _ref;
        return [k, String(v)];
      }))
    });
    const url = `${baseUrl}/browse?${qs}`;
    const {
      data: html
    } = await axios.get(url, {
      headers: hdrs()
    });
    const {
      total,
      hasNextPage
    } = parsePagination(html, page);
    return {
      currentPage: page,
      hasNextPage,
      totalResults: total,
      results: scrapeCards(html)
    };
  };
  const GENRES = ["Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", "Ecchi", "Fantasy", "Game", "Harem", "Historical", "Horror", "Isekai", "Josei", "Kids", "Magic", "Mahou Shoujo", "Martial Arts", "Mecha", "Military", "Music", "Mystery", "Parody", "Police", "Psychological", "Romance", "Samurai", "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai", "Slice of Life", "Space", "Sports", "Super Power", "Supernatural", "Thriller", "Vampire"];
  const TYPES = {
    TV: "1",
    Movie: "2",
    OVA: "3",
    ONA: "4",
    Special: "5",
    Music: "6",
    TV_SHORT: "7"
  };
  const STATUS = {
    Ongoing: "Ongoing",
    Completed: "Completed",
    Upcoming: "Upcoming"
  };
  const LANGUAGE = {
    Subbed: "Subbed",
    Dubbed: "Dubbed"
  };
  const SORT = {
    LatestUpdate: "recently_updated",
    ReleaseDate: "release_date",
    RecentlyAdded: "recently_added",
    TitleAZ: "title_az"
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
  const genreSearch = async function (genre) {
    let page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    let extra = arguments.length > 2 ? arguments[2] : undefined;
    const params = new URLSearchParams({
      page: String(page),
      sort: SORT.LatestUpdate
    });
    params.append("genre[]", genre);
    if (extra?.type) params.append("type[]", extra.type);
    if (extra?.status) params.append("status[]", extra.status);
    if (extra?.language) params.append("language[]", extra.language);
    if (extra?.year) params.append("year[]", String(extra.year));
    const url = `${baseUrl}/browse?${params}`;
    const {
      data: html
    } = await axios.get(url, {
      headers: hdrs()
    });
    const {
      total,
      hasNextPage
    } = parsePagination(html, page);
    return {
      currentPage: page,
      hasNextPage,
      totalResults: total,
      results: scrapeCards(html)
    };
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
      title: ""
    };
    info.title = $("h1.nv-anime-title, h1.anime-title, h1").first().text().trim() || $('meta[property="og:title"]').attr("content")?.trim() || "";
    info.url = `${baseUrl}/watch/${id}`;
    info.image = $('meta[property="og:image"]').attr("content") || $("img.nv-anime-poster, .poster img, img.cover").first().attr("src") || void 0;
    info.description = $('meta[property="og:description"]').attr("content")?.trim() || $('[class*="desc"], [class*="synopsis"], [class*="summary"]').first().text().trim() || void 0;
    const metaText = label => $(`[class*="info"] *:contains("${label}")`).filter((_, el) => $(el).text().trim().startsWith(label)).first().next().text().trim() || $(`[class*="info"] *:contains("${label}")`).first().text().replace(label, "").trim();
    const statusRaw = metaText("Status");
    switch (statusRaw.toLowerCase()) {
      case "currently airing":
      case "ongoing":
      case "releasing":
        info.status = MediaStatusEnum.ONGOING;
        break;
      case "finished airing":
      case "completed":
        info.status = MediaStatusEnum.COMPLETED;
        break;
      case "not yet aired":
        info.status = MediaStatusEnum.NOT_YET_AIRED;
        break;
      default:
        info.status = MediaStatusEnum.UNKNOWN;
    }
    info.type = metaText("Type").toUpperCase() || void 0;
    info.releaseDate = metaText("Aired") || metaText("Release") || void 0;
    info.genres = [];
    $('a[href*="/browse"][href*="genre"]').each((_, el) => {
      const g = $(el).text().trim();
      if (g) info.genres?.push(g);
    });
    let hasSub = false;
    let hasDub = false;
    $("article.nv-info-episode-item, .episode-item").each((_, el) => {
      const badges = $(el).text().toLowerCase();
      if (badges.includes("sub") || badges.includes("hsub")) hasSub = true;
      if (badges.includes("dub")) hasDub = true;
    });
    info.hasSub = hasSub;
    info.hasDub = hasDub;
    info.episodes = [];
    $("div.nv-info-episode-grid article.nv-info-episode-item, .episode-item").each((_, el) => {
      const item = $(el);
      const watchHref = item.find('a[href*="/watch/"]').attr("href") || item.find("a").first().attr("href") || "";
      if (!watchHref) return;
      const epNumMatch = watchHref.match(/\/ep-(\d+(?:\.\d+)?)/);
      const number = epNumMatch ? parseFloat(epNumMatch[1]) : 0;
      const epId = watchHref.replace(/^\/watch\//, "");
      const badgeText = item.text().toLowerCase();
      const isSubbed = badgeText.includes("sub") || badgeText.includes("hsub");
      const isDubbed = badgeText.includes("dub");
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
  const fetchEpisodeServers = async function (episodeId) {
    let subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    const url = episodeId.startsWith("http") ? episodeId : `${baseUrl}/watch/${episodeId}`;
    const {
      data: html
    } = await axios.get(url, {
      headers: hdrs(`${baseUrl}/`)
    });
    const $ = load(html);
    const servers = [];
    const seen = /* @__PURE__ */new Set();
    const panelIds = subOrDub === SubOrDubEnum.DUB ? ["dub"] : ["hsub", "sub"];
    for (const panelId of panelIds) {
      $(`div.lang-group[data-id="${panelId}"] button.server-video[data-video]`).each((_, btn) => {
        const embedUrl = $(btn).attr("data-video")?.trim();
        if (!embedUrl) return;
        const serverName = $(btn).clone().children("span").remove().end().text().trim().toLowerCase().replace(/\s+/g, "-");
        const spanText = $(btn).find("span").text().trim().toLowerCase();
        const subType = spanText.includes("hard") ? "hardsub" : spanText.includes("dub") ? "dub" : "softsub";
        const name = `${serverName}-${subType}`;
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
  const extractFromUrl = async (embedUrl, pageUrl) => {
    const domain = new PolyURL(embedUrl).hostname.toLowerCase();
    if (domain.includes("vivibebe") || domain.includes("vibevibe") || domain.includes("bibiemb")) {
      const {
        data: pageHtml
      } = await axios.get(embedUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": pageUrl
        }
      });
      const m3u8Match = pageHtml.match(/const\s+src\s*=\s*"([^"]+\.m3u8[^"]*)"/);
      if (!m3u8Match?.[1]) throw new Error(`[AniNeko] Could not find M3U8 in ${domain}`);
      const subUrl = new PolyURL(embedUrl).searchParams.get("sub") || new PolyURL(embedUrl).searchParams.get("caption_1") || new PolyURL(embedUrl).searchParams.get("c1_file") || null;
      const subLabel = new PolyURL(embedUrl).searchParams.get("c1_label") || new PolyURL(embedUrl).searchParams.get("sub_1") || "English";
      return {
        sources: [{
          url: m3u8Match[1],
          isM3U8: true,
          quality: "auto"
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
    if (domain.includes("dood") || domain.includes("playmogo")) {
      const {
        data: doodHtml
      } = await axios.get(embedUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": pageUrl
        }
      });
      const mp4 = doodHtml.match(/source\s+src="([^"]+\.mp4[^"]*)"/)?.[1] || doodHtml.match(/file:\s*["']([^"']+)["']/)?.[1];
      if (!mp4) throw new Error(`[AniNeko] Could not extract source from ${domain}`);
      return {
        sources: [{
          url: mp4,
          isM3U8: false,
          quality: "auto"
        }],
        subtitles: []
      };
    }
    return VidHide(ctx).extract(new PolyURL(embedUrl), pageUrl);
  };
  const fetchEpisodeSources = async function (episodeId, server) {
    let subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    if (episodeId.startsWith("http")) {
      return extractFromUrl(episodeId, baseUrl);
    }
    const watchUrl = `${baseUrl}/watch/${episodeId}`;
    const servers = await fetchEpisodeServers(episodeId, subOrDub);
    if (servers.length === 0) {
      throw new Error(`[AniNeko] No servers found for episode ${episodeId}`);
    }
    const serverLower = server?.toLowerCase() ?? "";
    const picked = servers.find(s => s.name.includes(serverLower)) ?? servers[0];
    if (!picked.url) throw new Error(`[AniNeko] No embed URL for server "${picked.name}"`);
    return extractFromUrl(picked.url, watchUrl);
  };
  return {
    ...config,
    capabilities: {
      aniZipEpisodes: true
    },
    // filter constants — consumers can use these for UI filter pickers
    GENRES,
    TYPES,
    STATUS,
    LANGUAGE,
    SORT,
    // methods
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
if (module.exports !== exports) Object.assign(exports, module.exports);