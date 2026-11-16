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

// src/extractors/hubcloud.ts
var unwrapFastDlUrl = url => {
  var wrapped = url.match(/\/dl\.php\?link=(.+)$/)?.[1];
  if (!wrapped) return url;
  return /^https?%3A/i.test(wrapped) ? decodeURIComponent(wrapped) : wrapped;
};

// src/providers/movies/site-paths.ts
var pathOf = url => url.replace(/^https?:\/\/[^/]+/i, "").replace(/[?#].*$/, "");
function pageId(url, baseUrl) {
  var path = pathOf(url);
  var basePath = pathOf(baseUrl).replace(/\/+$/, "");
  var relative = basePath && path.startsWith(`${basePath}/`) ? path.slice(basePath.length) : path;
  return relative.replace(/^\/+|\/+$/g, "");
}
function pageUrl(id, baseUrl) {
  return /^https?:\/\//i.test(id) ? id : `${baseUrl}/${id.replace(/^\/+/, "")}`;
}

// src/providers/movies/vegamovies/create-vegamovies.ts
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
var SERIES_TITLE = /\b(?:season|s\d+|web series|series)\b/i;
var DOWNLOAD_HOSTS = ["vcloud", "hubcloud", "nexdrive", "fastdl"];
var hostRank = href => DOWNLOAD_HOSTS.findIndex(host => href.includes(host));
var isFastDl = url => /fastdl\./i.test(url);
var NEXDRIVE_URL = "https://nexdrive.fit/";
var qualityRank = text => {
  if (/1080p|2160p|4k/i.test(text)) return 3;
  if (/720p/i.test(text)) return 2;
  if (/480p/i.test(text)) return 1;
  return 0;
};
var linkBlockAfter = heading => {
  var block = heading.next();
  while (block.length && !block.is("p") && !block.find("a[href]").length) block = block.next();
  return block;
};
var downloadLink = ($, block) => {
  var hosted = block.find("a[href]").toArray().map(a => $(a).attr("href")).filter(href => hostRank(href) >= 0).reduce((best, href) => !best || hostRank(href) < hostRank(best) ? href : best, void 0);
  if (hosted) return hosted;
  var button = block.find(".dwd-button, .btn-outline").first();
  return (button.is("a") ? button : button.parent("a")).attr("href");
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
  var baseUrl = createCustomBaseUrl("https://vegamovies.lease", customBaseURL);
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
    "User-Agent": USER_AGENT
  };
  var supportedTypes = /* @__PURE__ */new Set([TvTypeEnum.MOVIE, TvTypeEnum.TVSERIES]);
  var request = function (url) {
    var referer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : baseUrl;
    return (
      // Without withCredentials: false, React Native's Android networking replaces the Cookie header
      // (the xla=s4t the site wants) with its own cookie jar's.
      axios.get(url, {
        headers: {
          ...defaultHeaders,
          Referer: referer
        },
        withCredentials: false
      })
    );
  };
  var extractYear = text => /\b(19\d{2}|20\d{2})\b/.exec(text)?.[1];
  var extractSeasonNumber = text => {
    var match = text.match(/season\s*(\d+)|s(\d+)/i);
    var num = match?.[1] || match?.[2];
    return num ? parseInt(num, 10) : 1;
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
  var parseHtmlGrid = $ => {
    var results = [];
    var seen = /* @__PURE__ */new Set();
    var items = $(".movies-grid, #moviesGridMain, .blog-items, .post-list, #archive-container").children("a, article, .entry-list-item, .poster-card");
    items.each((_, el) => {
      var element = $(el);
      var linkEl = element.is("a") ? element : element.find("a").first();
      var href = linkEl.attr("href") || element.attr("href") || "";
      if (!href || href === "#" || href === "/") return;
      var id = pageId(href, baseUrl);
      if (!id || seen.has(id)) return;
      seen.add(id);
      var rawTitle = element.find(".poster-title, .entry-title, .post-title").text().trim() || element.find("img").attr("alt") || linkEl.attr("aria-label") || linkEl.attr("title") || "";
      var isSeries = SERIES_TITLE.test(rawTitle) || href.includes("season") || href.includes("series");
      var title = cleanTitle(rawTitle);
      if (!title) return;
      var image = element.find("img").attr("data-lazy-src") || element.find("img").attr("data-src") || element.find("img").attr("src") || "";
      if (image.startsWith("//")) {
        image = `https:${image}`;
      }
      results.push({
        id,
        title,
        url: new PolyURL(href, `${baseUrl}/`).href,
        image,
        ...resultMeta(rawTitle, id, isSeries)
      });
    });
    return results;
  };
  var fetchListing = async function (path, page) {
    var query = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
    var {
      data
    } = await request(`${baseUrl}/${path ? `${path}/` : ""}${page > 1 ? `page/${page}/` : ""}${query}`);
    var $ = load(data);
    return {
      currentPage: page,
      hasNextPage: $(".pagination, .nav-links").find('.next, a:contains("Next")').length > 0,
      results: parseHtmlGrid($)
    };
  };
  var search = async function (query) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    try {
      var {
        data
      } = await request(`${baseUrl}/search.php?q=${encodeURIComponent(query)}&page=${page}`);
      if (Array.isArray(data?.hits) && data.hits.length > 0) {
        var perPage = data.request_params?.per_page || 15;
        var total = typeof data.found === "number" ? data.found : 0;
        var results = [];
        for (var hit of data.hits) {
          var doc = hit.document;
          if (!doc) continue;
          var permalink = doc.permalink || "";
          var id = pageId(permalink, baseUrl);
          var rawPostTitle = doc.post_title || "";
          var categories = Array.isArray(doc.category) ? doc.category : [];
          var isSeries = categories.some(c => /series/i.test(c)) || SERIES_TITLE.test(rawPostTitle);
          results.push({
            id,
            title: cleanTitle(rawPostTitle),
            url: new PolyURL(permalink, `${baseUrl}/`).href,
            image: doc.post_thumbnail || "",
            ...resultMeta(rawPostTitle, id, isSeries)
          });
        }
        return {
          currentPage: page,
          hasNextPage: page * perPage < total,
          results
        };
      }
    } catch {}
    return fetchListing("", page, `?s=${encodeURIComponent(query)}`);
  };
  var fetchPackEpisodes = async (pack, postUrl) => {
    var {
      data
    } = await request(pack.url, postUrl);
    var $ = load(data);
    var episodes = [];
    $("h3, h4, h5, p").each((_, element) => {
      var heading = $(element);
      var text = heading.text().trim();
      if (!/episodes?\s*[:\d-]/i.test(text) && !/e\d{1,3}\b/i.test(text) && !/^episode\s*\d+/i.test(text)) return;
      var title = text.replace(/\s+/g, " ").trim().replace(/^[-:\s]+|[-:\s]+$/g, "").replace(/^episodes?\s*:\s*/i, "Episode ");
      var number = /\b(?:episode|e)\s*(\d+)/i.exec(title)?.[1];
      var link = downloadLink($, linkBlockAfter(heading));
      if (link?.startsWith("http") && !episodes.some(e => e.url === link)) {
        episodes.push({
          id: link,
          title,
          number: number ? parseInt(number, 10) : void 0,
          season: pack.season,
          url: link
        });
      }
    });
    return episodes;
  };
  var fetchSeriesEpisodes = async ($, postUrl) => {
    var packs = [];
    $("h3, h4, h5, p").each((_, element) => {
      var heading = $(element);
      var text = heading.text().trim();
      if (!/season\s*\d+|s\d+/i.test(text)) return;
      var links = linkBlockAfter(heading).find("a[href]").toArray().map(a => ({
        href: $(a).attr("href") || "",
        text: $(a).text().trim()
      })).filter(l => l.href.startsWith("http") && hostRank(l.href) >= 0 && !/zip|batch|login/i.test(l.text));
      if (!links.length) return;
      var preferred = links.find(l => /v-?cloud/i.test(l.text)) ?? links[0];
      var best = links.reduce((acc, l) => qualityRank(l.text) > qualityRank(acc.text) ? l : acc, preferred);
      packs.push({
        title: `${text} ${best.text}`,
        season: extractSeasonNumber(text),
        url: best.href
      });
    });
    var bestPerSeason = /* @__PURE__ */new Map();
    for (var pack of packs) {
      var current = bestPerSeason.get(pack.season);
      if (!current || qualityRank(pack.title) > qualityRank(current.title)) bestPerSeason.set(pack.season, pack);
    }
    var perSeason = await Promise.allSettled(Array.from(bestPerSeason.values()).map(pack => fetchPackEpisodes(pack, postUrl)));
    var episodes = perSeason.flatMap(r => r.status === "fulfilled" ? r.value : []);
    if (episodes.length) return episodes;
    return packs.map((pack, i) => ({
      id: pack.url,
      title: pack.title || `Season ${pack.season}`,
      season: pack.season,
      number: i + 1,
      url: pack.url
    }));
  };
  var movieEpisodes = ($, title) => {
    var episodes = [];
    $("h3, h4, h5, p").each((_, element) => {
      var heading = $(element);
      var text = heading.text().trim();
      var href = downloadLink($, linkBlockAfter(heading));
      if (!href?.startsWith("http") || episodes.some(e => e.url === href)) return;
      episodes.push({
        id: href,
        title: text || `${title} HD`,
        number: episodes.length + 1,
        season: 1,
        url: href
      });
    });
    if (episodes.length) return episodes;
    $("a[href]").toArray().map(a => $(a).attr("href")).filter(href => hostRank(href) >= 0).forEach((href, i) => {
      if (!href.startsWith("http") || episodes.some(e => e.url === href)) return;
      episodes.push({
        id: href,
        title: `${title} Option ${i + 1}`,
        number: i + 1,
        season: 1,
        url: href
      });
    });
    return episodes;
  };
  var fetchMediaInfo = async mediaId => {
    var url = pageUrl(mediaId ?? "", baseUrl);
    var {
      data
    } = await request(url);
    var $ = load(data);
    var content = $(".entry-content, .post-content").first();
    var infoText = $("h3, h4").filter((_, el) => /(series|movie)\s*info/i.test($(el).text())).first().nextAll().slice(0, 2).text().replace(/\s+/g, " ");
    var rawTitle = $("h1.entry-title").text().trim() || $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim() || "";
    var title = cleanTitle((rawTitle.split("|")[0] || "").trim());
    var image = $('meta[property="og:image"]').attr("content") || content.find("img[data-lazy-src]").attr("data-lazy-src") || content.find("img[data-src]").attr("data-src") || content.find("img").first().attr("src") || "";
    if (image.startsWith("//")) {
      image = `https:${image}`;
    }
    var synopsisHeader = $("h3, h4, h5").filter((_, el) => /synopsis|plot/i.test($(el).text()));
    var synopsis = (synopsisHeader.length > 0 ? synopsisHeader.next("p").text().trim() : "") || $('meta[property="og:description"]').attr("content")?.trim() || "";
    var imdbId = ($('a[href*="imdb.com"]').attr("href")?.match(/tt\d+/) || data.match(/tt\d{7,}/))?.[0];
    var ratingText = $(".imdb-score, .starstruck-rating").text() || /IMDb Rating\W*([\d.]+)/i.exec(infoText)?.[1] || "";
    var rating = /(\d+(?:\.\d+)?)/.exec(ratingText)?.[1];
    var pageText = `${title} ${content.text()}`;
    var isSeries = /\b(?:web\s*series|season\s*\d+|s\d+\s*e\d+)\b/i.test(pageText) || $('a:contains("V-Cloud"), a:contains("vcloud")').length > 1;
    var episodes = isSeries ? await fetchSeriesEpisodes($, url) : movieEpisodes($, title);
    if (!episodes.length) episodes.push({
      id: url,
      title: title || "Movie",
      url,
      number: 1,
      season: 1
    });
    return {
      id: pageId(url, baseUrl),
      title,
      url,
      image,
      description: synopsis,
      ...(imdbId ? {
        imdbId
      } : {}),
      ...(rating ? {
        rating: parseFloat(rating)
      } : {}),
      // "Released Year: 2008-2013" gives the first-air year; titles often carry a season's year
      releaseDate: extractYear(/Released?\s*Year\s*:?\s*([^\s]+)/i.exec(infoText)?.[1] ?? "") ?? extractYear(title),
      genres: $('a[rel="category tag"], .category a').map((_, el) => $(el).text().trim()).get().filter(g => g && !g.includes("1080p") && !g.includes("720p") && !g.includes("480p")),
      type: isSeries ? TvTypeEnum.TVSERIES : TvTypeEnum.MOVIE,
      episodes,
      totalEpisodes: episodes.length
    };
  };
  var resolveEpisodeUrl = async episodeId => {
    if (episodeId?.startsWith("http")) return episodeId;
    var url = (await fetchMediaInfo(episodeId)).episodes?.[0]?.url;
    if (!url) throw new Error(`Unable to resolve episode source for ${episodeId}`);
    return url;
  };
  var hubCloudServers = async url => {
    var servers = [];
    try {
      var {
        sources = []
      } = (await HubCloud(ctx).extract(new PolyURL(url))) ?? {};
      var _loop2 = async function () {
        var name = source.server || source.quality || "HubCloud";
        if (!servers.some(s => s.name === name)) servers.push({
          name,
          url: source.url
        });
      };
      for (var source of sources) {
        await _loop2();
      }
    } catch {}
    if (!servers.some(s => s.name.toLowerCase() === StreamingServersEnum.HubCloud)) {
      servers.push({
        name: "HubCloud",
        url
      });
    }
    return servers;
  };
  var fetchEpisodeServers = async (episodeId, _mediaId) => {
    var episodeUrl = await resolveEpisodeUrl(episodeId);
    if (episodeUrl.includes("vcloud") || episodeUrl.includes("hubcloud")) return hubCloudServers(episodeUrl);
    var $ = load((await request(episodeUrl)).data);
    var servers = [];
    var hubCloudLink = $('a[href*="vcloud"], a[href*="hubcloud"]').attr("href");
    if (hubCloudLink) servers.push(...(await hubCloudServers(hubCloudLink)));
    var fastDlLink = $('a[href*="fastdl"], a:contains("G-Direct")').attr("href");
    if (fastDlLink) servers.push({
      name: "FastDL",
      url: fastDlLink
    });
    var filePressLink = $('a[href*="filebee"], a[href*="filepress"]').attr("href");
    if (filePressLink) servers.push({
      name: "Filepress",
      url: filePressLink
    });
    return servers.length ? servers : [{
      name: "HubCloud",
      url: episodeUrl
    }];
  };
  var fastDlFile = async (url, referer) => {
    var {
      data
    } = await request(url, referer);
    var reurl = /var\s+reurl\s*=\s*['"]([^'"]+)['"]/.exec(data)?.[1];
    return reurl ? unwrapFastDlUrl(reurl) : void 0;
  };
  var filePressFile = async link => {
    var id = link.split("/").filter(Boolean).pop();
    var origin = link.split("/").slice(0, 3).join("/");
    var post = (path, fileId) => axios.post(`${origin}/api/file/${path}/`, {
      id: fileId,
      method: "indexDownlaod",
      captchaValue: null
    }, {
      headers: {
        "Content-Type": "application/json",
        "Referer": origin
      }
    });
    var token = await post("downlaod", id);
    if (!token.data?.status || !token.data?.data) return void 0;
    var file = (await post("downlaod2", token.data.data)).data?.data?.[0];
    return file?.startsWith("http") ? file : void 0;
  };
  var fetchEpisodeSources = async function (episodeId, _mediaId) {
    var server = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : StreamingServersEnum.HubCloud;
    var episodeUrl = await resolveEpisodeUrl(episodeId);
    var episodeQuality = /\b(2160p|4k|1080p|720p|480p|360p)\b/i.exec(episodeUrl)?.[1]?.toLowerCase().replace("4k", "2160p") ?? "auto";
    if (isFastDl(episodeUrl)) {
      var file = (await fastDlFile(episodeUrl, NEXDRIVE_URL)) ?? unwrapFastDlUrl(episodeUrl);
      return {
        headers: {
          Referer: `${new PolyURL(episodeUrl).origin}/`
        },
        sources: [{
          url: file,
          server: "FastDL",
          quality: episodeQuality,
          isM3U8: false
        }],
        download: file
      };
    }
    var mirrors = [];
    var hubCloudUrl = episodeUrl;
    if (!episodeUrl.includes("cloud")) {
      var {
        data: html
      } = await request(episodeUrl);
      hubCloudUrl = /<a\s+href="([^"]*cloud\.[^"]*)"/i.exec(html)?.[1] ?? episodeUrl;
      var fastDlLink = /<a\s+href="([^"]*fastdl\.[^"]*)"/i.exec(html)?.[1];
      if (fastDlLink) {
        try {
          var _file = await fastDlFile(fastDlLink, episodeUrl);
          if (_file) mirrors.push({
            url: _file,
            server: "FastDL",
            quality: episodeQuality,
            isM3U8: false
          });
        } catch {}
      }
      var $ = load(html);
      var filePressLink = $('.btn.btn-sm.btn-outline[style*="rgb(252,185,0)"]').parent().attr("href") || $('a[href*="filebee"], a[href*="filepress"]').attr("href");
      if (filePressLink) {
        try {
          var _file2 = await filePressFile(filePressLink);
          if (_file2) mirrors.push({
            url: _file2,
            server: "Filepress",
            quality: episodeQuality,
            isM3U8: false
          });
        } catch {}
      }
    }
    var headers = {
      Referer: baseUrl
    };
    var hubCloudSources = [];
    if (hubCloudUrl.includes("cloud")) {
      try {
        var res = await HubCloud(ctx).extract(new PolyURL(hubCloudUrl));
        if (Array.isArray(res?.sources)) {
          hubCloudSources = res.sources.map(s => ({
            ...s,
            server: s.server || s.quality || "HubCloud",
            // HubCloud labels some sources with their host instead of a quality
            quality: s.quality && s.quality !== "auto" && !/\b(?:server|worker|storage|drain|bot|cloud)\b/i.test(s.quality) ? s.quality : episodeQuality
          }));
          if (res.headers) headers = res.headers;
        }
      } catch (err) {
        if (!mirrors.length) throw err;
      }
    }
    var sources = [...mirrors, ...hubCloudSources];
    var wanted = server.toLowerCase();
    if (wanted !== StreamingServersEnum.HubCloud) {
      var matches = s => (s.server || "").toLowerCase().includes(wanted);
      if (sources.some(matches)) sources = [...sources.filter(matches), ...sources.filter(s => !matches(s))];
    }
    if (sources.length === 0) {
      throw new Error(`[VegaMovies] No streamable video sources found for ${episodeId}`);
    }
    return {
      headers,
      sources,
      download: sources[0]?.url
    };
  };
  var fetchLatest = function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchListing("", page);
  };
  var fetchByFilter = function (filter) {
    var page = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    return fetchListing(filter.replace(/^\/|\/$/g, ""), page);
  };
  var fetchRecentMovies = function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchByFilter("category/movies-by-genres", page);
  };
  var fetchRecentTVShows = function () {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return fetchByFilter("web-series", page);
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