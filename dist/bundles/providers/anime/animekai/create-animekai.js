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

// src/providers/anime/animekai/create-animekai.ts
var create_animekai_exports = {};
__export(create_animekai_exports, {
  createAnimeKai: () => createAnimeKai
});
module.exports = __toCommonJS(create_animekai_exports);
function createAnimeKai(ctx, customBaseURL) {
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
    StreamingServers: StreamingServersEnum,
    MediaStatus: MediaStatusEnum,
    SubOrDub: SubOrDubEnum
  } = enums;
  var {
    MegaUp
  } = extractors;
  var baseUrl = createCustomBaseUrl("https://anikai.to", customBaseURL);
  var apiBase = "https://enc-dec.app/api";
  var config = {
    name: "AnimeKai",
    languages: "en",
    classPath: "ANIME.AnimeKai",
    logo: "https://anikai.to/assets/uploads/37585a3ffa8ec292ee9e2255f3f63b48ceca17e5241280b3dc21.png",
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  var buildHeaders = () => ({
    "User-Agent": USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Accept": "text/html, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.5",
    "Sec-GPC": "1",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Priority": "u=0",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "Referer": `${config.baseUrl}/`,
    "Cookie": "__p_mov=1; usertype=guest; session=vLrU4aKItp0QltI2asH83yugyWDsSSQtyl9sxWKO"
  });
  var normalizePage = function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return page <= 0 ? 1 : page;
  };
  var scrapeCard = async $ => {
    var results = [];
    $(".aitem").each((_, element) => {
      var card = $(element);
      var anchor = card.find("div.inner > a");
      var id = anchor.attr("href")?.replace("/watch/", "");
      if (!id) return;
      var infoElements = card.find(".info").children();
      var type = infoElements.last()?.text().trim();
      results.push({
        id,
        title: anchor.text().trim(),
        url: `${config.baseUrl}${anchor.attr("href")}`,
        image: card.find("img")?.attr("data-src") ?? card.find("img")?.attr("src") ?? void 0,
        japaneseTitle: card.find("a.title")?.attr("data-jp")?.trim(),
        type: type ?? void 0,
        sub: parseInt(card.find(".info span.sub")?.text() || "0", 10),
        dub: parseInt(card.find(".info span.dub")?.text() || "0", 10),
        episodes: parseInt(infoElements.eq(-2).text().trim() || card.find(".info span.sub")?.text() || "0", 10) || 0
      });
    });
    return results;
  };
  var scrapeCardPage = async url => {
    var res = {
      currentPage: 0,
      hasNextPage: false,
      totalPages: 0,
      results: []
    };
    var {
      data
    } = await axios.get(url, {
      headers: buildHeaders()
    });
    var $ = load(data);
    var pagination = $("ul.pagination");
    res.currentPage = parseInt(pagination.find(".page-item.active span.page-link").text().trim(), 10) || 0;
    var nextHref = pagination.find(".page-item.active").next().find("a.page-link").attr("href");
    res.hasNextPage = Boolean(nextHref && nextHref.includes("page="));
    var totalHref = pagination.find(".page-item:last-child a.page-link").attr("href");
    res.totalPages = totalHref && totalHref.includes("page=") ? parseInt(totalHref.split("page=")[1] ?? "0", 10) || 0 : res.currentPage;
    res.results = await scrapeCard($);
    if (res.results.length === 0) {
      res.currentPage = 0;
      res.hasNextPage = false;
      res.totalPages = 0;
    }
    return res;
  };
  var search = async function (query) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var normalizedPage = normalizePage(page);
    var sanitizedQuery = query.replace(/[^\w]+/g, "+");
    return scrapeCardPage(`${config.baseUrl}/browser?keyword=${sanitizedQuery}&page=${normalizedPage}`);
  };
  var fetchLatestCompleted = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage(`${config.baseUrl}/completed?page=${normalizePage(page)}`);
  };
  var fetchRecentlyAdded = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage(`${config.baseUrl}/recent?page=${normalizePage(page)}`);
  };
  var fetchRecentlyUpdated = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage(`${config.baseUrl}/updates?page=${normalizePage(page)}`);
  };
  var fetchNewReleases = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage(`${config.baseUrl}/new-releases?page=${normalizePage(page)}`);
  };
  var fetchMovie = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage(`${config.baseUrl}/movie?page=${normalizePage(page)}`);
  };
  var fetchTV = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage(`${config.baseUrl}/tv?page=${normalizePage(page)}`);
  };
  var fetchOVA = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage(`${config.baseUrl}/ova?page=${normalizePage(page)}`);
  };
  var fetchONA = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage(`${config.baseUrl}/ona?page=${normalizePage(page)}`);
  };
  var fetchSpecial = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return scrapeCardPage(`${config.baseUrl}/special?page=${normalizePage(page)}`);
  };
  var fetchGenres = async () => {
    var genres = [];
    var {
      data
    } = await axios.get(`${config.baseUrl}/home`, {
      headers: buildHeaders()
    });
    var $ = load(data);
    $("#menu").find("ul.c4 li a").each((_, element) => {
      var genreText = $(element).text().toLowerCase();
      if (genreText) genres.push(genreText);
    });
    return genres;
  };
  var genreSearch = async function (genre) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    if (!genre) {
      throw new Error("genre is empty");
    }
    return scrapeCardPage(`${config.baseUrl}/genres/${genre}?page=${normalizePage(page)}`);
  };
  var fetchSchedule = async function () {
    var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (/* @__PURE__ */new Date()).toISOString().split("T")[0];
    var res = {
      results: []
    };
    var scheduleUnix = Math.floor((/* @__PURE__ */new Date(`${date}T00:00:00Z`)).getTime() / 1e3);
    var {
      data
    } = await axios.get(`${config.baseUrl}/ajax/schedule/items?tz=5.5&time=${scheduleUnix}`, {
      headers: buildHeaders()
    });
    var $ = load(data.result);
    $("ul.collapsed li").each((_, element) => {
      var card = $(element);
      var titleElement = card.find("span.title");
      var episodeText = card.find("span").last().text().trim();
      var id = card.find("a").attr("href")?.split("/")[2] ?? "";
      if (!id) return;
      res.results.push({
        id,
        title: titleElement.text().trim(),
        japaneseTitle: titleElement.attr("data-jp") || void 0,
        airingTime: card.find("span.time").text().trim(),
        airingEpisode: episodeText.replace("EP ", "")
      });
    });
    return res;
  };
  var fetchSpotlight = async () => {
    var res = {
      results: []
    };
    var {
      data
    } = await axios.get(`${config.baseUrl}/home`, {
      headers: buildHeaders()
    });
    var $ = load(data);
    $("div.swiper-wrapper > div.swiper-slide").each((_, element) => {
      var card = $(element);
      var titleElement = card.find("div.detail > p.title");
      var id = card.find("div.swiper-ctrl > a.btn").attr("href")?.replace("/watch/", "") || "";
      if (!id) return;
      var infoElements = card.find("div.detail > div.info").children();
      res.results.push({
        id,
        title: titleElement.text(),
        japaneseTitle: titleElement.attr("data-jp") || void 0,
        banner: card.attr("style")?.match(/background-image:\s*url\(["']?(.+?)["']?\)/)?.[1] || null,
        url: `${config.baseUrl}/watch/${id}`,
        type: infoElements.eq(-2).text().trim(),
        genres: infoElements.last().text().trim().split(",").map(genre => genre.trim()),
        releaseDate: card.find('div.detail > div.mics > div:contains("Release") span').text().trim(),
        quality: card.find('div.detail > div.mics > div:contains("Quality") span').text().trim(),
        sub: parseInt(card.find("div.detail > div.info > span.sub").text().trim() || "0", 10),
        dub: parseInt(card.find("div.detail > div.info > span.dub").text().trim() || "0", 10),
        description: card.find("div.detail > p.desc").text().trim()
      });
    });
    return res;
  };
  var fetchSearchSuggestions = async query => {
    var {
      data
    } = await axios.get(`${config.baseUrl}/ajax/anime/search?keyword=${query.replace(/[^\w]+/g, "+")}`, {
      headers: buildHeaders()
    });
    var $ = load(data.result.html);
    var res = {
      results: []
    };
    $("a.aitem").each((_, element) => {
      var card = $(element);
      var id = card.attr("href")?.split("/")[2];
      if (!id) return;
      var infoElements = card.find(".info").children();
      var titleElement = card.find(".title");
      res.results.push({
        id,
        title: titleElement.text().trim(),
        url: `${config.baseUrl}/watch/${id}`,
        image: card.find(".poster img").attr("src") || void 0,
        japaneseTitle: titleElement.attr("data-jp") || void 0,
        type: infoElements.eq(-3).text().trim(),
        year: infoElements.eq(-2).text().trim(),
        sub: parseInt(card.find(".info span.sub")?.text() || "0", 10),
        dub: parseInt(card.find(".info span.dub")?.text() || "0", 10),
        episodes: parseInt(infoElements.eq(-4).text().trim() || card.find(".info span.sub")?.text() || "0", 10) || 0
      });
    });
    return res;
  };
  var fetchAnimeInfo = async id => {
    var info = {
      id,
      title: ""
    };
    var {
      data
    } = await axios.get(`${config.baseUrl}/watch/${id}`, {
      headers: buildHeaders()
    });
    var $ = load(data);
    info.title = $(".entity-scroll > .title").text().trim();
    info.japaneseTitle = $(".entity-scroll > .title").attr("data-jp")?.trim();
    info.image = $("div.poster > div > img").attr("src");
    info.description = $(".entity-scroll > .desc").text().trim();
    info.type = $(".entity-scroll > .info").children().last().text().trim().toUpperCase();
    info.url = `${config.baseUrl}/watch/${id}`;
    info.recommendations = [];
    $("section.sidebar-section:not(#related-anime) .aitem-col .aitem").each((_, element) => {
      var card = $(element);
      var recommendationId = card.attr("href")?.replace("/watch/", "");
      if (!recommendationId) return;
      info.recommendations?.push({
        id: recommendationId,
        title: card.find(".title").text().trim(),
        url: `${config.baseUrl}${card.attr("href")}`,
        image: card.attr("style")?.match(/background-image:\s*url\('(.+?)'\)/)?.[1] ?? void 0,
        japaneseTitle: card.find(".title").attr("data-jp")?.trim(),
        type: card.find(".info").children().last().text().trim(),
        sub: parseInt(card.find(".info span.sub")?.text() || "0", 10),
        dub: parseInt(card.find(".info span.dub")?.text() || "0", 10),
        episodes: parseInt(card.find(".info").children().eq(-2).text().trim() || card.find(".info span.sub")?.text() || "0", 10) || 0
      });
    });
    info.relations = [];
    $("section#related-anime .tab-body .aitem-col").each((_, element) => {
      var card = $(element);
      var relationAnchor = card.find("a.aitem");
      var relationId = relationAnchor.attr("href")?.replace("/watch/", "");
      if (!relationId) return;
      info.relations?.push({
        id: relationId,
        title: relationAnchor.find(".title").text().trim(),
        url: `${config.baseUrl}${relationAnchor.attr("href")}`,
        image: relationAnchor.attr("style")?.match(/background-image:\s*url\('(.+?)'\)/)?.[1] ?? void 0,
        japaneseTitle: relationAnchor.find(".title").attr("data-jp")?.trim(),
        type: card.find(".info").children().eq(-2).text().trim(),
        sub: parseInt(card.find(".info span.sub")?.text() || "0", 10),
        dub: parseInt(card.find(".info span.dub")?.text() || "0", 10),
        relationType: card.find(".info").children().last().text().trim(),
        episodes: parseInt(card.find(".info").children().eq(-3).text().trim() || card.find(".info span.sub")?.text() || "0", 10) || 0
      });
    });
    var hasSub = $(".entity-scroll > .info > span.sub").length > 0;
    var hasDub = $(".entity-scroll > .info > span.dub").length > 0;
    if (hasSub && hasDub) {
      info.subOrDub = SubOrDubEnum.BOTH;
    } else if (hasSub) {
      info.subOrDub = SubOrDubEnum.SUB;
    } else if (hasDub) {
      info.subOrDub = SubOrDubEnum.DUB;
    }
    info.hasSub = hasSub;
    info.hasDub = hasDub;
    info.genres = [];
    $(".entity-scroll > .detail").find("div:contains('Genres')").each(function () {
      var genre = $(this).text().trim();
      if (genre) info.genres?.push(genre);
    });
    var statusText = $(".entity-scroll > .detail").find("div:contains('Status') > span").text().trim();
    switch (statusText) {
      case "Completed":
        info.status = MediaStatusEnum.COMPLETED;
        break;
      case "Releasing":
        info.status = MediaStatusEnum.ONGOING;
        break;
      case "Not yet aired":
        info.status = MediaStatusEnum.NOT_YET_AIRED;
        break;
      default:
        info.status = MediaStatusEnum.UNKNOWN;
        break;
    }
    info.season = $(".entity-scroll > .detail").find("div:contains('Premiered') > span").text().trim();
    var totalEpisodes = $("div.eplist > ul > li").length;
    info.totalEpisodes = totalEpisodes;
    var aniId = $(".rate-box#anime-rating").attr("data-id");
    if (!aniId) {
      throw new Error("Failed to locate anime id");
    }
    var episodeToken = await GenerateToken(aniId);
    var episodesResponse = await axios.get(`${config.baseUrl}/ajax/episodes/list?ani_id=${aniId}&_=${episodeToken}`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `${config.baseUrl}/watch/${id}`,
        ...buildHeaders()
      }
    });
    var $$ = load(episodesResponse.data.result);
    var subCount = parseInt($(".entity-scroll > .info > span.sub").text().trim() || "0", 10);
    var dubCount = parseInt($(".entity-scroll > .info > span.dub").text().trim() || "0", 10);
    info.episodes = [];
    $$("div.eplist > ul > li > a").each((_, element) => {
      var el = $$(element);
      var href = `${el.attr("href")}ep=${el.attr("num")}` || "";
      var number = parseInt(el.attr("data-number") || "0", 10);
      var token = el.attr("token");
      if (!token) return;
      var epId = `${info.id}$ep=${el.attr("num")}$token=${token}`;
      info.episodes?.push({
        id: epId,
        number,
        title: el.children("span").text().trim(),
        isFiller: el.hasClass("filler"),
        isSubbed: number <= subCount,
        isDubbed: number <= dubCount,
        url: `${config.baseUrl}${href}`
      });
    });
    return info;
  };
  var fetchEpisodeServers = async function (episodeId) {
    var subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    var requestUrl = episodeId;
    if (!episodeId.startsWith(`${config.baseUrl}/ajax`)) {
      var token = episodeId.split("$token=")[1];
      if (!token) {
        throw new Error("Invalid episodeId format: missing token");
      }
      var listToken = await GenerateToken(token);
      requestUrl = `${config.baseUrl}/ajax/links/list?token=${token}&_=${listToken}`;
    }
    var {
      data
    } = await axios.get(requestUrl, {
      headers: buildHeaders()
    });
    var $ = load(data.result);
    var servers = [];
    var serverGroups = subOrDub === SubOrDubEnum.SUB ? [{
      selector: '.server-items.lang-group[data-id="sub"] .server',
      type: "hardsub"
    }, {
      selector: '.server-items.lang-group[data-id="softsub"] .server',
      type: "softsub"
    }] : [{
      selector: '.server-items.lang-group[data-id="dub"] .server',
      type: "dub"
    }];
    var serverPromises = [];
    var _loop2 = async function (group) {
      $(group.selector).each((_, server) => {
        var serverId = $(server).attr("data-lid");
        if (!serverId) return;
        var serverName = $(server).text().trim();
        var serverType = group.type;
        serverPromises.push((async () => {
          var viewToken = await GenerateToken(serverId);
          var {
            data: linkData
          } = await axios.get(`${config.baseUrl}/ajax/links/view?id=${serverId}&_=${viewToken}`, {
            headers: buildHeaders()
          });
          var decoded = await DecodeIframeData(linkData.result);
          servers.push({
            name: `megaup ${serverName}-${serverType}`.toLowerCase(),
            url: decoded.url,
            intro: {
              start: decoded.skip.intro[0],
              end: decoded.skip.intro[1]
            },
            outro: {
              start: decoded.skip.outro[0],
              end: decoded.skip.outro[1]
            }
          });
        })());
      });
    };
    for (var group of serverGroups) {
      await _loop2(group);
    }
    await Promise.all(serverPromises);
    return servers;
  };
  var fetchEpisodeSources = async function (episodeId) {
    var server = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : StreamingServersEnum.MegaUp;
    var subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    if (episodeId.startsWith("http")) {
      var serverUrl = new PolyURL(episodeId);
      switch (server) {
        case StreamingServersEnum.MegaUp:
          return {
            headers: {
              Referer: serverUrl.href
            },
            ...(await MegaUp(ctx).extract(serverUrl)),
            download: serverUrl.href.replace(/\/e\//, "/download/")
          };
        default:
          return {
            headers: {
              Referer: serverUrl.href
            },
            ...(await MegaUp(ctx).extract(serverUrl)),
            download: serverUrl.href.replace(/\/e\//, "/download/")
          };
      }
    }
    try {
      var servers = await fetchEpisodeServers(episodeId, subOrDub);
      var i = servers.findIndex(s => s.name.includes(server.toLowerCase()));
      if (i === -1) {
        throw new Error(`Server ${server} not found. Available servers: ${servers.map(s => s.name).join(", ")}`);
      }
      var _serverUrl = new URL(servers[i].url);
      var sources = await fetchEpisodeSources(_serverUrl.href, server, subOrDub);
      sources.intro = servers[i]?.intro;
      sources.outro = servers[i]?.outro;
      return sources;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var GenerateToken = async text => {
    try {
      var {
        data
      } = await axios.get(`${apiBase}/enc-kai`, {
        params: {
          text
        }
      });
      return data.result;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  var DecodeIframeData = async payload => {
    try {
      var {
        data
      } = await axios.post(`${apiBase}/dec-kai`, {
        text: payload
      });
      return data.result;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  return {
    ...config,
    capabilities: {
      aniZipEpisodes: true
    },
    search,
    fetchLatestCompleted,
    fetchRecentlyAdded,
    fetchRecentlyUpdated,
    fetchNewReleases,
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
    fetchEpisodeSources,
    fetchEpisodeServers
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);