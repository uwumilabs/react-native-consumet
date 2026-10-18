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

// src/providers/movies/yflix/create-yflix.ts
var create_yflix_exports = {};
__export(create_yflix_exports, {
  createYFlix: () => createYFlix
});
module.exports = __toCommonJS(create_yflix_exports);
function createYFlix(ctx, customBaseURL) {
  var {
    load,
    extractors,
    enums,
    axios,
    createCustomBaseUrl,
    PolyURL
  } = ctx;
  var {
    MegaUp
  } = extractors;
  var {
    TvType: TvTypeEnum,
    StreamingServers: StreamingServersEnum
  } = enums;
  var apiBase = "https://enc-dec.app/api";
  var baseUrl = createCustomBaseUrl("https://yflix.to", customBaseURL);
  var config = {
    name: "YFlix",
    languages: "all",
    classPath: "MOVIES.YFlix",
    logo: `${baseUrl}/assets/uploads/2f505f3de3c99889c1a72557f3e3714fc0c457b0.png`,
    baseUrl,
    isNSFW: false,
    isWorking: true
  };
  var supportedTypes = /* @__PURE__ */new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);
  var GenerateToken = async n => {
    try {
      var res = await axios.get(`${apiBase}/enc-movies-flix?text=${encodeURIComponent(n)}`);
      return res.data.result;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  var DecodeIframeData = async n => {
    try {
      var res = await axios.post(`${apiBase}/dec-movies-flix`, {
        text: n
      });
      return res.data.result;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  var search = async function (query) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var searchResult = {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    try {
      var {
        data
      } = await axios.get(`${baseUrl}/browser?keyword=${query.replace(/[\W_]+/g, "+")}&page=${page}`);
      var $ = load(data);
      var navSelector = "nav.navigation > ul.pagination";
      searchResult.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass("active") : false;
      $(".film-section > div.item").each((i, el) => {
        var releaseDate = $(el).find("div.metadata > span:nth-child(2)").text();
        searchResult.results.push({
          id: $(el).find("div.inner > a").attr("href")?.split("/watch/")[1],
          title: $(el).find("div.info > a").text().trim(),
          url: `${baseUrl}${$(el).find("div.inner > a").attr("href")}`,
          image: $(el).find("img").attr("data-src") || $(el).find("img").attr("src"),
          releaseDate: isNaN(parseInt(releaseDate)) ? void 0 : releaseDate,
          seasons: releaseDate.includes("SS") ? parseInt(releaseDate.split("SS")[1]) : void 0,
          type: $(el).find("div.metadata > span:nth-child(1)").text() === "Movie" ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES
        });
      });
      return searchResult;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchMediaInfo = async mediaId => {
    if (!mediaId.startsWith(baseUrl)) {
      mediaId = `${baseUrl}/watch/${mediaId}`;
    }
    var movieInfo = {
      id: mediaId.split("to/").pop(),
      title: "",
      url: mediaId
    };
    try {
      var {
        data
      } = await axios.get(mediaId);
      var $ = load(data);
      var recommendationsArray = [];
      $("section.movie-related > div.film-section > div.item").each((i, el) => {
        var releaseDate = $(el).find("div.metadata > span:nth-child(2)").text();
        recommendationsArray.push({
          id: $(el).find("div.inner > a").attr("href")?.split("/watch/")[1],
          title: $(el).find("div.info > a").text().trim(),
          image: $(el).find("img").attr("data-src") || $(el).find("img").attr("src"),
          releaseDate: isNaN(parseInt(releaseDate)) ? void 0 : releaseDate,
          seasons: releaseDate.includes("SS") ? parseInt(releaseDate.split("SS")[1]) : void 0,
          type: $(el).find("div.metadata > span:nth-child(1)").text() === "Movie" ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES
        });
      });
      var uid = $("#movie-rating").attr("data-id");
      movieInfo.cover = $("div.detail-bg").attr("style")?.slice(22).replace(")", "").replace(";", "");
      movieInfo.title = $("h1.title").text();
      movieInfo.image = $(".poster  img").attr("src");
      movieInfo.description = $(".description").text().trim();
      movieInfo.releaseDate = $("ul.mics > li:contains(Released:)").text().replace("Released:", "").trim();
      movieInfo.genres = $("ul.mics > li:contains(Genres:) a").map((i, el) => $(el).text().split("&")).get().map(v => v.trim());
      movieInfo.casts = $("ul.mics > li:contains(Casts:) a").map((i, el) => $(el).text()).get();
      movieInfo.country = $("ul.mics > li:contains(Country:) a").text().trim();
      movieInfo.rating = parseFloat($(".metadata > span.IMDb").text().replace("IMDb", "").trim());
      movieInfo.recommendations = recommendationsArray;
      var episodesAjax = await axios.get(`${baseUrl}/ajax/episodes/list?id=${uid}&_=${await GenerateToken(uid)}`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Referer": `${baseUrl}/watch/${mediaId}`
        }
      });
      var $$ = load(episodesAjax.data.result);
      movieInfo.episodes = [];
      $$(".episodes").each((_, el) => {
        var season = parseInt($$(el).attr("data-season"), 10);
        $$(el).find("li a").each((_2, link) => {
          var $link = $(link);
          var id = $link.attr("eid")?.trim() || "";
          var url = baseUrl + $link.attr("href")?.trim() || "";
          var number = parseInt($link.attr("num") || "", 10);
          var releaseDate = $link.attr("title")?.trim() || "";
          var title = $link.find("span:last-child").text().trim();
          movieInfo.episodes?.push({
            id,
            title,
            url,
            number,
            season,
            releaseDate
          });
        });
      });
      return movieInfo;
    } catch (err) {
      console.log(err);
      throw new Error(err.message);
    }
  };
  var fetchEpisodeSources = async function (episodeId, mediaId) {
    var server = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : StreamingServersEnum.MegaUp;
    if (episodeId.startsWith("http")) {
      var serverUrl = new PolyURL(episodeId);
      switch (server) {
        case StreamingServersEnum.MegaUp:
          return {
            headers: {
              Referer: serverUrl.href
            },
            ...(await MegaUp(ctx).extract(serverUrl))
          };
        default:
          return {
            headers: {
              Referer: serverUrl.href
            },
            ...(await MegaUp(ctx).extract(serverUrl))
          };
      }
    }
    try {
      var servers = await fetchEpisodeServers(episodeId, mediaId);
      var i = servers.findIndex(s => s.name.toLowerCase().includes(server));
      if (i === -1) {
        throw new Error(`Server ${server} not found`);
      }
      var _serverUrl = new URL(servers[i]?.url);
      var sources = await fetchEpisodeSources(_serverUrl.href, mediaId, server);
      return sources;
    } catch (err) {
      console.log(err, "err");
      throw new Error(err.message);
    }
  };
  var fetchEpisodeServers = async (episodeId, mediaId) => {
    try {
      var {
        data
      } = await axios.get(`${baseUrl}/ajax/links/list?eid=${episodeId}&_=${await GenerateToken(episodeId)}`);
      var $ = load(data.result);
      var servers = [];
      var serverItems = $("ul > li.server");
      await Promise.all(serverItems.map(async (i, server) => {
        var id = $(server).attr("data-lid");
        var {
          data: data2
        } = await axios.get(`${baseUrl}/ajax/links/view?id=${id}&_=${await GenerateToken(id)}`);
        var decodedIframeData = await DecodeIframeData(data2.result);
        servers.push({
          name: `MegaUp ${$(server).text().trim()}`.toLowerCase(),
          url: decodedIframeData.url
        });
      }));
      return servers;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchRecentMovies = async () => {
    try {
      var {
        data
      } = await axios.get(`${baseUrl}/home`);
      var $ = load(data);
      var movies = $('section.block_area:contains("Latest Movies") > div:nth-child(2) > div:nth-child(1) > div.flw-item').map((i, el) => {
        var releaseDate = $(el).find("div.film-detail > div.fd-infor > span:nth-child(1)").text();
        var movie = {
          id: $(el).find("div.film-poster > a").attr("href")?.slice(1),
          title: $(el).find("div.film-detail > h3.film-name > a").attr("title"),
          url: `${baseUrl}${$(el).find("div.film-poster > a").attr("href")}`,
          image: $(el).find("div.film-poster > img").attr("data-src"),
          releaseDate: isNaN(parseInt(releaseDate)) ? void 0 : releaseDate,
          duration: $(el).find("div.film-detail > div.fd-infor > span.fdi-duration").text() || null,
          type: $(el).find("div.film-detail > div.fd-infor > span.float-right").text() === "Movie" ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES
        };
        return movie;
      }).get();
      return movies;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchRecentTvShows = async () => {
    try {
      var {
        data
      } = await axios.get(`${baseUrl}/home`);
      var $ = load(data);
      var tvshows = $('section.block_area:contains("Latest TV Shows") > div:nth-child(2) > div:nth-child(1) > div.flw-item').map((i, el) => {
        var tvshow = {
          id: $(el).find("div.film-poster > a").attr("href")?.slice(1),
          title: $(el).find("div.film-detail > h3.film-name > a").attr("title"),
          url: `${baseUrl}${$(el).find("div.film-poster > a").attr("href")}`,
          image: $(el).find("div.film-poster > img").attr("data-src"),
          season: $(el).find("div.film-detail > div.fd-infor > span:nth-child(1)").text().replace("SS", "").trim(),
          latestEpisode: $(el).find("div.film-detail > div.fd-infor > span:nth-child(3)").text().replace("EPS", "").trim() || null,
          type: $(el).find("div.film-detail > div.fd-infor > span.float-right").text() === "Movie" ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES
        };
        return tvshow;
      }).get();
      return tvshows;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchTrendingMovies = async () => {
    try {
      var {
        data
      } = await axios.get(`${baseUrl}/home`);
      var $ = load(data);
      var movies = $("div#trending-movies div.film_list-wrap div.flw-item").map((i, el) => {
        var releaseDate = $(el).find("div.film-detail > div.fd-infor > span:nth-child(1)").text();
        var movie = {
          id: $(el).find("div.film-poster > a").attr("href")?.slice(1),
          title: $(el).find("div.film-detail > h3.film-name > a").attr("title"),
          url: `${baseUrl}${$(el).find("div.film-poster > a").attr("href")}`,
          image: $(el).find("div.film-poster > img").attr("data-src"),
          releaseDate: isNaN(parseInt(releaseDate)) ? void 0 : releaseDate,
          duration: $(el).find("div.film-detail > div.fd-infor > span.fdi-duration").text() || null,
          type: $(el).find("div.film-detail > div.fd-infor > span.float-right").text() === "Movie" ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES
        };
        return movie;
      }).get();
      return movies;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchTrendingTvShows = async () => {
    try {
      var {
        data
      } = await axios.get(`${baseUrl}/home`);
      var $ = load(data);
      var tvshows = $("div#trending-tv div.film_list-wrap div.flw-item").map((i, el) => {
        var tvshow = {
          id: $(el).find("div.film-poster > a").attr("href")?.slice(1),
          title: $(el).find("div.film-detail > h3.film-name > a").attr("title"),
          url: `${baseUrl}${$(el).find("div.film-poster > a").attr("href")}`,
          image: $(el).find("div.film-poster > img").attr("data-src"),
          season: $(el).find("div.film-detail > div.fd-infor > span:nth-child(1)").text().replace("SS", "").trim(),
          latestEpisode: $(el).find("div.film-detail > div.fd-infor > span:nth-child(3)").text().replace("EPS", "").trim() || null,
          type: $(el).find("div.film-detail > div.fd-infor > span.float-right").text() === "Movie" ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES
        };
        return tvshow;
      }).get();
      return tvshows;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchByCountry = async function (country) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var result = {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    var navSelector = "div.pre-pagination > nav:nth-child(1) > ul:nth-child(1)";
    try {
      var {
        data
      } = await axios.get(`${baseUrl}/country/${country}/?page=${page}`);
      var $ = load(data);
      result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass("active") : false;
      $("div.container > section.block_area > div.block_area-content > div.film_list-wrap > div.flw-item").each((i, el) => {
        var resultItem = {
          id: $(el).find("div.film-poster > a").attr("href")?.slice(1) ?? "",
          title: $(el).find("div.film-detail > h2.film-name > a").attr("title") ?? "",
          url: `${baseUrl}${$(el).find("div.film-poster > a").attr("href")}`,
          image: $(el).find("div.film-poster > img").attr("data-src"),
          type: $(el).find("div.film-detail > div.fd-infor > span.float-right").text() === "Movie" ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES
        };
        var season = $(el).find("div.film-detail > div.fd-infor > span:nth-child(1)").text().replace("SS", "").trim();
        var latestEpisode = $(el).find("div.film-detail > div.fd-infor > span:nth-child(3)").text().replace("EPS", "").trim() ?? null;
        if (resultItem.type === TvTypeEnum.TVSERIES) {
          resultItem.season = season;
          resultItem.latestEpisode = latestEpisode;
        } else {
          resultItem.releaseDate = season;
          resultItem.duration = latestEpisode;
        }
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
      } = await axios.get(`${baseUrl}/genre/${genre}?page=${page}`);
      var $ = load(data);
      var navSelector = "div.pre-pagination > nav:nth-child(1) > ul:nth-child(1)";
      result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass("active") : false;
      $(".film_list-wrap > div.flw-item").each((i, el) => {
        var resultItem = {
          id: $(el).find("div.film-poster > a").attr("href")?.slice(1) ?? "",
          title: $(el).find("div.film-detail > h2 > a").attr("title") ?? "",
          url: `${baseUrl}${$(el).find("div.film-poster > a").attr("href")}`,
          image: $(el).find("div.film-poster > img").attr("data-src"),
          type: $(el).find("div.film-detail > div.fd-infor > span.float-right").text() === "Movie" ? TvTypeEnum.MOVIE : TvTypeEnum.TVSERIES
        };
        var season = $(el).find("div.film-detail > div.fd-infor > span:nth-child(1)").text().replace("SS", "").trim();
        var latestEpisode = $(el).find("div.film-detail > div.fd-infor > span:nth-child(3)").text().replace("EPS", "").trim() ?? null;
        if (resultItem.type === TvTypeEnum.TVSERIES) {
          resultItem.season = season;
          resultItem.latestEpisode = latestEpisode;
        } else {
          resultItem.releaseDate = season;
          resultItem.duration = latestEpisode;
        }
        result.results.push(resultItem);
      }).get();
      return result;
    } catch (err) {
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
    fetchRecentMovies,
    fetchRecentTvShows,
    fetchTrendingMovies,
    fetchTrendingTvShows,
    fetchByCountry,
    fetchByGenre
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);