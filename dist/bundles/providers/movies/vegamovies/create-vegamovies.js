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

// src/providers/movies/vegamovies/create-vegamovies.ts
var create_vegamovies_exports = {};
__export(create_vegamovies_exports, {
  createVegaMovies: () => createVegaMovies
});
module.exports = __toCommonJS(create_vegamovies_exports);
var cleanTitle = raw => {
  var t = raw;
  t = t.replace(/^(?:Download|Watch)\s+/i, "");
  t = t.replace(/\s*[-–—:]?\s*\(?\b(?:Season\s*\d+|S\d{1,2})\b.*$/i, "");
  t = t.replace(/\s*\(\s*(?:19\d{2}|20\d{2})\s*\).*$/, "");
  t = t.replace(/\s*\{.*?\}$/, "");
  t = t.replace(/\s*\[.*?\]$/, "");
  t = t.replace(/\s*[-–—:]?\s*\b(?:Dual[- ]Audio|Multi[- ]Audio|Hindi[- ](?:Dubbed|ORG)|ORG\s+Dubbed|Blu[- ]?Ray|WEB[- ]?DL|HDRip|HDTC|PreDVDRip|CAMRip|DVDRip|Anime\s+Series|K-DRAMA\s+Series|C-Drama\s+Series|Turkish-Drama\s+Series|Netflix[- ]Series|Disney\+|Hotstar|Amazon\s+Prime|IMAX|Extended|Edition|x264|x265|HEVC|10Bit|480p|720p|1080p|2160p|4k)\b.*$/i, "");
  return t.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().replace(/[-–—:|/]+$/, "").trim();
};
function createVegaMovies(ctx, customBaseURL) {
  var {
    load,
    extractors,
    enums,
    axios,
    createCustomBaseUrl,
    PolyURL,
    USER_AGENT
  } = ctx;
  var {
    HubCloud
  } = extractors;
  var {
    StreamingServers: StreamingServersEnum,
    TvType: TvTypeEnum
  } = enums;
  var baseUrl = createCustomBaseUrl("https://new1.vegamovies.lease", customBaseURL);
  var config = {
    name: "VegaMovies",
    languages: "all",
    classPath: "MOVIES.VegaMovies",
    logo: `${baseUrl}/images/favicon-32x32.png`,
    baseUrl,
    isNSFW: false,
    isWorking: true
  };
  var defaultHeaders = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": "xla=s4t",
    "User-Agent": USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  };
  var supportedTypes = /* @__PURE__ */new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);
  var extractYear = text => {
    var match = text.match(/\b(19\d{2}|20\d{2})\b/);
    return match ? match[1] : void 0;
  };
  var extractSeasonNumber = text => {
    var match = text.match(/season\s*(\d+)|s(\d+)/i);
    if (match) {
      var num = match[1] || match[2];
      if (num) return parseInt(num, 10);
    }
    return 1;
  };
  var countSeasons = text => {
    var range = /seasons?\s*(\d+)\s*(?:-|–|—|to|&)\s*(\d+)/i.exec(text);
    if (range) return Math.abs(parseInt(range[2], 10) - parseInt(range[1], 10)) + 1;
    return /season\s*\d+/i.test(text) ? 1 : void 0;
  };
  var resultMeta = (rawTitle, slug, isSeries) => ({
    type: isSeries ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
    releaseDate: isSeries ? void 0 : extractYear(rawTitle),
    seasons: isSeries ? countSeasons(rawTitle) ?? countSeasons(slug.replace(/-(\d+)-(\d+)/, " $1-$2")) : void 0
  });
  var parseHtmlGrid = html => {
    var $ = load(html);
    var results = [];
    var seen = /* @__PURE__ */new Set();
    var items = $(".movies-grid, #moviesGridMain, .blog-items, .post-list, #archive-container").children("a, article, .entry-list-item, .poster-card");
    items.each((_, el) => {
      var element = $(el);
      var linkEl = element.is("a") ? element : element.find("a").first();
      var href = linkEl.attr("href") || element.attr("href") || "";
      if (!href || href === "#" || href === "/") return;
      var postUrl = new PolyURL(href, `${config.baseUrl}/`);
      var cleanId = postUrl.pathname.replace(/^\/|\/$/g, "");
      if (!cleanId || seen.has(cleanId)) return;
      seen.add(cleanId);
      var rawTitle = element.find(".poster-title, .entry-title, .post-title").text().trim() || element.find("img").attr("alt") || linkEl.attr("aria-label") || linkEl.attr("title") || "";
      var isSeries = /\b(?:season|s\d+|web series|series)\b/i.test(rawTitle) || href.includes("season") || href.includes("series");
      var title = cleanTitle(rawTitle);
      if (!title) return;
      var image = element.find("img").attr("data-lazy-src") || element.find("img").attr("data-src") || element.find("img").attr("src") || "";
      if (image.startsWith("//")) {
        image = `https:${image}`;
      }
      results.push({
        id: cleanId,
        title,
        url: postUrl.href,
        image,
        ...resultMeta(rawTitle, cleanId, isSeries)
      });
    });
    return results;
  };
  var search = async function (query) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var searchResult = {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    try {
      var searchUrl = `${config.baseUrl}/search.php?q=${encodeURIComponent(query)}&page=${page}`;
      var {
        data
      } = await axios.get(searchUrl, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl
        }
      });
      if (data && Array.isArray(data.hits) && data.hits.length > 0) {
        var perPage = data.request_params?.per_page || 15;
        var total = typeof data.found === "number" ? data.found : 0;
        searchResult.hasNextPage = page * perPage < total;
        for (var hit of data.hits) {
          var doc = hit.document;
          if (!doc) continue;
          var permalink = doc.permalink || "";
          var postUrl = new PolyURL(permalink, `${config.baseUrl}/`);
          var cleanId = postUrl.pathname.replace(/^\/|\/$/g, "");
          var rawPostTitle = doc.post_title || "";
          var title = cleanTitle(rawPostTitle);
          var categories = Array.isArray(doc.category) ? doc.category : [];
          var isSeries = categories.some(c => /series/i.test(c)) || /\b(?:season|s\d+|web series|series)\b/i.test(rawPostTitle);
          searchResult.results.push({
            id: cleanId,
            title,
            url: postUrl.href,
            image: doc.post_thumbnail || "",
            ...resultMeta(rawPostTitle, cleanId, isSeries)
          });
        }
        return searchResult;
      }
    } catch {}
    try {
      var fallbackUrl = page === 1 ? `${config.baseUrl}/?s=${encodeURIComponent(query)}` : `${config.baseUrl}/page/${page}/?s=${encodeURIComponent(query)}`;
      var {
        data: _data
      } = await axios.get(fallbackUrl, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl
        }
      });
      var $ = load(_data);
      searchResult.results = parseHtmlGrid(_data);
      var navSelector = ".pagination, .nav-links";
      searchResult.hasNextPage = $(navSelector).find('.next, a:contains("Next")').length > 0;
      return searchResult;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchMediaInfo = async mediaId => {
    var fullUrl = mediaId;
    if (!fullUrl?.startsWith("http")) {
      fullUrl = `${config.baseUrl}/${(mediaId ?? "").replace(/^\//, "")}`;
    }
    var cleanId = fullUrl.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/|\/$/g, "");
    var movieInfo = {
      id: cleanId,
      title: "",
      url: fullUrl
    };
    try {
      var {
        data
      } = await axios.get(fullUrl, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl
        }
      });
      var $ = load(data);
      var content = $(".entry-content, .post-content").first();
      var infoText = $("h3, h4").filter((_, el) => /(series|movie)\s*info/i.test($(el).text())).first().nextAll().slice(0, 2).text().replace(/\s+/g, " ");
      var rawTitle = $("h1.entry-title").text().trim() || $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim() || "";
      movieInfo.title = cleanTitle((rawTitle.split("|")[0] || "").trim());
      var image = $('meta[property="og:image"]').attr("content") || content.find("img[data-lazy-src]").attr("data-lazy-src") || content.find("img[data-src]").attr("data-src") || content.find("img").first().attr("src") || "";
      if (image?.startsWith("//")) {
        image = `https:${image}`;
      }
      movieInfo.image = image;
      var synopsis = "";
      var synopsisHeader = $("h3, h4, h5").filter((_, el) => /synopsis|plot/i.test($(el).text()));
      if (synopsisHeader.length > 0) {
        synopsis = synopsisHeader.next("p").text().trim();
      }
      if (!synopsis) {
        synopsis = $('meta[property="og:description"]').attr("content")?.trim() || "";
      }
      movieInfo.description = synopsis;
      var imdbMatch = $('a[href*="imdb.com"]').attr("href")?.match(/tt\d+/) || data.match(/tt\d{7,}/);
      if (imdbMatch?.[0]) {
        movieInfo.imdbId = imdbMatch[0];
      }
      var ratingText = $(".imdb-score, .starstruck-rating").text() || /IMDb Rating\W*([\d.]+)/i.exec(infoText)?.[1] || "";
      var ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
      if (ratingMatch?.[1]) {
        movieInfo.rating = parseFloat(ratingMatch[1]);
      }
      movieInfo.releaseDate = extractYear(/Released?\s*Year\s*:?\s*([^\s]+)/i.exec(infoText)?.[1] ?? "") ?? extractYear(movieInfo.title);
      movieInfo.genres = $('a[rel="category tag"], .category a').map((_, el) => $(el).text().trim()).get().filter(g => g && !g.includes("1080p") && !g.includes("720p") && !g.includes("480p"));
      var pageText = `${movieInfo.title} ${content.text()}`;
      var isSeries = /\b(?:web\s*series|season\s*\d+|s\d+\s*e\d+)\b/i.test(pageText) || $('a:contains("V-Cloud"), a:contains("vcloud")').length > 1;
      movieInfo.type = isSeries ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE;
      var episodesList = [];
      if (movieInfo.type === TvTypeEnum.TVSERIES) {
        var seasonPacks = [];
        var getPackPriority = t => {
          if (/1080p|2160p|4k/i.test(t)) return 3;
          if (/720p/i.test(t)) return 2;
          if (/480p/i.test(t)) return 1;
          return 0;
        };
        var downloadHost = /nexdrive|vcloud|hubcloud|gdflix|fastdl|filepress/i;
        $("h3, h4, h5, p").each((_, element) => {
          var el = $(element);
          var blockText = el.text().trim();
          if (!/season\s*\d+|s\d+/i.test(blockText)) return;
          var nextP = el.next();
          while (nextP.length && !nextP.is("p") && !nextP.find("a[href]").length) {
            nextP = nextP.next();
          }
          var links = nextP.find("a[href]").toArray().map(a => ({
            href: $(a).attr("href") || "",
            text: $(a).text().trim()
          })).filter(l => l.href.startsWith("http") && downloadHost.test(l.href) && !/zip|batch|login/i.test(l.text));
          if (!links.length) return;
          var preferred = links.find(l => /v-?cloud/i.test(l.text)) ?? links[0];
          var best = links.reduce((acc, l) => getPackPriority(l.text) > getPackPriority(acc.text) ? l : acc, preferred);
          seasonPacks.push({
            title: `${blockText} ${best.text}`,
            season: extractSeasonNumber(blockText),
            url: best.href
          });
        });
        var selectedPacksBySeason = /* @__PURE__ */new Map();
        for (var pack of seasonPacks) {
          if (!selectedPacksBySeason.has(pack.season)) {
            selectedPacksBySeason.set(pack.season, pack);
          } else {
            var existing = selectedPacksBySeason.get(pack.season);
            if (getPackPriority(pack.title) > getPackPriority(existing.title)) {
              selectedPacksBySeason.set(pack.season, pack);
            }
          }
        }
        var packResults = await Promise.allSettled(Array.from(selectedPacksBySeason.values()).map(async pack => {
          var res = await axios.get(pack.url, {
            headers: {
              ...defaultHeaders,
              Referer: fullUrl
            }
          });
          var $ep = load(res.data);
          var eps = [];
          $ep("h3, h4, h5, p").each((_, element) => {
            var el = $ep(element);
            var text = el.text().trim();
            if (/episodes?\s*[:\d\-]/i.test(text) || /e\d{1,3}\b/i.test(text) || /^episode\s*\d+/i.test(text)) {
              var epTitle = text.replace(/\s+/g, " ").trim().replace(/^[-:\s]+|[-:\s]+$/g, "").replace(/^episodes?\s*:\s*/i, "Episode ");
              var epNumMatch = epTitle.match(/\b(?:episode|e)\s*(\d+)/i);
              var epNumber = epNumMatch && epNumMatch[1] ? parseInt(epNumMatch[1], 10) : void 0;
              var nextP = el.next();
              while (nextP.length && !nextP.is("p") && !nextP.find("a[href]").length) {
                nextP = nextP.next();
              }
              var link = nextP.find('a[href*="vcloud"]').attr("href") || nextP.find('a[href*="hubcloud"]').attr("href") || nextP.find('a[href*="fastdl"]').attr("href") || nextP.find(".btn-outline").parent().attr("href") || nextP.find(".btn-outline").attr("href") || nextP.find("a[href]").first().attr("href");
              if (link && link?.startsWith("http") && !eps.some(e => e.url === link)) {
                eps.push({
                  id: link,
                  title: epTitle,
                  number: epNumber,
                  season: pack.season,
                  url: link
                });
              }
            }
          });
          return eps;
        }));
        for (var r of packResults) {
          if (r.status === "fulfilled" && Array.isArray(r.value)) {
            episodesList.push(...r.value);
          }
        }
        if (episodesList.length === 0 && seasonPacks.length > 0) {
          for (var i = 0; i < seasonPacks.length; i++) {
            var sp = seasonPacks[i];
            if (sp) {
              episodesList.push({
                id: sp.url,
                title: sp.title || `Season ${sp.season}`,
                season: sp.season,
                number: i + 1,
                url: sp.url
              });
            }
          }
        }
      } else {
        var count = 0;
        $("h3, h4, h5, p").each((_, element) => {
          var el = $(element);
          var text = el.text().trim();
          var qualityMatch = text.match(/\d+p\b/i);
          var nextP = el.next();
          while (nextP.length && !nextP.is("p") && !nextP.find("a[href]").length) {
            nextP = nextP.next();
          }
          var btn = nextP.find('a[href*="nexdrive"], a[href*="vcloud"], a[href*="hubcloud"], a[href*="fastdl"]').first().length > 0 ? nextP.find('a[href*="nexdrive"], a[href*="vcloud"], a[href*="hubcloud"], a[href*="fastdl"]').first() : nextP.find(".dwd-button, .btn-outline").first().is("a") ? nextP.find(".dwd-button, .btn-outline").first() : nextP.find(".dwd-button, .btn-outline").first().parent("a");
          var btnHref = btn.attr("href");
          if (btnHref && btnHref?.startsWith("http") && !episodesList.some(e => e.url === btnHref)) {
            count++;
            episodesList.push({
              id: btnHref,
              title: text || `${movieInfo.title} ${qualityMatch ? qualityMatch[0] : "HD"}`,
              number: count,
              season: 1,
              url: btnHref
            });
          }
        });
        if (episodesList.length === 0) {
          $('a[href*="nexdrive.fit"], a[href*="vcloud"], a[href*="hubcloud"]').each((i, el) => {
            var href = $(el).attr("href");
            if (href && href?.startsWith("http") && !episodesList.some(e => e.url === href)) {
              episodesList.push({
                id: href,
                title: `${movieInfo.title} Option ${i + 1}`,
                number: i + 1,
                season: 1,
                url: href
              });
            }
          });
        }
      }
      if (episodesList.length === 0) {
        episodesList.push({
          id: movieInfo.url || fullUrl,
          title: movieInfo.title || "Movie",
          url: movieInfo.url || fullUrl,
          number: 1,
          season: 1
        });
      }
      movieInfo.episodes = episodesList;
      movieInfo.totalEpisodes = episodesList.length;
      return movieInfo;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchEpisodeServers = async (episodeId, mediaId) => {
    var servers = [];
    var resolvedUrl = episodeId;
    if (!resolvedUrl?.startsWith("http")) {
      try {
        var info = await fetchMediaInfo(episodeId);
        var firstEp = info.episodes?.[0];
        if (firstEp?.url) {
          resolvedUrl = firstEp.url;
        }
      } catch {}
    }
    if (!resolvedUrl?.startsWith("http")) {
      return [{
        name: "HubCloud",
        url: episodeId
      }];
    }
    if (resolvedUrl.includes("vcloud") || resolvedUrl.includes("hubcloud")) {
      try {
        var hubCloudExtractor = HubCloud(ctx);
        var hubRes = await hubCloudExtractor.extract(new PolyURL(resolvedUrl));
        if (hubRes?.sources && hubRes.sources.length > 0) {
          var _loop2 = async function () {
            var sName = s.server || s.quality || "HubCloud";
            if (!servers.some(srv => srv.name === sName)) {
              servers.push({
                name: sName,
                url: s.url
              });
            }
          };
          for (var s of hubRes.sources) {
            await _loop2();
          }
        }
      } catch {}
      if (!servers.some(s => s.name.toLowerCase() === "hubcloud")) {
        servers.push({
          name: "HubCloud",
          url: resolvedUrl
        });
      }
      return servers;
    }
    try {
      var {
        data
      } = await axios.get(resolvedUrl, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl
        }
      });
      var $ = load(data);
      var vcloudLink = $('a[href*="vcloud"], a[href*="hubcloud"]').attr("href");
      if (vcloudLink) {
        try {
          var _hubCloudExtractor = HubCloud(ctx);
          var _hubRes = await _hubCloudExtractor.extract(new PolyURL(vcloudLink));
          if (_hubRes?.sources && _hubRes.sources.length > 0) {
            var _loop3 = async function () {
              var sName = _s.server || _s.quality || "HubCloud";
              if (!servers.some(srv => srv.name === sName)) {
                servers.push({
                  name: sName,
                  url: _s.url
                });
              }
            };
            for (var _s of _hubRes.sources) {
              await _loop3();
            }
          }
        } catch {}
        if (!servers.some(s => s.name.toLowerCase() === "hubcloud")) {
          servers.push({
            name: "HubCloud",
            url: vcloudLink
          });
        }
      }
      var gdirectLink = $('a[href*="fastdl"], a:contains("G-Direct")').attr("href");
      if (gdirectLink) {
        servers.push({
          name: "FastDL",
          url: gdirectLink
        });
      }
      var filepressLink = $('a[href*="filebee"], a[href*="filepress"]').attr("href");
      if (filepressLink) {
        servers.push({
          name: "Filepress",
          url: filepressLink
        });
      }
    } catch {}
    if (servers.length === 0) {
      servers.push({
        name: "HubCloud",
        url: resolvedUrl
      });
    }
    return servers;
  };
  var fetchEpisodeSources = async function (episodeId, mediaId) {
    var server = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : StreamingServersEnum.HubCloud;
    var resolvedUrl = episodeId;
    if (!resolvedUrl?.startsWith("http")) {
      var info = await fetchMediaInfo(episodeId);
      var firstEp = info.episodes?.[0];
      if (firstEp?.url) {
        resolvedUrl = firstEp.url;
      } else {
        throw new Error(`Unable to resolve episode source for ${episodeId}`);
      }
    }
    var epQualityMatch = resolvedUrl.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
    var epQuality = epQualityMatch ? epQualityMatch[1].toLowerCase() === "4k" ? "2160p" : epQualityMatch[1].toLowerCase() : "auto";
    var extraSources = [];
    if (!resolvedUrl.includes("cloud")) {
      try {
        var dotlinkRes = await axios.get(resolvedUrl, {
          headers: defaultHeaders
        });
        var dotlinkText = dotlinkRes.data;
        var vlinkMatch = dotlinkText.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i);
        if (vlinkMatch?.[1]) {
          resolvedUrl = vlinkMatch[1];
        }
        var fastdlMatch = dotlinkText.match(/<a\s+href="([^"]*fastdl\.[^"]*)"/i);
        if (fastdlMatch?.[1]) {
          try {
            var fdlRes = await axios.get(fastdlMatch[1], {
              headers: {
                ...defaultHeaders,
                Referer: resolvedUrl
              }
            });
            var reurlMatch = fdlRes.data.match(/var\s+reurl\s*=\s*['"]([^'"]+)['"]/);
            if (reurlMatch?.[1]) {
              extraSources.push({
                url: reurlMatch[1],
                server: "FastDL",
                quality: epQuality,
                isM3U8: false
              });
            }
          } catch {}
        }
        try {
          var $ = load(dotlinkText);
          var filepressLink = $('.btn.btn-sm.btn-outline[style*="rgb(252,185,0)"]').parent().attr("href") || $('a[href*="filebee"], a[href*="filepress"]').attr("href");
          if (filepressLink) {
            var filepressID = filepressLink.split("/").filter(Boolean).pop();
            var filepressBaseUrl = filepressLink.split("/").slice(0, 3).join("/");
            var fpRes1 = await axios.post(`${filepressBaseUrl}/api/file/downlaod/`, {
              id: filepressID,
              method: "indexDownlaod",
              captchaValue: null
            }, {
              headers: {
                "Content-Type": "application/json",
                "Referer": filepressBaseUrl
              }
            });
            if (fpRes1.data?.status && fpRes1.data?.data) {
              var fpToken = fpRes1.data.data;
              var fpRes2 = await axios.post(`${filepressBaseUrl}/api/file/downlaod2/`, {
                id: fpToken,
                method: "indexDownlaod",
                captchaValue: null
              }, {
                headers: {
                  "Content-Type": "application/json",
                  "Referer": filepressBaseUrl
                }
              });
              var fpStreamUrl = fpRes2.data?.data?.[0];
              if (fpStreamUrl && fpStreamUrl?.startsWith("http")) {
                extraSources.push({
                  url: fpStreamUrl,
                  server: "Filepress",
                  quality: epQuality,
                  isM3U8: false
                });
              }
            }
          }
        } catch {}
      } catch {}
    }
    if (resolvedUrl.includes("fastdl.zip")) {
      try {
        var {
          data
        } = await axios.get(resolvedUrl, {
          headers: {
            ...defaultHeaders,
            Referer: "https://nexdrive.fit/"
          }
        });
        var _reurlMatch = data.match(/var\s+reurl\s*=\s*['"]([^'"]+)['"]/);
        var directUrl = _reurlMatch ? _reurlMatch[1] : resolvedUrl;
        return {
          headers: {
            Referer: "https://fastdl.zip/"
          },
          sources: [{
            url: directUrl,
            server: "FastDL",
            quality: epQuality,
            isM3U8: false
          }, ...extraSources],
          download: directUrl
        };
      } catch {}
    }
    var hubCloudSources = [];
    var hubHeaders = {
      Referer: config.baseUrl
    };
    if (resolvedUrl.includes("cloud")) {
      try {
        var hubCloudExtractor = HubCloud(ctx);
        var hubCloudRes = await hubCloudExtractor.extract(new PolyURL(resolvedUrl));
        if (hubCloudRes?.sources && Array.isArray(hubCloudRes.sources)) {
          hubCloudSources = hubCloudRes.sources.map(s => ({
            ...s,
            server: s.server || s.quality || "HubCloud",
            quality: s.quality && s.quality !== "auto" && !/\b(?:server|worker|storage|drain|bot|cloud)\b/i.test(s.quality) ? s.quality : epQuality !== "auto" ? epQuality : "auto"
          }));
          if (hubCloudRes.headers) {
            hubHeaders = hubCloudRes.headers;
          }
        }
      } catch {}
    }
    var allSources = [...extraSources, ...hubCloudSources];
    if (server && server.toLowerCase() !== "hubcloud") {
      var serverLower = server.toLowerCase();
      var matched = allSources.filter(s => (s.server || "").toLowerCase().includes(serverLower));
      if (matched.length > 0) {
        var others = allSources.filter(s => !(s.server || "").toLowerCase().includes(serverLower));
        allSources = [...matched, ...others];
      }
    }
    if (allSources.length === 0) {
      throw new Error(`[VegaMovies] No streamable video sources found for ${episodeId}`);
    }
    return {
      headers: hubHeaders,
      sources: allSources,
      download: allSources[0]?.url
    };
  };
  var fetchLatest = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var searchResult = {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    try {
      var url = page === 1 ? `${config.baseUrl}/` : `${config.baseUrl}/page/${page}/`;
      var {
        data
      } = await axios.get(url, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl
        }
      });
      var $ = load(data);
      searchResult.results = parseHtmlGrid(data);
      var navSelector = ".pagination, .nav-links";
      searchResult.hasNextPage = $(navSelector).find('.next, a:contains("Next")').length > 0;
      return searchResult;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  var fetchRecentMovies = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchByFilter("category/movies-by-genres", page);
  };
  var fetchRecentTVShows = async function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchByFilter("web-series", page);
  };
  var fetchByFilter = async function (filter) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var searchResult = {
      currentPage: page,
      hasNextPage: false,
      results: []
    };
    try {
      var cleanFilter = filter.replace(/^\/|\/$/g, "");
      var url = page === 1 ? `${config.baseUrl}/${cleanFilter}/` : `${config.baseUrl}/${cleanFilter}/page/${page}/`;
      var {
        data
      } = await axios.get(url, {
        headers: {
          ...defaultHeaders,
          Referer: config.baseUrl
        }
      });
      var $ = load(data);
      searchResult.results = parseHtmlGrid(data);
      var navSelector = ".pagination, .nav-links";
      searchResult.hasNextPage = $(navSelector).find('.next, a:contains("Next")').length > 0;
      return searchResult;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  return {
    ...config,
    supportedTypes,
    search,
    fetchMediaInfo,
    fetchEpisodeServers,
    fetchEpisodeSources,
    fetchLatest,
    fetchRecentMovies,
    fetchRecentTVShows,
    fetchByFilter
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);