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

// src/providers/anime/animepahe/create-animepahe.ts
var create_animepahe_exports = {};
__export(create_animepahe_exports, {
  createAnimePahe: () => createAnimePahe
});
module.exports = __toCommonJS(create_animepahe_exports);
function createAnimePahe(ctx, customBaseURL) {
  var {
    load,
    extractors,
    enums,
    createCustomBaseUrl,
    PolyURL,
    NativeConsumet
  } = ctx;
  var {
    Kwik
  } = extractors;
  var {
    makeGetRequestWithWebView
  } = NativeConsumet;
  var {
    StreamingServers: StreamingServersEnum,
    SubOrDub: SubOrDubEnum,
    MediaStatus: MediaStatusEnum
  } = enums;
  var baseUrl = createCustomBaseUrl("https://animepahe.pw", customBaseURL);
  var config = {
    name: "AnimePahe",
    languages: "en",
    classPath: "ANIME.AnimePahe",
    logo: "https://animepahe.pw/web-app-manifest-512x512.png",
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true
  };
  var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
  var _challengePassed = false;
  var ensureChallengePassed = async () => {
    if (_challengePassed) return;
    await makeGetRequestWithWebView(config.baseUrl, {
      "User-Agent": UA
    });
    _challengePassed = true;
  };
  var withRetry = async function (fn) {
    var retries = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    try {
      return await fn();
    } catch (err) {
      var msg = String(err?.message ?? err);
      var isQuic = msg.includes("QUIC") || msg.includes("ERR_QUIC");
      var isJsonOrEmpty = msg.includes("JSON Parse error") || msg.includes("Unexpected token") || msg.includes("Unexpected character") || msg.includes("Empty response");
      if (retries > 0 && (isQuic || isJsonOrEmpty)) {
        if (isJsonOrEmpty) await new Promise(r => setTimeout(r, 800));
        return withRetry(fn, retries - 1);
      }
      throw err;
    }
  };
  var webViewGet = async (url, referer) => {
    return withRetry(async () => {
      var res = await makeGetRequestWithWebView(url, {
        "User-Agent": UA,
        "Referer": referer ?? config.baseUrl
      });
      return res.html ?? "";
    });
  };
  var webViewGetJson = async (url, referer) => {
    return withRetry(async () => {
      var res = await makeGetRequestWithWebView(url, {
        "User-Agent": UA,
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": referer ?? config.baseUrl
      });
      var raw = (res.html ?? "").replace(/<[^>]*>/g, "").trim();
      console.log(raw);
      if (!raw) throw new Error(`[AnimePahe] Empty response from ${url}`);
      return JSON.parse(raw);
    });
  };
  var mapEpisode = (session, item) => ({
    id: `${session}/${item.session}`,
    number: item.episode,
    title: item.title,
    image: item.snapshot,
    duration: item.duration,
    isSubbed: item.audio === "jpn" || item.audio === "eng",
    isDubbed: item.audio === "eng",
    releaseDate: item.created_at,
    url: `${config.baseUrl}/play/${session}/${item.session}`
  });
  var fetchEpisodePage = async (session, page) => {
    var data = await webViewGetJson(`${config.baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, `${config.baseUrl}/anime/${session}`);
    return data.data.map(item => mapEpisode(session, item));
  };
  var search = async function (query) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    try {
      await ensureChallengePassed();
      var data = await webViewGetJson(`${config.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`);
      return {
        results: data.data.map(item => ({
          id: item.session,
          title: item.title,
          image: item.poster,
          rating: item.score,
          releaseDate: item.year,
          type: item.type
        }))
      };
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchAnimeInfo = async function (id) {
    var episodePage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
    var animeInfo = {
      id,
      title: ""
    };
    try {
      var html = await webViewGet(`${config.baseUrl}/anime/${id}`);
      var $ = load(html);
      animeInfo.title = $("div.title-wrapper > h1 > span").first().text();
      animeInfo.image = $("div.anime-poster a").attr("href");
      animeInfo.cover = `https:${$("div.anime-cover").attr("data-src")}`;
      animeInfo.description = $("div.anime-summary").text().trim();
      animeInfo.genres = $("div.anime-genre ul li").map((_, el) => $(el).find("a").attr("title")).get();
      animeInfo.hasSub = true;
      switch ($('div.anime-info p:icontains("Status:") a').text().trim()) {
        case "Currently Airing":
          animeInfo.status = MediaStatusEnum.ONGOING;
          break;
        case "Finished Airing":
          animeInfo.status = MediaStatusEnum.COMPLETED;
          break;
        default:
          animeInfo.status = MediaStatusEnum.UNKNOWN;
      }
      animeInfo.type = $('div.anime-info > p:contains("Type:") > a').text().trim().toUpperCase();
      animeInfo.releaseDate = $('div.anime-info > p:contains("Aired:")').text().split("to")[0].replace("Aired:", "").trim();
      animeInfo.studios = $('div.anime-info > p:contains("Studio:")').text().replace("Studio:", "").trim().split("\n");
      animeInfo.totalEpisodes = parseInt($('div.anime-info > p:contains("Episodes:")').text().replace("Episodes:", ""));
      animeInfo.recommendations = [];
      $("div.anime-recommendation .col-sm-6").each((_, el) => {
        animeInfo.recommendations?.push({
          id: $(el).find(".col-2 > a").attr("href")?.split("/")[2],
          title: $(el).find(".col-2 > a").attr("title"),
          image: $(el).find(".col-2 > a > img").attr("src") || $(el).find(".col-2 > a > img").attr("data-src"),
          url: `${config.baseUrl}/anime/${$(el).find(".col-2 > a").attr("href")?.split("/")[2]}`,
          releaseDate: $(el).find("div.col-9 > a").text().trim(),
          status: $(el).find("div.col-9 > strong").text().trim()
        });
      });
      animeInfo.relations = [];
      $("div.anime-relation .col-sm-6").each((_, el) => {
        animeInfo.relations?.push({
          id: $(el).find(".col-2 > a").attr("href")?.split("/")[2],
          title: $(el).find(".col-2 > a").attr("title"),
          image: $(el).find(".col-2 > a > img").attr("src") || $(el).find(".col-2 > a > img").attr("data-src"),
          url: `${config.baseUrl}/anime/${$(el).find(".col-2 > a").attr("href")?.split("/")[2]}`,
          releaseDate: $(el).find("div.col-9 > a").text().trim(),
          status: $(el).find("div.col-9 > strong").text().trim(),
          relationType: $(el).find("h4 > span").text().trim()
        });
      });
      animeInfo.episodes = [];
      if (episodePage < 0) {
        var firstPage = await webViewGetJson(`${config.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`, `${config.baseUrl}/anime/${id}`);
        animeInfo.episodePages = firstPage.last_page;
        animeInfo.episodes.push(...firstPage.data.map(item => mapEpisode(id, item)));
        for (var i = 2; i <= firstPage.last_page; i++) {
          animeInfo.episodes.push(...(await fetchEpisodePage(id, i)));
        }
      } else {
        animeInfo.episodes.push(...(await fetchEpisodePage(id, episodePage)));
      }
      return animeInfo;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchEpisodeSources = async function (episodeId) {
    var server = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : StreamingServersEnum.Kwik;
    var subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    try {
      var html = await webViewGet(`${config.baseUrl}/play/${episodeId}`);
      var $ = load(html);
      var links = $("div#resolutionMenu > button").map((_, el) => ({
        url: $(el).attr("data-src"),
        quality: $(el).text(),
        audio: $(el).attr("data-audio")
      })).get();
      var downloads = $("div#pickDownload > a").map((_, el) => ({
        url: $(el).attr("href"),
        quality: $(el).text()
      })).get();
      var iSource = {
        headers: {
          Referer: "https://kwik.cx/"
        },
        sources: []
      };
      iSource.download = downloads;
      var filteredLinks = links.filter(link => {
        var isDub = link.audio === "eng";
        if (subOrDub === SubOrDubEnum.DUB) return isDub;
        if (subOrDub === SubOrDubEnum.SUB) return !isDub;
        return true;
      });
      var _loop2 = async function (link) {
        var res = await Kwik(ctx).extract(new PolyURL(link.url), `${config.baseUrl}/`);
        if (res?.sources?.length) {
          res.sources.forEach(source => {
            iSource.sources.push({
              ...source,
              quality: (link.quality.match(/(\d{3,4})p/) || [])[0]
            });
          });
        }
      };
      for (var link of filteredLinks) {
        await _loop2(link);
      }
      return iSource;
    } catch (err) {
      console.log(err);
      throw new Error(err.message);
    }
  };
  var fetchEpisodeServers = async (episodeId, subOrDub) => {
    try {
      var html = await webViewGet(`${config.baseUrl}/play/${episodeId}`);
      var $ = load(html);
      var servers = [];
      $("div#resolutionMenu > button").each((_, el) => {
        var audio = $(el).attr("data-audio");
        var fansub = $(el).attr("data-fansub");
        var src = $(el).attr("data-src");
        var resolution = $(el).attr("data-resolution");
        if (subOrDub === SubOrDubEnum.DUB && audio === "eng" || subOrDub === SubOrDubEnum.SUB && audio !== "eng") {
          servers.push({
            url: src,
            name: `kwik-${fansub}-${resolution}`
          });
        }
      });
      return servers;
    } catch (err) {
      console.log(err);
      throw new Error(err.message);
    }
  };
  return {
    ...config,
    capabilities: {
      aniZipEpisodes: true
    },
    search,
    fetchAnimeInfo,
    fetchEpisodeSources,
    fetchEpisodeServers
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);