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

// src/extractors/hubcloud.ts
var hubcloud_exports = {};
__export(hubcloud_exports, {
  HubCloud: () => HubCloud,
  unwrapFastDlUrl: () => unwrapFastDlUrl
});
module.exports = __toCommonJS(hubcloud_exports);

// src/extractors/file-hosts.ts
function qualityIn(text) {
  var label = text.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i)?.[1]?.toLowerCase();
  return label === "4k" ? "2160p" : label;
}
function finalUrl(response, fallback) {
  return response.request?.responseURL || response.request?.res?.responseUrl || fallback;
}

// src/extractors/url.ts
function toUrl(URLClass, url) {
  return typeof url === "string" ? new URLClass(url) : url;
}

// src/extractors/gofile.ts
var GOFILE_API = "https://api.gofile.io";
var GOFILE_LANGUAGE = "en-US";
var cachedAccountToken = null;
var cachedGenerateWT = null;
var cachedWTTime = 0;
async function getOrFetchGenerateWT(axiosClient, userAgent) {
  var now = Date.now();
  if (cachedGenerateWT && now - cachedWTTime < 3 * 60 * 60 * 1e3) {
    return cachedGenerateWT;
  }
  var res = await axiosClient.get("https://gofile.io/js/wt.obf.js", {
    headers: {
      "User-Agent": userAgent,
      "Referer": "https://gofile.io/"
    }
  });
  var runner = new Function("navigator", "window", "document", "location", `${res.data}
return typeof generateWT !== 'undefined' ? generateWT : (window && window.generateWT);`);
  var fakeNav = {
    userAgent,
    language: GOFILE_LANGUAGE
  };
  var fakeWin = {
    navigator: fakeNav,
    location: {
      href: "https://gofile.io/",
      protocol: "https:",
      host: "gofile.io"
    }
  };
  var generateWT = runner(fakeNav, fakeWin, {}, fakeWin.location);
  if (typeof generateWT !== "function") throw new Error("[Gofile] wt.obf.js no longer defines generateWT");
  cachedGenerateWT = generateWT;
  cachedWTTime = now;
  return generateWT;
}
async function getOrFetchToken(axiosClient, userAgent) {
  if (cachedAccountToken) return cachedAccountToken;
  var accountResponse = await axiosClient.post(`${GOFILE_API}/accounts`, {}, {
    headers: {
      "User-Agent": userAgent,
      "Origin": "https://gofile.io",
      "Referer": "https://gofile.io/"
    }
  });
  var token = accountResponse.data?.data?.token;
  if (!token) throw new Error("[Gofile] Did not return an account token");
  cachedAccountToken = token;
  return token;
}
function findFirstFile(content) {
  if (content?.type === "file" && content?.link) return content;
  for (var child of Object.values(content?.children ?? {})) {
    var file = findFirstFile(child);
    if (file) return file;
  }
  return void 0;
}
function Gofile(ctx) {
  var {
    axios,
    USER_AGENT,
    PolyURL
  } = ctx;
  var extract = async videoUrl => {
    var url = toUrl(PolyURL, videoUrl);
    var id = url.searchParams.get("c") || url.pathname.split("/").filter(Boolean).pop() || url.href;
    var token = await getOrFetchToken(axios, USER_AGENT);
    var generateWT = await getOrFetchGenerateWT(axios, USER_AGENT);
    var response = await axios.get(`${GOFILE_API}/contents/${id}`, {
      params: {
        contentFilter: "",
        page: 1,
        pageSize: 1e3,
        sortField: "name",
        sortDirection: 1
      },
      headers: {
        "Accept": "*/*",
        "Accept-Language": `${GOFILE_LANGUAGE},en;q=0.9`,
        "Authorization": `Bearer ${token}`,
        "Origin": "https://gofile.io",
        "Referer": "https://gofile.io/",
        "User-Agent": USER_AGENT,
        "X-BL": GOFILE_LANGUAGE,
        "X-Website-Token": generateWT(token)
      },
      // The answer's status is read below, so a rejected account token is dropped and the next call makes another.
      validateStatus: () => true
    });
    if (response.data?.status !== "ok") {
      if (response.data?.status === "error-auth" || response.status === 401) cachedAccountToken = null;
      throw new Error(`[Gofile] API returned ${response.data?.status ?? `HTTP ${response.status}`}`);
    }
    var file = findFirstFile(response.data.data);
    if (!file?.link) throw new Error("[Gofile] No downloadable file found in Gofile response");
    var source = {
      url: file.link,
      isM3U8: file.link.includes(".m3u8"),
      isDASH: file.link.includes(".mpd"),
      quality: "auto"
    };
    return {
      sources: [source],
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": "https://gofile.io/",
        "Cookie": `accountToken=${token}`
      },
      download: file.link
    };
  };
  return {
    extract
  };
}

// src/extractors/hubcloud.ts
function decodeBase64(value) {
  try {
    return atob(value);
  } catch {
    return "";
  }
}
function extractUrlFromScript(html) {
  var doubleEncoded = html.match(/(?:var|let|const)\s+\w+\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/)?.[1];
  if (doubleEncoded) return decodeBase64(decodeBase64(doubleEncoded));
  var plain = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/)?.[1];
  return decodeBase64(plain?.split("r=")?.[1] ?? "") || plain || "";
}
var unwrapFastDlUrl = url => {
  var wrapped = url.match(/\/dl\.php\?link=(.+)$/)?.[1];
  if (!wrapped) return url;
  return /^https?%3A/i.test(wrapped) ? decodeURIComponent(wrapped) : wrapped;
};
var pixelDrainRedirect = function () {
  for (var _len = arguments.length, pages = new Array(_len), _key = 0; _key < _len; _key++) {
    pages[_key] = arguments[_key];
  }
  return pages.map(html => html.match(/var\s+pxl\s*=\s*['"]([^'"]+)['"];?/i)?.[1]).find(Boolean) ?? "";
};
function parseSizeInBytes(text) {
  var match = text.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!match) return void 0;
  var val = parseFloat(match[1]);
  var unit = match[2].toUpperCase();
  if (unit === "GB") return Math.round(val * 1024 * 1024 * 1024);
  if (unit === "MB") return Math.round(val * 1024 * 1024);
  if (unit === "KB") return Math.round(val * 1024);
  return Math.round(val);
}
function hostPriority() {
  var serverName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
  var s = serverName.toLowerCase();
  if (s.includes("cf storage") || s.includes("storage")) return 1;
  if (s.includes("cf worker") || s.includes("worker") || s.includes("fast cloud")) return 2;
  if (s.includes("gofile")) return 3;
  if (s.includes("pixeldrain")) return 4;
  if (s.includes("fastdl") || s.includes("fsl")) return 5;
  if (s.includes("hubcdn")) return 6;
  if (s.includes("gdrive") || s.includes("google")) return 7;
  return 10;
}
function HubCloud(ctx) {
  var {
    axios,
    load,
    USER_AGENT,
    PolyURL
  } = ctx;
  var extract = async (videoUrl, referer) => {
    var url = toUrl(PolyURL, videoUrl);
    var baseUrl = url.origin;
    var pageHeaders = {
      "User-Agent": USER_AGENT,
      "Referer": referer || baseUrl
    };
    var {
      data: firstPage
    } = await axios.get(url.href, {
      headers: pageHeaders
    });
    var $first = load(firstPage);
    var pageQuality = qualityIn($first("title").text()) || qualityIn($first(".card-header").text()) || qualityIn(url.href) || "auto";
    var fileSize = parseSizeInBytes($first('#size, .list-group-item:contains("Size")').text());
    var sources = [];
    var addGofileSources = res => {
      var _loop2 = function (s) {
        if (sources.some(item => item.url === s.url)) return 1; // continue
        sources.push({
          ...s,
          server: "Gofile",
          quality: pageQuality !== "auto" ? pageQuality : s.quality || "auto",
          size: s.size || fileSize
        });
      };
      for (var s of res.sources) {
        if (_loop2(s)) continue;
      }
    };
    var tryGofile = async link => {
      try {
        addGofileSources(await Gofile(ctx).extract(link));
      } catch {}
    };
    for (var el of $first("a[href*='gofile.io']").toArray()) {
      var href = $first(el).attr("href");
      if (href) await tryGofile(href);
    }
    var vcloudLink = extractUrlFromScript(firstPage) || $first(".fa-file-download.fa-lg").parent().attr("href") || url.href;
    if (vcloudLink.startsWith("/")) vcloudLink = `${baseUrl}${vcloudLink}`;
    if (vcloudLink.includes("gofile.io")) await tryGofile(vcloudLink);
    var vcloudPage = "";
    if (!vcloudLink.includes("gofile.io") && vcloudLink !== url.href) {
      vcloudPage = (await axios.get(vcloudLink, {
        headers: pageHeaders
      })).data;
    }
    var $ = load(vcloudPage || firstPage);
    if (pageQuality === "auto") {
      pageQuality = qualityIn($("title").text()) || qualityIn($(".card-header").text()) || qualityIn(vcloudLink) || "auto";
    }
    if (!fileSize) fileSize = parseSizeInBytes($('#size, .list-group-item:contains("Size")').text());
    var add = (link, server) => sources.push({
      url: link,
      server,
      quality: pageQuality,
      isM3U8: link.includes(".m3u8"),
      size: fileSize
    });
    var _loop3 = async function () {
      var btnUrl = $(element).attr("href") || "";
      try {
        switch (true) {
          case btnUrl.includes("pixeld"):
            if (!btnUrl.includes("api")) {
              btnUrl = pixelDrainRedirect(firstPage, vcloudPage) || btnUrl;
              var token = btnUrl.split("/").pop()?.split("?")[0];
              btnUrl = `${btnUrl.split("/").slice(0, -2).join("/")}/api/file/${token}?download`;
            }
            add(btnUrl, "Pixeldrain");
            break;
          case btnUrl.includes(".dev") && !btnUrl.includes("/?id="):
            add(btnUrl, "CF Worker");
            break;
          case btnUrl.includes("hubcloud") || btnUrl.includes("/?id="):
            {
              var res = await axios.get(btnUrl, {
                headers: pageHeaders,
                validateStatus: () => true
              });
              var redirected = finalUrl(res, btnUrl);
              add(redirected.includes("?link=") ? redirected.split("?link=")[1] || redirected : redirected, "GDrive (download only)");
              break;
            }
          case btnUrl.includes("gofile.io"):
            addGofileSources(await Gofile(ctx).extract(btnUrl));
            break;
          case btnUrl.includes("cloudflarestorage"):
            add(btnUrl, "CF Storage");
            break;
          case btnUrl.includes("fastdl") || btnUrl.includes("fsl."):
            sources.push({
              url: unwrapFastDlUrl(btnUrl),
              server: "FastDl",
              quality: pageQuality,
              isM3U8: btnUrl.includes(".m3u8"),
              size: fileSize
            });
            break;
          case btnUrl.includes("hubcdn") && !btnUrl.includes("/?id="):
            add(btnUrl, "HubCdn");
            break;
          default:
            if ([".m3u8", ".mp4", ".mkv", "?token="].some(part => btnUrl.includes(part))) add(btnUrl, "CF Worker");
            break;
        }
      } catch {}
    };
    for (var element of $(".btn-success.btn-lg.h6, .btn-danger, .btn-secondary").toArray()) {
      await _loop3();
    }
    sources.sort((a, b) => hostPriority(a.server || a.quality) - hostPriority(b.server || b.quality));
    return {
      sources,
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": baseUrl
      }
    };
  };
  return {
    extract
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);