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
  HubCloud: () => HubCloud
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
var isFastDl = url => /fastdl|fsl\./i.test(url);
function unwrapFastDlUrl(url) {
  var wrapped = url.match(/\/dl\.php\?link=(.+)$/)?.[1];
  if (!wrapped) return url;
  return /^https?%3A/i.test(wrapped) ? decodeURIComponent(wrapped) : wrapped;
}
var isGofilePage = url => /^https?:\/\/(?:www\.)?gofile\.io\//i.test(url);

// src/extractors/url.ts
function toUrl(URLClass, url) {
  return typeof url === "string" ? new URLClass(url) : url;
}

// src/extractors/hubcloud.ts
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
  var server = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
  var s = server.toLowerCase();
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
    CryptoJS,
    USER_AGENT,
    PolyURL
  } = ctx;
  function decodeBase64(value) {
    var base64 = value.replace(/\s+/g, "");
    if (base64.length % 4 === 0) base64 = base64.replace(/[=]{1,2}$/, "");
    if (base64.length % 4 === 1 || !/^[A-Za-z0-9+/]*$/.test(base64)) return "";
    return CryptoJS.enc.Base64.parse(base64).toString(CryptoJS.enc.Latin1);
  }
  function extractUrlFromScript(html) {
    var doubleEncoded = html.match(/(?:var|let|const)\s+\w+\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/)?.[1];
    if (doubleEncoded) return decodeBase64(decodeBase64(doubleEncoded));
    var plain = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/)?.[1];
    return decodeBase64(plain?.split("r=")?.[1] ?? "") || plain || "";
  }
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
    var gofilePages = $first("a[href*='gofile.io']").toArray().map(el => $first(el).attr("href")).filter(href => Boolean(href));
    var vcloudLink = extractUrlFromScript(firstPage) || $first(".fa-file-download.fa-lg").parent().attr("href") || url.href;
    if (vcloudLink.startsWith("/")) vcloudLink = `${baseUrl}${vcloudLink}`;
    var vcloudPage = "";
    if (isGofilePage(vcloudLink)) gofilePages.push(vcloudLink);else if (vcloudLink !== url.href) vcloudPage = (await axios.get(vcloudLink, {
      headers: pageHeaders
    })).data;
    var $ = load(vcloudPage || firstPage);
    if (pageQuality === "auto") {
      pageQuality = qualityIn($("title").text()) || qualityIn($(".card-header").text()) || qualityIn(vcloudLink) || "auto";
    }
    if (!fileSize) fileSize = parseSizeInBytes($('#size, .list-group-item:contains("Size")').text());
    var sources = [];
    var add = (link, server) => {
      if (sources.some(source => source.url === link)) return;
      sources.push({
        url: link,
        server,
        quality: pageQuality,
        isM3U8: link.includes(".m3u8"),
        size: fileSize
      });
    };
    var _loop2 = async function () {
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
          case isGofilePage(btnUrl):
            gofilePages.push(btnUrl);
            break;
          case btnUrl.includes("cloudflarestorage"):
            add(btnUrl, "CF Storage");
            break;
          case isFastDl(btnUrl):
            add(unwrapFastDlUrl(btnUrl), "FastDl");
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
      await _loop2();
    }
    for (var page of gofilePages) add(page, "Gofile");
    sources.sort((a, b) => hostPriority(a.server) - hostPriority(b.server));
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