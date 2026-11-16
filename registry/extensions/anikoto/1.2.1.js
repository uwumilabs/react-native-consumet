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

// src/providers/anime/anikoto/create-anikoto.ts
var create_anikoto_exports = {};
__export(create_anikoto_exports, {
  createAniKoto: () => createAniKoto
});
module.exports = __toCommonJS(create_anikoto_exports);

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

// src/providers/common/search.ts
function emptySearch() {
  var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  return {
    currentPage: page,
    hasNextPage: false,
    results: []
  };
}

// src/providers/anime/hianime.ts
var IST_TZ_OFFSET = -330;
function pageUrl(url, page) {
  return `${url}${url.includes("?") ? "&" : "?"}page=${clampPage(page)}`;
}
function clampPage(page) {
  return page < 1 ? 1 : page;
}
var pageIn = href => Number(href?.match(/[?&]page=(\d+)/)?.[1]);
function cardPage($, results, page) {
  if (!results.length) return emptySearch(clampPage(page));
  var currentPage = parseInt($(".pagination .page-item.active").first().text().trim(), 10) || clampPage(page);
  var linkedPages = $(".pagination a[href]").toArray().map(link => pageIn($(link).attr("href"))).filter(linked => linked > 0);
  var totalPages = Math.max(currentPage, ...linkedPages);
  return {
    currentPage,
    hasNextPage: totalPages > currentPage,
    totalPages,
    results
  };
}
function linkedGenres($) {
  var genres = [];
  $('a[href*="/genre/"]').each((_, link) => {
    var genre = $(link).text().trim();
    if (genre && !genres.includes(genre)) genres.push(genre);
  });
  return genres;
}
var EPISODE = "$episode$";
function toEpisodeId(animeId, siteId) {
  return `${animeId}${EPISODE}${siteId}`;
}
function siteEpisodeId(id) {
  if (!id.includes(EPISODE)) return void 0;
  return id.split(EPISODE)[1].replace(/\$(sub|dub|auto|both)$/i, "");
}

// src/providers/anime/anikoto/create-anikoto.ts
function createAniKoto(ctx, customBaseURL) {
  var {
    axios,
    load,
    extractors,
    enums,
    createCustomBaseUrl,
    PolyURL,
    PolyURLSearchParams,
    USER_AGENT
  } = ctx;
  var {
    MegaPlay
  } = extractors;
  var {
    SubOrDub: SubOrDubEnum
  } = enums;
  var baseUrl = createCustomBaseUrl("https://anikototv.to", customBaseURL);
  var config = {
    name: "AniKoto",
    languages: "en",
    classPath: "ANIME.AniKoto",
    logo: "https://anikototv.to/favicon-32x32.png",
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  var defaultHeaders = {
    "User-Agent": USER_AGENT
  };
  var ajaxHeaders = referer => ({
    ...defaultHeaders,
    "X-Requested-With": "XMLHttpRequest",
    "Referer": referer || config.baseUrl
  });
  var scrapeCard = $ => {
    var results = [];
    $(".item").each((_, el) => {
      var item = $(el);
      var nameEl = item.find(".name.d-title, .name").first();
      var title = nameEl.text().trim();
      var href = item.find("a.name, .poster a").first().attr("href") || "";
      var match = href.match(/\/watch\/([^/?#]+)/);
      var id = match ? match[1] : href.replace(/^.*\/watch\//, "").replace(/\/.*$/, "");
      var ratingStr = item.find(".m-item.rated span").first().text().trim();
      if (id && title) {
        results.push({
          id,
          title,
          japaneseTitle: nameEl.attr("data-jp") || void 0,
          image: item.find(".poster img, img").attr("src") || "",
          url: href.startsWith("http") ? href : `${config.baseUrl}${href.startsWith("/") ? "" : "/"}${href}`,
          type: item.find(".meta .right").first().text().trim() || "TV",
          sub: parseInt(item.find(".ep-status.sub").first().text().trim(), 10) || 0,
          dub: parseInt(item.find(".ep-status.dub").first().text().trim(), 10) || 0,
          rating: ratingStr ? parseFloat(ratingStr) : void 0
        });
      }
    });
    return results;
  };
  var scrapeCardPage = async (path, page) => {
    var {
      data
    } = await axios.get(pageUrl(`${config.baseUrl}${path}`, page), {
      headers: defaultHeaders
    });
    var $ = load(data);
    return cardPage($, scrapeCard($), page);
  };
  var search = async function (query) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return scrapeCardPage(`/search?keyword=${encodeURIComponent(query)}`, page);
  };
  var fetchAdvancedSearch = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var type = arguments.length > 1 ? arguments[1] : undefined;
    var status = arguments.length > 2 ? arguments[2] : undefined;
    var rated = arguments.length > 3 ? arguments[3] : undefined;
    var score = arguments.length > 4 ? arguments[4] : undefined;
    var season = arguments.length > 5 ? arguments[5] : undefined;
    var language = arguments.length > 6 ? arguments[6] : undefined;
    var _startDate = arguments.length > 7 ? arguments[7] : undefined;
    var _endDate = arguments.length > 8 ? arguments[8] : undefined;
    var sort = arguments.length > 9 ? arguments[9] : undefined;
    var genres = arguments.length > 10 ? arguments[10] : undefined;
    var params = new PolyURLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (rated) params.set("rated", rated);
    if (score) params.set("score", String(score));
    if (season) params.set("season", season);
    if (language) params.set("language", language);
    if (sort) params.set("sort", sort);
    for (var genre of genres ?? []) params.append("genres[]", genre);
    var query = params.toString();
    return scrapeCardPage(query ? `/filter?${query}` : "/filter", page);
  };
  var fetchTopAiring = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/status/currently-airing", page);
  };
  var fetchMostPopular = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/most-viewed", page);
  };
  var fetchMostFavorite = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/filter?sort=most_favorite", page);
  };
  var fetchLatestCompleted = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/status/finished-airing", page);
  };
  var fetchRecentlyUpdated = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/latest-updated", page);
  };
  var fetchRecentlyAdded = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/new-release", page);
  };
  var fetchTopUpcoming = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/status/not-yet-aired", page);
  };
  var fetchStudio = async function (studioId) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return scrapeCardPage(`/studio/${studioId}`, page);
  };
  var fetchSubbedAnime = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/filter?language=1", page);
  };
  var fetchDubbedAnime = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/filter?language=2", page);
  };
  var fetchMovie = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/type/movie", page);
  };
  var fetchTV = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/type/tv", page);
  };
  var fetchOVA = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/type/ova", page);
  };
  var fetchONA = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/type/ona", page);
  };
  var fetchSpecial = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage("/type/special", page);
  };
  var fetchGenres = async () => linkedGenres(load((await axios.get(`${config.baseUrl}/home`, {
    headers: defaultHeaders
  })).data));
  var genreSearch = async function (genre) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return scrapeCardPage(`/genre/${genre.toLowerCase().replace(/\s+/g, "-")}`, page);
  };
  var fetchSchedule = async date => {
    var res = await axios.get(`${config.baseUrl}/ajax/schedule/date?date=${date}&tzOffset=${IST_TZ_OFFSET}`, {
      headers: ajaxHeaders()
    });
    var $ = load(res.data?.result || res.data);
    var results = [];
    $("a.item").each((_, el) => {
      var item = $(el);
      var href = item.attr("href") || "";
      var id = href.match(/\/watch\/([^/?#]+)/)?.[1] ?? href;
      var title = item.find(".title.d-title, .title").text().trim();
      if (id && title) {
        results.push({
          id,
          title,
          url: href,
          time: item.find(".time").text().trim(),
          episodeText: item.find(".ep span").text().trim()
        });
      }
    });
    return results;
  };
  var fetchSpotlight = async () => {
    var {
      data
    } = await axios.get(`${config.baseUrl}/home`, {
      headers: defaultHeaders
    });
    var $ = load(data);
    var results = [];
    $(".swiper-slide.item").each((_, el) => {
      var slide = $(el);
      var title = slide.find(".title.d-title, .title").text().trim();
      var href = slide.find('a[href*="/watch/"]').first().attr("href") || "";
      var id = href.match(/\/watch\/([^/?#]+)/)?.[1] ?? "";
      if (id && title) {
        results.push({
          id,
          title,
          japaneseTitle: slide.find(".title.d-title").attr("data-jp") || void 0,
          description: slide.find(".synopsis").text().trim() || void 0,
          image: slide.find("img").attr("src") || "",
          url: href.startsWith("http") ? href : `${config.baseUrl}${href}`
        });
      }
    });
    return results;
  };
  var fetchSearchSuggestions = async query => {
    var res = await axios.get(`${config.baseUrl}/ajax/anime/search?keyword=${encodeURIComponent(query)}`, {
      headers: ajaxHeaders()
    });
    var $ = load(res.data?.result?.html || res.data?.result || res.data);
    var suggestions = [];
    $("a.item").each((_, el) => {
      var item = $(el);
      var href = item.attr("href") || "";
      var id = href.match(/\/watch\/([^/?#]+)/)?.[1] ?? "";
      var title = item.find(".name.d-title, .name").text().trim();
      if (id && title) {
        suggestions.push({
          id,
          title,
          japaneseTitle: item.find(".name.d-title").attr("data-jp") || void 0,
          image: item.find(".poster img, img").attr("src") || "",
          url: href
        });
      }
    });
    return suggestions;
  };
  var fetchAnimeInfo = async id => {
    var animeSlug = id.replace(/^\/watch\//, "").replace(/\/.*$/, "");
    var watchUrl = `${config.baseUrl}/watch/${animeSlug}`;
    var {
      data: pageHtml
    } = await axios.get(watchUrl, {
      headers: defaultHeaders
    });
    var $ = load(pageHtml);
    var title = $("#w-info .title.d-title, h1.title").first().text().trim();
    var japaneseTitle = $("#w-info .title.d-title").attr("data-jp") || $("#w-info .names").text().split(";")[1]?.trim() || title;
    var image = $("#w-info .poster img").attr("src") || $('meta[property="og:image"]').attr("content") || "";
    var description = $("#w-info .synopsis .content, .synopsis").text().replace(/\[more\]/g, "").trim();
    var dataId = $("#watch-main").attr("data-id") || $(".layout-page-watchtv").attr("data-id") || $("#w-rating").attr("data-id") || $("[data-id]").first().attr("data-id");
    var type = "TV";
    var premiered;
    var aired;
    var status;
    var genres = [];
    var studios = [];
    var producers = [];
    var duration;
    var rating;
    var linkTexts = (el, list, skip) => $(el).find("a").each((_, a) => {
      var text = $(a).text().trim();
      if (text && text !== skip && !list.includes(text)) list.push(text);
    });
    $("#w-info .bmeta .meta div").each((_, el) => {
      var text = $(el).text();
      var value = $(el).find("span").text().trim();
      if (text.includes("Type:")) type = value;else if (text.includes("Premiered:")) premiered = value;else if (text.includes("Aired:")) aired = value;else if (text.includes("Status:")) status = toMediaStatus(value);else if (text.includes("Genres:")) linkTexts(el, genres);else if (text.includes("Studios:")) linkTexts(el, studios);else if (text.includes("Producers:")) linkTexts(el, producers, "unknown");else if (text.includes("Duration:")) duration = value;else if (text.includes("MAL:")) rating = value ? parseFloat(value) : void 0;
    });
    var episodes = [];
    if (dataId) {
      var epRes = await axios.get(`${config.baseUrl}/ajax/episode/list/${dataId}`, {
        headers: ajaxHeaders(watchUrl)
      });
      var $ep = load(epRes.data?.result || epRes.data);
      $ep("li").each((_, li) => {
        var listItem = $ep(li);
        var anchor = listItem.find("a").first();
        var dataIds = anchor.attr("data-ids") || anchor.attr("data-id") || "";
        var numAttr = anchor.attr("data-num") || anchor.attr("data-slug") || anchor.find("b").text().trim();
        var num = parseInt(numAttr, 10) || 1;
        if (dataIds) {
          episodes.push({
            id: toEpisodeId(animeSlug, dataIds),
            number: num,
            title: listItem.attr("title") || anchor.find(".d-title").text().trim() || `Episode ${num}`,
            url: `${config.baseUrl}/watch/${animeSlug}/ep-${num}`,
            isFiller: anchor.hasClass("filler"),
            isSubbed: anchor.attr("data-sub") === "1",
            isDubbed: anchor.attr("data-dub") === "1"
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
      totalEpisodes: episodes.length > 0 ? episodes.length : void 0,
      episodes
    };
  };
  var fetchEpisodeServers = async function (episodeId) {
    var subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    var dataIds = siteEpisodeId(episodeId) ?? episodeId;
    var targetSubDub = subOrDub === SubOrDubEnum.DUB ? "dub" : "sub";
    var res = await axios.get(`${config.baseUrl}/ajax/server/list?servers=${encodeURIComponent(dataIds)}`, {
      headers: ajaxHeaders()
    });
    var $ = load(res.data?.result || res.data);
    var groups = $(".servers .type[data-type]");
    var serverList = groups.length ? groups.filter(`[data-type="${targetSubDub}"]`).find("li[data-link-id]") : $(".servers li[data-link-id]");
    var servers = [];
    for (var el of serverList.toArray()) {
      var linkId = $(el).attr("data-link-id");
      if (!linkId) continue;
      try {
        var {
          data: linkData
        } = await axios.get(`${config.baseUrl}/ajax/server?get=${encodeURIComponent(linkId)}`, {
          headers: ajaxHeaders()
        });
        var embedUrl = linkData?.result?.url;
        if (embedUrl) servers.push({
          name: serverName("megaplay", $(el).text()),
          url: embedUrl
        });
      } catch {}
    }
    return servers;
  };
  var extractFrom = embedUrl => MegaPlay(ctx).extract(new PolyURL(embedUrl), config.baseUrl);
  var fetchEpisodeSources = async function (episodeId, server) {
    var subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    if (episodeId.startsWith("http")) return extractFrom(episodeId);
    return extractFrom(pickServer(await fetchEpisodeServers(episodeId, subOrDub), server).url);
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