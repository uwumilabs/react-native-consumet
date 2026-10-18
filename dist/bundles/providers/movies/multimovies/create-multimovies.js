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

// src/providers/movies/multimovies/create-multimovies.ts
var create_multimovies_exports = {};
__export(create_multimovies_exports, {
  createMultiMovies: () => createMultiMovies
});
module.exports = __toCommonJS(create_multimovies_exports);
function createMultiMovies(ctx, customBaseURL) {
  var {
    load,
    extractors,
    enums,
    axios,
    createCustomBaseUrl,
    PolyURL,
    USER_AGENT,
    NativeConsumet
  } = ctx;
  var {
    StreamWish,
    VidHide
  } = extractors;
  var {
    StreamingServers: StreamingServersEnum,
    TvType: TvTypeEnum
  } = enums;
  var {
    makePostRequest
  } = NativeConsumet;
  var baseUrl = createCustomBaseUrl("https://multimovies.center", customBaseURL);
  var config = {
    name: "MultiMovies",
    languages: "all",
    classPath: "MOVIES.MultiMovies",
    logo: `${baseUrl}/wp-content/uploads/2024/01/cropped-CompressJPEG.online_512x512_image.png`,
    baseUrl,
    isNSFW: false,
    isWorking: true
  };
  var supportedTypes = /* @__PURE__ */new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);
  var search = async function (query) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var searchResult = {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    try {
      var url;
      if (page === 1) {
        url = `${config.baseUrl}/?s=${query.replace(/[\W_]+/g, "+")}`;
      } else {
        url = `${config.baseUrl}/page/${page}/?s=${query.replace(/[\W_]+/g, "+")}`;
      }
      var {
        data
      } = await axios.get(url);
      var $ = load(data);
      var navSelector = "div.pagination";
      searchResult.hasNextPage = $(navSelector).find("#nextpagination").length > 0;
      var articles = $(".search-page .result-item article").toArray();
      await Promise.all(articles.map(async el => {
        var seasonSet = /* @__PURE__ */new Set();
        var href = $(el).find(".thumbnail a").attr("href")?.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/|\/$/g, "") ?? "";
        var episodesInfo = await fetchMediaInfo(href);
        var episodes = episodesInfo?.episodes || [];
        for (var episode of episodes) {
          if (episode.season != null) {
            seasonSet.add(episode.season);
          }
        }
        searchResult.results.push({
          id: href,
          title: $(el).find(".details .title a").text().trim(),
          url: $(el).find(".thumbnail a").attr("href") ?? "",
          image: $(el).find(".thumbnail img").attr("src") ?? "",
          rating: parseFloat($(el).find(".meta .rating").text().replace("IMDb ", "")) || 0,
          releaseDate: $(el).find(".meta .year").text().trim(),
          seasons: seasonSet.size,
          description: $(el).find(".contenido p").text().trim(),
          type: $(el).find(".thumbnail a").attr("href")?.includes("/movies/") ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES
        });
      }));
      return searchResult;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchMediaInfo = async mediaId => {
    if (!mediaId.startsWith(config.baseUrl)) {
      mediaId = `${config.baseUrl}/${mediaId}`;
    }
    var movieInfo = {
      id: mediaId.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/|\/$/g, ""),
      title: "",
      url: mediaId
    };
    try {
      var {
        data
      } = await axios.get(mediaId);
      var $ = load(data);
      var recommendationsArray = [];
      $("div#single_relacionados  article").each((i, el) => {
        recommendationsArray.push({
          id: $(el).find("a").attr("href")?.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/|\/$/g, ""),
          title: $(el).find("a img").attr("alt"),
          image: $(el).find("a img").attr("data-src") ?? $(el).find("a img").attr("src"),
          type: $(el).find(".thumbnail a").attr("href")?.includes("/movies/") ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE ?? null
        });
      });
      movieInfo.cover = $("div#info .galeria").first().find(".g-item a").attr("href")?.trim() ?? "";
      movieInfo.title = $(".sheader > .data > h1").text();
      movieInfo.image = $(".sheader > .poster > img").attr("src") ?? $(".sheader > .poster > img").attr("data-src");
      movieInfo.description = $('div#info div[itemprop="description"] p').text();
      movieInfo.type = movieInfo.id.split("/")[0] === "tvshows" ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE;
      movieInfo.releaseDate = $(".sheader > .data > .extra > span.date").text().trim();
      movieInfo.trailer = {
        id: $("div#trailer .embed  iframe").attr("data-litespeed-src")?.split("embed/")[1]?.split("?")[0] ?? $("div#trailer .embed  iframe").attr("src")?.split("embed/")[1]?.split("?")[0],
        url: $("div#trailer .embed iframe").attr("data-litespeed-src") ?? $("div#trailer .embed iframe").attr("src")
      };
      movieInfo.genres = $(".sgeneros a").map((i, el) => $(el).text()).get().map(v => v.trim());
      movieInfo.characters = [];
      $("div#cast .persons .person").each((i, el) => {
        var url = $(el).find(".img > a").attr("href");
        var image = $(el).find(".img > a > img").attr("data-src") ?? $(el).find(".img > a > img").attr("src");
        var name = $(el).find(".data > .name > a").text();
        var character = $(el).find(".data > .caracter").text();
        movieInfo.characters.push({
          url,
          image,
          name,
          character
        });
      });
      movieInfo.country = $(".sheader > .data > .extra > span.country").text();
      movieInfo.duration = $(".sheader > .data > .extra > span.runtime").text();
      movieInfo.rating = parseFloat($('.starstruck-rating span.dt_rating_vgs[itemprop="ratingValue"]').text());
      movieInfo.recommendations = recommendationsArray;
      if (movieInfo.type === TvTypeEnum.TVSERIES) {
        movieInfo.episodes = [];
        $("#seasons .se-c").each((i, el) => {
          var seasonNumber = parseInt($(el).find(".se-t").text().trim());
          $(el).find(".episodios li").each((j, ep) => {
            var episode = {
              id: $(ep).find(".episodiotitle a").attr("href")?.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/|\/$/g, ""),
              season: seasonNumber,
              number: parseInt($(ep).find(".numerando").text().trim().split("-")[1]),
              title: $(ep).find(".episodiotitle a").text().trim(),
              url: $(ep).find(".episodiotitle a").attr("href")?.trim() ?? "",
              releaseDate: String(new Date($(ep).find(".episodiotitle .date").text().trim()).getFullYear()),
              image: $(ep).find(".imagen img").attr("data-src")?.trim() ?? $(ep).find(".imagen img").attr("src")?.trim()
            };
            movieInfo.episodes?.push(episode);
          });
        });
      } else {
        movieInfo.episodes = [{
          id: movieInfo.id,
          title: movieInfo.title,
          url: movieInfo.url,
          image: movieInfo.cover || movieInfo.image
        }];
      }
      return movieInfo;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchEpisodeSources = async function (episodeId, mediaId) {
    var server = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : StreamingServersEnum.StreamWish;
    var fileId = arguments.length > 3 ? arguments[3] : undefined;
    if (episodeId.startsWith("http")) {
      var serverUrl = new PolyURL(episodeId);
      var referer = serverUrl.origin;
      var downloadUrl = fileId ? `${serverUrl.href.toString().replace("/e/", "/f/")}/${fileId}` : "";
      switch (server) {
        case StreamingServersEnum.StreamWish:
          return {
            headers: {
              Referer: referer
            },
            ...(await StreamWish(ctx).extract(serverUrl, referer)),
            download: downloadUrl
          };
        case StreamingServersEnum.VidHide:
          return {
            headers: {
              Referer: referer
            },
            ...(await VidHide(ctx).extract(serverUrl)),
            download: fileId ? `https://gdmirrorbot.nl/file/${fileId}` : ""
          };
        default:
          return {
            headers: {
              Referer: referer
            },
            ...(await StreamWish(ctx).extract(serverUrl, referer)),
            download: downloadUrl
          };
      }
    }
    try {
      var servers = await fetchEpisodeServers(episodeId, episodeId);
      var i = servers.findIndex(s => s.name.toLowerCase() === server.toLowerCase());
      if (i === -1) {
        throw new Error(`Server ${server} not found`);
      }
      var _serverUrl = new URL(servers[i].url);
      var fId = "";
      if (!episodeId.startsWith("http")) {
        var {
          fileId: id
        } = await getServer(`${config.baseUrl}/${episodeId}`);
        fId = id ?? "";
      }
      return await fetchEpisodeSources(_serverUrl.href, mediaId, server, fId);
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchEpisodeServers = async (episodeId, mediaId) => {
    if (!episodeId.startsWith(config.baseUrl)) {
      episodeId = `${config.baseUrl}/${episodeId}`;
    }
    try {
      var {
        servers
      } = await getServer(episodeId);
      return servers;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchPopular = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var result = {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    try {
      var {
        data
      } = await axios.get(`${config.baseUrl}/trending/page/${page}/`);
      var $ = load(data);
      var navSelector = "div.pagination";
      result.hasNextPage = $(navSelector).find("#nextpagination").length > 0;
      $(".items > article").each((i, el) => {
        var resultItem = {
          id: $(el).attr("id"),
          title: $(el).find("div.data > h3").text() ?? "",
          url: $(el).find("div.poster > a").attr("href"),
          image: $(el).find("div.poster > img").attr("data-src") ?? "",
          type: $(el).find("div.poster > a").attr("href")?.includes("/movies/") ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES,
          rating: $(el).find("div.poster > div.rating").text() ?? "",
          releaseDate: $(el).find("div.data > span").text() ?? ""
        };
        result.results.push(resultItem);
      }).get();
      return result;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchByGenre = async function (genre) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var result = {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    try {
      var {
        data
      } = await axios.get(`${config.baseUrl}/genre/${genre}/page/${page}`);
      var $ = load(data);
      var navSelector = "div.pagination";
      result.hasNextPage = $(navSelector).find("#nextpagination").length > 0;
      $(".items > article").each((i, el) => {
        var resultItem = {
          id: $(el).attr("id"),
          title: $(el).find("div.data > h3").text() ?? "",
          url: $(el).find("div.poster > a").attr("href"),
          image: $(el).find("div.poster > img").attr("data-src") ?? "",
          type: $(el).find("div.poster > a").attr("href")?.includes("/movies/") ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES,
          rating: $(el).find("div.poster > div.rating").text() ?? "",
          releaseDate: $(el).find("div.data > span").text() ?? ""
        };
        result.results.push(resultItem);
      }).get();
      return result;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var getServer = async url => {
    try {
      var {
        data
      } = await axios.get(url);
      var $ = load(data);
      var playerConfig = {
        postId: $("#player-option-1").attr("data-post"),
        nume: $("#player-option-1").attr("data-nume"),
        type: $("#player-option-1").attr("data-type")
      };
      if (!playerConfig.postId || !playerConfig.nume || !playerConfig.type) {
        throw new Error("Missing player configuration");
      }
      var headers = {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded"
      };
      var urlEncodedBody = `action=doo_player_ajax&post=${playerConfig.postId}&nume=${playerConfig.nume}&type=${playerConfig.type}`;
      console.log(`${baseUrl}/wp-admin/admin-ajax.php`);
      console.time("POST Request - WebView");
      var postTestWebView = await NativeConsumet.makePostRequestWithWebView(`${baseUrl}/wp-admin/admin-ajax.php`, headers, urlEncodedBody);
      console.timeEnd("POST Request - WebView");
      console.log("POST Response (WebView):", {
        status: postTestWebView.status,
        response: postTestWebView.response,
        cookies: postTestWebView.cookies,
        contentType: postTestWebView.contentType
      });
      console.time("POST Request - OkHttp");
      var postTestOkHttp = await makePostRequest(`${baseUrl}/wp-admin/admin-ajax.php`, headers, urlEncodedBody);
      console.timeEnd("POST Request - OkHttp");
      console.log("POST Response (OkHttp):", {
        statusCode: postTestOkHttp.statusCode,
        body: postTestOkHttp.body,
        headers: postTestOkHttp.headers
      });
      var res = await fetch(`${baseUrl}/wp-admin/admin-ajax.php`, {
        method: "POST",
        headers,
        body: urlEncodedBody
      });
      var playerRes = await res.json();
      console.log({
        playerRes
      });
      var iframeUrl = playerRes.embed_url?.match(/<iframe[^>]+src="([^"]+)"[^>]*>/i)?.[1] || playerRes.embed_url;
      if (!iframeUrl.includes("multimovies")) {
        if (iframeUrl.includes("dhcplay")) {
          return {
            servers: [{
              name: "StreamWish",
              url: iframeUrl
            }],
            fileId: iframeUrl.split("/").pop() ?? ""
          };
        }
        var fileId = iframeUrl.split("/").pop();
        if (!fileId) {
          throw new Error("No player ID found");
        }
        var streamRequestData = new FormData();
        streamRequestData.append("sid", fileId);
        var streamRes = await fetch(`https://pro.gtxgamer.site/embedhelper.php`, {
          method: "POST",
          headers: {
            ...headers
            // 'Content-Type':'multipart/form-data',
          },
          body: streamRequestData
        });
        var streamResponse = await streamRes.json();
        if (!streamResponse) {
          throw new Error("No stream data found");
        }
        var decodedMresult = JSON.parse(atob(streamResponse.mresult));
        var mresultKeys = Object.keys(decodedMresult);
        var commonKeys = mresultKeys.filter(key => streamResponse.siteUrls.hasOwnProperty(key));
        var commonStreamSites = new Set(commonKeys);
        var servers = Array.from(commonStreamSites).map(site => {
          return {
            name: streamResponse.siteFriendlyNames[site] === "StreamHG" ? "StreamWish" : streamResponse.siteFriendlyNames[site] === "EarnVids" ? "VidHide" : streamResponse.siteFriendlyNames[site],
            url: streamResponse.siteUrls[site] + JSON.parse(atob(streamResponse.mresult))[site]
          };
        });
        return {
          servers,
          fileId
        };
      } else {
        return {
          servers: [{
            name: "StreamWish",
            url: iframeUrl
          }],
          fileId: iframeUrl.split("/").pop() ?? ""
        };
      }
    } catch (err) {
      console.log(err);
      throw new Error(err.message);
    }
  };
  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
    fetchPopular,
    fetchByGenre
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);