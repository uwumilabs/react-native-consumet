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

// src/providers/anime/helpers.ts
function webViewJson(html, url) {
  var text = (html ?? "").replace(/<[^>]*>/g, "").trim();
  if (!text) throw new Error(`Empty response from ${url}`);
  return JSON.parse(text);
}

// src/providers/anime/animepahe/create-animepahe.ts
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
    SubOrDub: SubOrDubEnum
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
  var challenge;
  var ensureChallengePassed = () => {
    if (!challenge) {
      challenge = makeGetRequestWithWebView(baseUrl, {}).then(() => void 0, err => {
        challenge = void 0;
        throw err;
      });
    }
    return challenge;
  };
  var webViewGet = async (url, headers, parse) => {
    for (var attempt = 1;; attempt++) {
      var html = void 0;
      try {
        html = (await makeGetRequestWithWebView(url, headers)).html ?? "";
      } catch (err) {
        if (attempt < 3 && String(err?.message ?? err).includes("QUIC")) continue;
        throw err;
      }
      try {
        return parse(html);
      } catch (err) {
        if (attempt >= 3) throw err;
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
  };
  var webViewPage = async url => webViewGet(url, {
    Referer: baseUrl
  }, html => load(html));
  var webViewApi = async function (url) {
    var referer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : baseUrl;
    return webViewGet(url, {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": referer
    }, html => webViewJson(html, url));
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
    url: `${baseUrl}/play/${session}/${item.session}`
  });
  var fetchEpisodePage = async (session, page) => webViewApi(`${baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, `${baseUrl}/anime/${session}`);
  var search = async function (query) {
    var _page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    await ensureChallengePassed();
    var data = await webViewApi(`${baseUrl}/api?m=search&q=${encodeURIComponent(query)}`);
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
  };
  var fetchAnimeInfo = async function (id) {
    var episodePage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
    var $ = await webViewPage(`${baseUrl}/anime/${id}`);
    var animeInfo = {
      id,
      title: $("div.title-wrapper > h1 > span").first().text()
    };
    animeInfo.image = $("div.anime-poster a").attr("href");
    var cover = $("div.anime-cover").attr("data-src");
    animeInfo.cover = cover ? `https:${cover}` : void 0;
    animeInfo.description = $("div.anime-summary").text().trim();
    animeInfo.genres = $("div.anime-genre ul li").map((_, el) => $(el).find("a").attr("title")).get();
    animeInfo.hasSub = true;
    animeInfo.status = toMediaStatus($('div.anime-info p:icontains("Status:") a').text());
    animeInfo.type = $('div.anime-info > p:contains("Type:") > a').text().trim().toUpperCase();
    animeInfo.releaseDate = $('div.anime-info > p:contains("Aired:")').text().split("to")[0].replace("Aired:", "").trim();
    animeInfo.studios = $('div.anime-info > p:contains("Studio:")').text().replace("Studio:", "").trim().split("\n");
    animeInfo.totalEpisodes = parseInt($('div.anime-info > p:contains("Episodes:")').text().replace("Episodes:", ""));
    var relatedCard = el => {
      var anchor = $(el).find(".col-2 > a");
      var animeId = anchor.attr("href")?.split("/")[2];
      return {
        id: animeId,
        title: anchor.attr("title"),
        image: $(el).find(".col-2 > a > img").attr("src") || $(el).find(".col-2 > a > img").attr("data-src"),
        url: `${baseUrl}/anime/${animeId}`,
        releaseDate: $(el).find("div.col-9 > a").text().trim(),
        status: toMediaStatus($(el).find("div.col-9 > strong").text())
      };
    };
    animeInfo.recommendations = $("div.anime-recommendation .col-sm-6").toArray().map(relatedCard);
    animeInfo.relations = $("div.anime-relation .col-sm-6").toArray().map(el => ({
      ...relatedCard(el),
      relationType: $(el).find("h4 > span").text().trim()
    }));
    animeInfo.episodes = [];
    if (episodePage < 0) {
      var firstPage = await fetchEpisodePage(id, 1);
      animeInfo.episodePages = firstPage.last_page;
      animeInfo.episodes.push(...firstPage.data.map(item => mapEpisode(id, item)));
      for (var i = 2; i <= firstPage.last_page; i++) {
        animeInfo.episodes.push(...(await fetchEpisodePage(id, i)).data.map(item => mapEpisode(id, item)));
      }
    } else {
      animeInfo.episodes.push(...(await fetchEpisodePage(id, episodePage)).data.map(item => mapEpisode(id, item)));
    }
    return animeInfo;
  };
  var fetchPlayers = async (episodeId, subOrDub) => {
    var $ = await webViewPage(`${baseUrl}/play/${episodeId}`);
    var players = $("div#resolutionMenu > button").toArray().map(el => ({
      name: serverName("kwik", `${$(el).attr("data-fansub")}-${$(el).attr("data-resolution")}`),
      url: $(el).attr("data-src"),
      label: $(el).text(),
      isDub: $(el).attr("data-audio") === "eng"
    })).filter(player => subOrDub === SubOrDubEnum.DUB ? player.isDub : subOrDub === SubOrDubEnum.SUB ? !player.isDub : true);
    var downloads = $("div#pickDownload > a").toArray().map(el => ({
      url: $(el).attr("href"),
      quality: $(el).text()
    }));
    return {
      players,
      downloads
    };
  };
  var fetchEpisodeSources = async function (episodeId, server) {
    var subOrDub = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : SubOrDubEnum.SUB;
    var {
      players,
      downloads
    } = await fetchPlayers(episodeId, subOrDub);
    var iSource = {
      sources: [],
      download: downloads
    };
    for (var player of serversNamed(players, server)) {
      var res = await Kwik(ctx).extract(new PolyURL(player.url), `${baseUrl}/`);
      iSource.headers = res.headers;
      for (var source of res.sources) {
        iSource.sources.push({
          ...source,
          quality: (player.label.match(/(\d{3,4})p/) || [])[0]
        });
      }
    }
    return iSource;
  };
  var fetchEpisodeServers = async function (episodeId) {
    var subOrDub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SubOrDubEnum.SUB;
    var {
      players
    } = await fetchPlayers(episodeId, subOrDub);
    return players.map(_ref2 => {
      var {
        name,
        url
      } = _ref2;
      return {
        name,
        url
      };
    });
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