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
function createAniKoto(ctx, customBaseURL) {
  var {
    axios,
    load,
    extractors,
    enums,
    createCustomBaseUrl,
    PolyURL
  } = ctx;
  var {
    MegaPlay
  } = extractors;
  var {
    StreamingServers: StreamingServersEnum,
    SubOrDub: SubOrDubEnum,
    MediaStatus: MediaStatusEnum
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };
  var ajaxHeaders = referer => ({
    ...defaultHeaders,
    "X-Requested-With": "XMLHttpRequest",
    "Referer": referer || config.baseUrl
  });
  var normalizePageNumber = page => {
    return page <= 0 ? 1 : page;
  };
  var scrapeCardPage = async function (url) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    try {
      var {
        data
      } = await axios.get(url, {
        headers: defaultHeaders
      });
      var $ = load(data);
      var results = [];
      $(".item").each((_, el) => {
        var item = $(el);
        var nameEl = item.find(".name.d-title, .name").first();
        var title = nameEl.text().trim();
        var japaneseTitle = nameEl.attr("data-jp") || void 0;
        var href = item.find("a.name, .poster a").first().attr("href") || "";
        var match = href.match(/\/watch\/([^/?#]+)/);
        var id = match ? match[1] : href.replace(/^.*\/watch\//, "").replace(/\/.*$/, "");
        var image = item.find(".poster img, img").attr("src") || "";
        var subText = item.find(".ep-status.sub").first().text().trim();
        var sub = parseInt(subText, 10) || 0;
        var dubText = item.find(".ep-status.dub").first().text().trim();
        var dub = parseInt(dubText, 10) || 0;
        var type = item.find(".meta .right").first().text().trim() || "TV";
        var ratingStr = item.find(".m-item.rated span").first().text().trim();
        var rating = ratingStr ? parseFloat(ratingStr) : void 0;
        if (id && title) {
          results.push({
            id,
            title,
            japaneseTitle,
            image,
            url: href.startsWith("http") ? href : `${config.baseUrl}${href.startsWith("/") ? "" : "/"}${href}`,
            type,
            sub,
            dub,
            rating
          });
        }
      });
      var hasNextPage = $('.pagination .page-item .page-link[rel="next"]').length > 0 || $(".pagination .page-item.active").next(".page-item").find(".page-link").length > 0;
      var lastPageHref = $('.pagination .page-item a[title="Last"]').attr("href") || "";
      var lastPageMatch = lastPageHref.match(/page=(\d+)/);
      var totalPages = lastPageMatch ? parseInt(lastPageMatch[1], 10) : void 0;
      return {
        currentPage: page,
        hasNextPage,
        totalPages,
        results
      };
    } catch (err) {
      throw new Error(`[AniKoto] Failed to scrape card page: ${err.message}`);
    }
  };
  var search = async function (query) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${normalizedPage}`, normalizedPage);
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
    var normalizedPage = normalizePageNumber(page);
    var params = new URLSearchParams();
    params.set("page", String(normalizedPage));
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (rated) params.set("rated", rated);
    if (score) params.set("score", String(score));
    if (season) params.set("season", season);
    if (language) params.set("language", language);
    if (sort) params.set("sort", sort);
    if (genres && genres.length > 0) {
      for (var g of genres) {
        params.append("genres[]", g);
      }
    }
    return scrapeCardPage(`${config.baseUrl}/filter?${params.toString()}`, normalizedPage);
  };
  var fetchTopAiring = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/status/currently-airing?page=${normalizedPage}`, normalizedPage);
  };
  var fetchMostPopular = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/most-viewed?page=${normalizedPage}`, normalizedPage);
  };
  var fetchMostFavorite = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/filter?sort=most_favorite&page=${normalizedPage}`, normalizedPage);
  };
  var fetchLatestCompleted = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/status/finished-airing?page=${normalizedPage}`, normalizedPage);
  };
  var fetchRecentlyUpdated = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/latest-updated?page=${normalizedPage}`, normalizedPage);
  };
  var fetchRecentlyAdded = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/new-release?page=${normalizedPage}`, normalizedPage);
  };
  var fetchTopUpcoming = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/status/not-yet-aired?page=${normalizedPage}`, normalizedPage);
  };
  var fetchStudio = async function (studioId) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/studio/${studioId}?page=${normalizedPage}`, normalizedPage);
  };
  var fetchSubbedAnime = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/filter?language=1&page=${normalizedPage}`, normalizedPage);
  };
  var fetchDubbedAnime = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/filter?language=2&page=${normalizedPage}`, normalizedPage);
  };
  var fetchMovie = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/movie?page=${normalizedPage}`, normalizedPage);
  };
  var fetchTV = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/tv?page=${normalizedPage}`, normalizedPage);
  };
  var fetchOVA = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/ova?page=${normalizedPage}`, normalizedPage);
  };
  var fetchONA = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/ona?page=${normalizedPage}`, normalizedPage);
  };
  var fetchSpecial = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var normalizedPage = normalizePageNumber(page);
    return scrapeCardPage(`${config.baseUrl}/type/special?page=${normalizedPage}`, normalizedPage);
  };
  var fetchGenres = async () => {
    try {
      var {
        data
      } = await axios.get(`${config.baseUrl}/home`, {
        headers: defaultHeaders
      });
      var $ = load(data);
      var genres = [];
      $('a[href*="/genre/"]').each((_, el) => {
        var g = $(el).text().trim();
        if (g && !genres.includes(g)) {
          genres.push(g);
        }
      });
      return genres.length > 0 ? genres : ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Supernatural"];
    } catch {
      return ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Supernatural"];
    }
  };
  var genreSearch = async function (genre) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var normalizedPage = normalizePageNumber(page);
    var cleanGenre = genre.toLowerCase().replace(/\s+/g, "-");
    return scrapeCardPage(`${config.baseUrl}/genre/${cleanGenre}?page=${normalizedPage}`, normalizedPage);
  };
  var fetchSchedule = async date => {
    try {
      var res = await axios.get(`${config.baseUrl}/ajax/schedule/date?date=${date}&tzOffset=-330`, {
        headers: ajaxHeaders()
      });
      var html = res.data?.result || res.data;
      var $ = load(html);
      var results = [];
      $("a.item").each((_, el) => {
        var item = $(el);
        var href = item.attr("href") || "";
        var match = href.match(/\/watch\/([^/?#]+)/);
        var id = match ? match[1] : href;
        var title = item.find(".title.d-title, .title").text().trim();
        var time = item.find(".time").text().trim();
        var episodeText = item.find(".ep span").text().trim();
        if (id && title) {
          results.push({
            id,
            title,
            url: href,
            time,
            episodeText
          });
        }
      });
      return results;
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch schedule: ${err.message}`);
    }
  };
  var fetchSpotlight = async () => {
    try {
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
        var japaneseTitle = slide.find(".title.d-title").attr("data-jp") || void 0;
        var href = slide.find('a[href*="/watch/"]').first().attr("href") || "";
        var match = href.match(/\/watch\/([^/?#]+)/);
        var id = match ? match[1] : "";
        var description = slide.find(".synopsis").text().trim() || void 0;
        var image = slide.find("img").attr("src") || "";
        if (id && title) {
          results.push({
            id,
            title,
            japaneseTitle,
            description,
            image,
            url: href.startsWith("http") ? href : `${config.baseUrl}${href}`
          });
        }
      });
      return results;
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch spotlight: ${err.message}`);
    }
  };
  var fetchSearchSuggestions = async query => {
    try {
      var res = await axios.get(`${config.baseUrl}/ajax/anime/search?keyword=${encodeURIComponent(query)}`, {
        headers: ajaxHeaders()
      });
      var html = res.data?.result?.html || res.data?.result || res.data;
      var $ = load(html);
      var suggestions = [];
      $("a.item").each((_, el) => {
        var item = $(el);
        var href = item.attr("href") || "";
        var match = href.match(/\/watch\/([^/?#]+)/);
        var id = match ? match[1] : "";
        var title = item.find(".name.d-title, .name").text().trim();
        var japaneseTitle = item.find(".name.d-title").attr("data-jp") || void 0;
        var image = item.find(".poster img, img").attr("src") || "";
        if (id && title) {
          suggestions.push({
            id,
            title,
            japaneseTitle,
            image,
            url: href
          });
        }
      });
      return suggestions;
    } catch {
      return [];
    }
  };
  var fetchAnimeInfo = async id => {
    try {
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
      var status = MediaStatusEnum.UNKNOWN;
      var genres = [];
      var studios = [];
      var producers = [];
      var duration;
      var rating;
      $("#w-info .bmeta .meta div").each((_, el) => {
        var text = $(el).text();
        if (text.includes("Type:")) {
          type = $(el).find("span").text().trim();
        } else if (text.includes("Premiered:")) {
          premiered = $(el).find("span").text().trim();
        } else if (text.includes("Aired:")) {
          aired = $(el).find("span").text().trim();
        } else if (text.includes("Status:")) {
          var s = $(el).find("span").text().trim().toLowerCase();
          if (s.includes("finished")) status = MediaStatusEnum.COMPLETED;else if (s.includes("airing") || s.includes("ongoing")) status = MediaStatusEnum.ONGOING;else if (s.includes("not yet")) status = MediaStatusEnum.NOT_YET_AIRED;
        } else if (text.includes("Genres:")) {
          $(el).find("a").each((_2, a) => {
            var g = $(a).text().trim();
            if (g && !genres.includes(g)) genres.push(g);
          });
        } else if (text.includes("Studios:")) {
          $(el).find("a").each((_2, a) => {
            var st = $(a).text().trim();
            if (st && !studios.includes(st)) studios.push(st);
          });
        } else if (text.includes("Producers:")) {
          $(el).find("a").each((_2, a) => {
            var pr = $(a).text().trim();
            if (pr && pr !== "unknown" && !producers.includes(pr)) producers.push(pr);
          });
        } else if (text.includes("Duration:")) {
          duration = $(el).find("span").text().trim();
        } else if (text.includes("MAL:")) {
          var r = $(el).find("span").text().trim();
          rating = r ? parseFloat(r) : void 0;
        }
      });
      var episodes = [];
      if (dataId) {
        try {
          var epRes = await axios.get(`${config.baseUrl}/ajax/episode/list/${dataId}`, {
            headers: ajaxHeaders(watchUrl)
          });
          var epHtml = epRes.data?.result || epRes.data;
          var $ep = load(epHtml);
          $ep("li").each((_, li) => {
            var listItem = $ep(li);
            var anchor = listItem.find("a").first();
            var dataIds = anchor.attr("data-ids") || anchor.attr("data-id") || "";
            var numAttr = anchor.attr("data-num") || anchor.attr("data-slug") || anchor.find("b").text().trim();
            var num = parseInt(numAttr, 10) || 1;
            var epTitle = listItem.attr("title") || anchor.find(".d-title").text().trim() || `Episode ${num}`;
            var isFiller = anchor.hasClass("filler");
            var isSubbed = anchor.attr("data-sub") === "1";
            var isDubbed = anchor.attr("data-dub") === "1";
            if (dataIds) {
              episodes.push({
                id: `${animeSlug}$episode$${dataIds}`,
                number: num,
                title: epTitle,
                url: `${config.baseUrl}/watch/${animeSlug}/ep-${num}`,
                isFiller,
                isSubbed,
                isDubbed
              });
            }
          });
        } catch {}
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
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch anime info: ${err.message}`);
    }
  };
  var fetchEpisodeServers = async function (episodeId) {
    var subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    try {
      var dataIds = episodeId.includes("$episode$") ? episodeId.split("$episode$")[1] : episodeId;
      var targetSubDub = subOrDub === SubOrDubEnum.DUB ? "dub" : "sub";
      var res = await axios.get(`${config.baseUrl}/ajax/server/list?servers=${encodeURIComponent(dataIds)}`, {
        headers: ajaxHeaders()
      });
      var html = res.data?.result || res.data;
      var $ = load(html);
      var rawServers = [];
      var serverList = $(`.servers .type[data-type="${targetSubDub}"] li[data-link-id]`);
      if (!serverList.length) {
        serverList = $(".servers li[data-link-id]");
      }
      serverList.each((_, el) => {
        var item = $(el);
        var name = item.text().trim();
        var linkId = item.attr("data-link-id");
        if (linkId) {
          rawServers.push({
            name,
            linkId
          });
        }
      });
      var servers = [];
      for (var s of rawServers) {
        try {
          var {
            data: linkData
          } = await axios.get(`${config.baseUrl}/ajax/server?get=${encodeURIComponent(s.linkId)}`, {
            headers: ajaxHeaders()
          });
          var embedUrl = linkData?.result?.url;
          if (embedUrl) {
            servers.push({
              name: `megaplay-${s.name.toLowerCase().replace(/[^a-z0-9_-]/g, "")}`,
              url: embedUrl
            });
          }
        } catch {}
      }
      return servers;
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch episode servers: ${err.message}`);
    }
  };
  var fetchEpisodeSources = async function (episodeId) {
    var server = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : StreamingServersEnum.MegaPlay;
    var subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    if (episodeId.startsWith("http")) {
      var serverUrl = new PolyURL(episodeId);
      switch (server) {
        case StreamingServersEnum.MegaPlay:
        default:
          return {
            headers: {
              Referer: serverUrl.href
            },
            ...(await MegaPlay(ctx).extract(serverUrl, config.baseUrl))
          };
      }
    }
    try {
      var servers = await fetchEpisodeServers(episodeId, subOrDub);
      if (!servers.length) {
        throw new Error(`[AniKoto] No servers available for episode: ${episodeId}`);
      }
      var matchedServer = servers.find(s => s.name.toLowerCase().includes(String(server).toLowerCase())) || servers[0];
      var _serverUrl = new PolyURL(matchedServer.url);
      return {
        headers: {
          Referer: _serverUrl.href
        },
        ...(await MegaPlay(ctx).extract(_serverUrl, config.baseUrl))
      };
    } catch (err) {
      throw new Error(`[AniKoto] Failed to fetch episode sources: ${err.message}`);
    }
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
if (module.exports !== exports) Object.assign(exports, module.exports);