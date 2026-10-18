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
    var _loop = function (key) {
      if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
        get: () => from[key],
        enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
      });
    };
    for (var key of __getOwnPropNames(from)) {
      _loop(key);
    }
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
  var {
    axios,
    load,
    enums,
    createCustomBaseUrl,
    USER_AGENT,
    PolyURL,
    extractors
  } = ctx;
  var {
    VidHide
  } = extractors;
  var {
    MediaStatus: MediaStatusEnum,
    SubOrDub: SubOrDubEnum
  } = enums;
  var baseUrl = createCustomBaseUrl("https://anineko.to", customBaseURL);
  var config = {
    name: "AniNeko",
    languages: "en",
    classPath: "ANIME.AniNeko",
    logo: "https://anineko.to/favicon.ico",
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  var UA = USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
  var hdrs = referer => ({
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": referer ?? `${baseUrl}/`
  });
  var scrapeCards = html => {
    var $ = load(html);
    var results = [];
    $("article.nv-anime-card").each((_, el) => {
      var card = $(el);
      var anchor = card.find("a").first();
      var href = anchor.attr("href") ?? "";
      var id = href.replace(/^\/watch\//, "").replace(/\/$/, "");
      if (!id) return;
      var title = card.find("h3.nv-anime-title a").text().trim() || card.find("img").attr("alt")?.trim() || "";
      var image = card.find("img").attr("src") || card.find("img").attr("data-src") || void 0;
      var type = card.find(".nv-anime-badge, .badge").first().text().trim();
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
  var parsePagination = (html, page) => {
    var $ = load(html);
    var totalText = $('[class*="result"], [class*="total"]').first().text();
    var totalMatch = totalText.match(/(\d[\d,]*)/);
    var total = totalMatch ? parseInt(totalMatch[1].replace(",", ""), 10) : 0;
    var hasNextPage = $('a[rel="next"], .pagination .next:not(.disabled) a').length > 0;
    return {
      total,
      hasNextPage
    };
  };
  var fetchBrowsePage = async function (params) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var qs = new URLSearchParams({
      page: String(page),
      ...Object.fromEntries(Object.entries(params).map(_ref => {
        var [k, v] = _ref;
        return [k, String(v)];
      }))
    });
    var url = `${baseUrl}/browse?${qs}`;
    var {
      data: html
    } = await axios.get(url, {
      headers: hdrs()
    });
    var {
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
  var GENRES = ["Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", "Ecchi", "Fantasy", "Game", "Harem", "Historical", "Horror", "Isekai", "Josei", "Kids", "Magic", "Mahou Shoujo", "Martial Arts", "Mecha", "Military", "Music", "Mystery", "Parody", "Police", "Psychological", "Romance", "Samurai", "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai", "Slice of Life", "Space", "Sports", "Super Power", "Supernatural", "Thriller", "Vampire"];
  var TYPES = {
    TV: "1",
    Movie: "2",
    OVA: "3",
    ONA: "4",
    Special: "5",
    Music: "6",
    TV_SHORT: "7"
  };
  var STATUS = {
    Ongoing: "Ongoing",
    Completed: "Completed",
    Upcoming: "Upcoming"
  };
  var LANGUAGE = {
    Subbed: "Subbed",
    Dubbed: "Dubbed"
  };
  var SORT = {
    LatestUpdate: "recently_updated",
    ReleaseDate: "release_date",
    RecentlyAdded: "recently_added",
    TitleAZ: "title_az"
  };
  var search = async function (query) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return fetchBrowsePage({
      keyword: query,
      sort: SORT.LatestUpdate
    }, page);
  };
  var fetchRecentlyUpdated = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchBrowsePage({
      sort: SORT.LatestUpdate
    }, page);
  };
  var fetchNewReleases = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchBrowsePage({
      sort: SORT.ReleaseDate
    }, page);
  };
  var fetchRecentlyAdded = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchBrowsePage({
      sort: SORT.RecentlyAdded
    }, page);
  };
  var genreSearch = async function (genre) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var extra = arguments.length > 2 ? arguments[2] : undefined;
    var params = new URLSearchParams({
      page: String(page),
      sort: SORT.LatestUpdate
    });
    params.append("genre[]", genre);
    if (extra?.type) params.append("type[]", extra.type);
    if (extra?.status) params.append("status[]", extra.status);
    if (extra?.language) params.append("language[]", extra.language);
    if (extra?.year) params.append("year[]", String(extra.year));
    var url = `${baseUrl}/browse?${params}`;
    var {
      data: html
    } = await axios.get(url, {
      headers: hdrs()
    });
    var {
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
  var fetchAnimeInfo = async id => {
    var {
      data: html
    } = await axios.get(`${baseUrl}/watch/${id}`, {
      headers: hdrs()
    });
    var $ = load(html);
    var info = {
      id,
      title: ""
    };
    info.title = $("h1.nv-anime-title, h1.anime-title, h1").first().text().trim() || $('meta[property="og:title"]').attr("content")?.trim() || "";
    info.url = `${baseUrl}/watch/${id}`;
    info.image = $('meta[property="og:image"]').attr("content") || $("img.nv-anime-poster, .poster img, img.cover").first().attr("src") || void 0;
    info.description = $('meta[property="og:description"]').attr("content")?.trim() || $('[class*="desc"], [class*="synopsis"], [class*="summary"]').first().text().trim() || void 0;
    var metaText = label => $(`[class*="info"] *:contains("${label}")`).filter((_, el) => $(el).text().trim().startsWith(label)).first().next().text().trim() || $(`[class*="info"] *:contains("${label}")`).first().text().replace(label, "").trim();
    var statusRaw = metaText("Status");
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
      var g = $(el).text().trim();
      if (g) info.genres?.push(g);
    });
    var hasSub = false;
    var hasDub = false;
    $("article.nv-info-episode-item, .episode-item").each((_, el) => {
      var badges = $(el).text().toLowerCase();
      if (badges.includes("sub") || badges.includes("hsub")) hasSub = true;
      if (badges.includes("dub")) hasDub = true;
    });
    info.hasSub = hasSub;
    info.hasDub = hasDub;
    info.episodes = [];
    $("div.nv-info-episode-grid article.nv-info-episode-item, .episode-item").each((_, el) => {
      var item = $(el);
      var watchHref = item.find('a[href*="/watch/"]').attr("href") || item.find("a").first().attr("href") || "";
      if (!watchHref) return;
      var epNumMatch = watchHref.match(/\/ep-(\d+(?:\.\d+)?)/);
      var number = epNumMatch ? parseFloat(epNumMatch[1]) : 0;
      var epId = watchHref.replace(/^\/watch\//, "");
      var badgeText = item.text().toLowerCase();
      var isSubbed = badgeText.includes("sub") || badgeText.includes("hsub");
      var isDubbed = badgeText.includes("dub");
      var titleEl = item.find('[class*="title"], span').first();
      var title = titleEl.text().trim() || `Episode ${number}`;
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
  var fetchEpisodeServers = async function (episodeId) {
    var subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    var url = episodeId.startsWith("http") ? episodeId : `${baseUrl}/watch/${episodeId}`;
    var {
      data: html
    } = await axios.get(url, {
      headers: hdrs(`${baseUrl}/`)
    });
    var $ = load(html);
    var servers = [];
    var seen = /* @__PURE__ */new Set();
    var panelIds = subOrDub === SubOrDubEnum.DUB ? ["dub"] : ["hsub", "sub"];
    for (var panelId of panelIds) {
      $(`div.lang-group[data-id="${panelId}"] button.server-video[data-video]`).each((_, btn) => {
        var embedUrl = $(btn).attr("data-video")?.trim();
        if (!embedUrl) return;
        var serverName = $(btn).clone().children("span").remove().end().text().trim().toLowerCase().replace(/\s+/g, "-");
        var spanText = $(btn).find("span").text().trim().toLowerCase();
        var subType = spanText.includes("hard") ? "hardsub" : spanText.includes("dub") ? "dub" : "softsub";
        var name = `${serverName}-${subType}`;
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
  var extractFromUrl = async (embedUrl, pageUrl) => {
    var domain = new PolyURL(embedUrl).hostname.toLowerCase();
    if (domain.includes("vivibebe") || domain.includes("vibevibe") || domain.includes("bibiemb")) {
      var {
        data: pageHtml
      } = await axios.get(embedUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": pageUrl
        }
      });
      var m3u8Match = pageHtml.match(/const\s+src\s*=\s*"([^"]+\.m3u8[^"]*)"/);
      if (!m3u8Match?.[1]) throw new Error(`[AniNeko] Could not find M3U8 in ${domain}`);
      var subUrl = new PolyURL(embedUrl).searchParams.get("sub") || new PolyURL(embedUrl).searchParams.get("caption_1") || new PolyURL(embedUrl).searchParams.get("c1_file") || null;
      var subLabel = new PolyURL(embedUrl).searchParams.get("c1_label") || new PolyURL(embedUrl).searchParams.get("sub_1") || "English";
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
      var {
        data: doodHtml
      } = await axios.get(embedUrl, {
        headers: {
          "User-Agent": UA,
          "Referer": pageUrl
        }
      });
      var mp4 = doodHtml.match(/source\s+src="([^"]+\.mp4[^"]*)"/)?.[1] || doodHtml.match(/file:\s*["']([^"']+)["']/)?.[1];
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
  var fetchEpisodeSources = async function (episodeId, server) {
    var subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    if (episodeId.startsWith("http")) {
      return extractFromUrl(episodeId, baseUrl);
    }
    var watchUrl = `${baseUrl}/watch/${episodeId}`;
    var servers = await fetchEpisodeServers(episodeId, subOrDub);
    if (servers.length === 0) {
      throw new Error(`[AniNeko] No servers found for episode ${episodeId}`);
    }
    var serverLower = server?.toLowerCase() ?? "";
    var picked = servers.find(s => s.name.includes(serverLower)) ?? servers[0];
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