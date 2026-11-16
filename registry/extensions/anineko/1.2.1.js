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

// src/providers/common/media-status.ts
var import_models = require("react-native-consumet/models");
var STATUS_WORDS = [[import_models.MediaStatus.NOT_YET_AIRED, /not[\s_-]*yet|coming[\s_-]*soon|upcoming/], [import_models.MediaStatus.COMPLETED, /finish|complete/], [import_models.MediaStatus.HIATUS, /hiatus/], [import_models.MediaStatus.CANCELLED, /cancel|discontinu|dropped|axed/], [import_models.MediaStatus.ONGOING, /airing|releasing|ongoing|on[\s_-]*going|publishing/]];
function toMediaStatus(text) {
  var normalized = text?.trim().toLowerCase();
  if (!normalized) return void 0;
  return STATUS_WORDS.find(_ref => {
    var [, words] = _ref;
    return words.test(normalized);
  })?.[0] ?? import_models.MediaStatus.UNKNOWN;
}

// src/providers/common/servers.ts
function serverName(extractor) {
  var label = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  var slug = label.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
  return slug ? `${extractor}-${slug}` : extractor;
}
function serversNamed(servers, server) {
  if (!servers.length) throw new Error("No servers found for this episode");
  if (!server) return [...servers];
  var wanted = server.toLowerCase();
  var matches = servers.filter(candidate => candidate.name.toLowerCase().startsWith(wanted));
  if (!matches.length) {
    throw new Error(`Server '${server}' not found; available: ${servers.map(s => s.name).join(", ")}`);
  }
  return matches;
}
function pickServer(servers, server) {
  return serversNamed(servers, server)[0];
}

// src/providers/anime/anineko/create-anineko.ts
function createAniNeko(ctx, customBaseURL) {
  var {
    axios,
    load,
    enums,
    createCustomBaseUrl,
    USER_AGENT,
    PolyURL,
    PolyURLSearchParams,
    extractors
  } = ctx;
  var {
    VidHide
  } = extractors;
  var {
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
  var hdrs = referer => ({
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": referer ?? `${baseUrl}/`
  });
  var scrapeCards = $ => {
    var results = [];
    $("article.nv-anime-card").each((_, el) => {
      var card = $(el);
      var id = (card.find("a").first().attr("href") ?? "").replace(/^\/watch\//, "").replace(/\/$/, "");
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
  var fetchBrowsePage = async function (params) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var qs = new PolyURLSearchParams({
      page: String(page)
    });
    for (var [key, value] of Object.entries(params)) if (value !== void 0) qs.append(key, String(value));
    var {
      data: html
    } = await axios.get(`${baseUrl}/browse?${qs}`, {
      headers: hdrs()
    });
    var $ = load(html);
    var totalText = $('[class*="result"], [class*="total"]').first().text();
    var total = parseInt(totalText.match(/(\d[\d,]*)/)?.[1]?.replace(/,/g, "") ?? "0", 10);
    return {
      currentPage: page,
      hasNextPage: $('a[rel="next"], .pagination .next:not(.disabled) a').length > 0,
      totalResults: total,
      results: scrapeCards($)
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
    return fetchBrowsePage({
      "sort": SORT.LatestUpdate,
      "genre[]": genre,
      "type[]": extra?.type,
      "status[]": extra?.status,
      "language[]": extra?.language,
      "year[]": extra?.year
    }, page);
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
    info.status = toMediaStatus(metaText("Status"));
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
  var extractorFor = embedUrl => {
    var domain = new PolyURL(embedUrl).hostname.toLowerCase();
    if (domain.includes("vivibebe") || domain.includes("vibevibe") || domain.includes("bibiemb")) {
      return {
        name: "vivibebe",
        extract: async pageUrl => {
          var {
            data: pageHtml
          } = await axios.get(embedUrl, {
            headers: {
              "User-Agent": USER_AGENT,
              "Referer": pageUrl
            }
          });
          var m3u8 = pageHtml.match(/const\s+src\s*=\s*"([^"]+\.m3u8[^"]*)"/)?.[1];
          if (!m3u8) throw new Error(`[AniNeko] Could not find M3U8 in ${domain}`);
          var params = new PolyURL(embedUrl).searchParams;
          var subUrl = params.get("sub") || params.get("caption_1") || params.get("c1_file") || null;
          var subLabel = params.get("c1_label") || params.get("sub_1") || "English";
          return {
            sources: [{
              url: m3u8,
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
      };
    }
    if (domain.includes("dood") || domain.includes("playmogo")) {
      return {
        name: "dood",
        extract: async pageUrl => {
          var {
            data: doodHtml
          } = await axios.get(embedUrl, {
            headers: {
              "User-Agent": USER_AGENT,
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
      };
    }
    return {
      name: "vidhide",
      extract: async () => VidHide(ctx).extract(new PolyURL(embedUrl))
    };
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
        var label = $(btn).clone().children("span").remove().end().text().trim();
        var spanText = $(btn).find("span").text().trim().toLowerCase();
        var subType = spanText.includes("hard") ? "hardsub" : spanText.includes("dub") ? "dub" : "softsub";
        var name = serverName(extractorFor(embedUrl).name, `${label}-${subType}`);
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
  var fetchEpisodeSources = async function (episodeId, server) {
    var subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    if (episodeId.startsWith("http")) return extractorFor(episodeId).extract(baseUrl);
    var picked = pickServer(await fetchEpisodeServers(episodeId, subOrDub), server);
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