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
    for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    });
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
  default: () => hubcloud_default
});
module.exports = __toCommonJS(hubcloud_exports);

// src/extractors/gofile.ts
var GOFILE_API = "https://api.gofile.io";
var GOFILE_LANGUAGE = "en-US";
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var cachedAccountToken = null;
var cachedGenerateWT = null;
var cachedWTTime = 0;
async function getOrFetchGenerateWT(axiosClient, userAgent) {
  const now = Date.now();
  if (cachedGenerateWT && now - cachedWTTime < 3 * 60 * 60 * 1e3) {
    return cachedGenerateWT;
  }
  try {
    const res = await axiosClient.get("https://gofile.io/js/wt.obf.js", {
      headers: {
        "User-Agent": userAgent,
        "Referer": "https://gofile.io/"
      }
    });
    const code = res.data;
    const runner = new Function("navigator", "window", "document", "location", `${code}
return typeof generateWT !== 'undefined' ? generateWT : (window && window.generateWT);`);
    const fakeNav = {
      userAgent,
      language: GOFILE_LANGUAGE
    };
    const fakeWin = {
      navigator: fakeNav,
      location: {
        href: "https://gofile.io/",
        protocol: "https:",
        host: "gofile.io"
      }
    };
    const generateWT = runner(fakeNav, fakeWin, {}, fakeWin.location);
    if (typeof generateWT === "function") {
      cachedGenerateWT = generateWT;
      cachedWTTime = now;
      return generateWT;
    }
  } catch (err) {
    console.warn("[Gofile] Failed to fetch or execute wt.obf.js:", err?.message || err);
  }
  return accountToken => accountToken;
}
async function getOrFetchToken(axiosClient, userAgent) {
  if (cachedAccountToken) return cachedAccountToken;
  const accountResponse = await axiosClient.post(`${GOFILE_API}/accounts`, {}, {
    headers: {
      "User-Agent": userAgent,
      "Origin": "https://gofile.io",
      "Referer": "https://gofile.io/"
    }
  });
  const token = accountResponse.data?.data?.token;
  if (!token) throw new Error("[Gofile] Did not return an account token");
  cachedAccountToken = token;
  return token;
}
function findFirstFile(content) {
  if (content?.type === "file" && content?.link) return content;
  for (const child of Object.values(content?.children ?? {})) {
    const file = findFirstFile(child);
    if (file) return file;
  }
  return void 0;
}
function Gofile(ctx) {
  const serverName = "Gofile";
  const sources = [];
  const {
    axios: client,
    USER_AGENT,
    PolyURL
  } = ctx;
  const userAgent = USER_AGENT || DEFAULT_USER_AGENT;
  const extract = async videoUrl => {
    try {
      const urlHref = typeof videoUrl === "string" ? videoUrl : videoUrl.href;
      const urlObj = typeof videoUrl === "object" && videoUrl.origin ? videoUrl : new PolyURL(urlHref);
      const id = urlObj.searchParams.get("c") || urlObj.pathname.split("/").filter(Boolean).pop() || urlHref;
      const token = await getOrFetchToken(client, userAgent);
      const generateWT = await getOrFetchGenerateWT(client, userAgent);
      const websiteToken = generateWT(token);
      const response = await client.get(`${GOFILE_API}/contents/${id}`, {
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
          "User-Agent": userAgent,
          "X-BL": GOFILE_LANGUAGE,
          "X-Website-Token": websiteToken
        }
      });
      if (response.data?.status !== "ok") {
        if (response.data?.status === "error-auth" || response.status === 401) {
          cachedAccountToken = null;
        }
        throw new Error(`[Gofile] API returned ${response.data?.status ?? "invalid data"}`);
      }
      const file = findFirstFile(response.data.data);
      if (!file?.link) {
        throw new Error("[Gofile] No downloadable file found in Gofile response");
      }
      const defaultSource = {
        url: file.link,
        isM3U8: file.link.includes(".m3u8"),
        isDASH: file.link.includes(".mpd"),
        quality: "auto"
      };
      return {
        sources: [defaultSource],
        headers: {
          "User-Agent": userAgent,
          "Referer": "https://gofile.io/",
          "Cookie": `accountToken=${token}`
        },
        download: file.link
      };
    } catch (error) {
      throw new Error(`[Gofile] Failed to extract: ${error.message}`);
    }
  };
  return {
    serverName,
    sources,
    extract
  };
}

// src/extractors/hubcloud.ts
var DEFAULT_USER_AGENT2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function safeAtob(value) {
  if (!value) return "";
  if (typeof atob === "function") {
    try {
      return atob(value);
    } catch {}
  }
  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(value, "base64").toString("binary");
    } catch {}
  }
  return "";
}
var hubcloudDecode = function (value) {
  if (!value) return "";
  return safeAtob(value.toString());
};
var extractUrlFromScript = html => {
  const doubleAtobMatch = html.match(/(?:var|let|const)\s+\w+\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/);
  if (doubleAtobMatch?.[1]) {
    return safeAtob(safeAtob(doubleAtobMatch[1]));
  }
  const plainMatch = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
  return hubcloudDecode(plainMatch?.[1]?.split("r=")?.[1] ?? "") || plainMatch?.[1] || "";
};
var getPixelDrainUrl = html => {
  const match = html.match(/var\s+pxl\s*=\s*['"]([^'"]+)['"];?/i);
  return match?.[1] || "";
};
var getRedirectedPixelDrainUrl = function () {
  for (var _len = arguments.length, htmlSources = new Array(_len), _key = 0; _key < _len; _key++) {
    htmlSources[_key] = arguments[_key];
  }
  for (const html of htmlSources) {
    if (!html) continue;
    const redirectedUrl = getPixelDrainUrl(html);
    if (redirectedUrl) {
      return redirectedUrl;
    }
  }
  return "";
};
function HubCloud(ctx) {
  const serverName = "HubCloud";
  const sources = [];
  const {
    axios: client,
    load,
    USER_AGENT,
    PolyURL
  } = ctx;
  const userAgent = USER_AGENT || DEFAULT_USER_AGENT2;
  const extract = async (videoUrl, referer) => {
    try {
      const urlHref = typeof videoUrl === "string" ? videoUrl : videoUrl.href;
      const urlObj = typeof videoUrl === "object" && videoUrl.origin ? videoUrl : new PolyURL(urlHref);
      const baseUrl = urlObj.origin;
      const pageHeaders = {
        "User-Agent": userAgent,
        "Referer": referer || baseUrl,
        "Cookie": "ext_name=ojplmecpdpgccookcobabopnaifgidhf; xla=s4t; cf_clearance=woQrFGXtLfmEMBEiGUsVHrUBMT8s3cmguIzmMjmvpkg-1770053679-1.2.1.1-xBrQdciOJsweUF6F2T_OtH6jmyanN_TduQ0yslc_XqjU6RcHSxI7.YOKv6ry7oYo64868HYoULnVyww536H2eVI3R2e4wKzsky6abjPdfQPxqpUaXjxfJ02o6jl3_Vkwr4uiaU7Wy596Vdst3y78HXvVmKdIohhtPvp.vZ9_L7wvWdce0GRixjh_6JiqWmWMws46hwEt3hboaS1e1e4EoWCvj5b0M_jVwvSxBOAW5emFzvT3QrnRh4nyYmKDERnY"
      };
      const vLinkRes = await client.get(urlHref, {
        headers: pageHeaders
      });
      const vLinkText = vLinkRes.data;
      const $vLink = load(vLinkText);
      const extractQualityFromText = text => {
        const m = text.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
        if (m) {
          return m[1].toLowerCase() === "4k" ? "2160p" : m[1].toLowerCase();
        }
        return "";
      };
      const parseSizeInBytes = text => {
        const match = text.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
        if (!match) return void 0;
        const val = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        if (unit === "GB") return Math.round(val * 1024 * 1024 * 1024);
        if (unit === "MB") return Math.round(val * 1024 * 1024);
        if (unit === "KB") return Math.round(val * 1024);
        return Math.round(val);
      };
      let pageQuality = extractQualityFromText($vLink("title").text()) || extractQualityFromText($vLink(".card-header").text()) || extractQualityFromText(urlHref) || "auto";
      let fileSize = parseSizeInBytes($vLink('#size, .list-group-item:contains("Size")').text());
      const extractedSources = [];
      const addGofileSources = res => {
        const list = Array.isArray(res) ? res : res.sources;
        if (Array.isArray(list)) {
          for (const s of list) {
            if (!extractedSources.some(item => item.url === s.url)) {
              extractedSources.push({
                ...s,
                server: "Gofile",
                quality: pageQuality !== "auto" ? pageQuality : s.quality || "auto",
                size: s.size || fileSize
              });
            }
          }
        }
      };
      const vLinkGofileBtns = $vLink("a[href*='gofile.io']");
      for (const el of vLinkGofileBtns.toArray()) {
        const gfHref = $vLink(el).attr("href");
        if (gfHref) {
          try {
            const gofileRes = await Gofile(ctx).extract(new PolyURL(gfHref));
            addGofileSources(gofileRes);
          } catch {}
        }
      }
      let vcloudLink = extractUrlFromScript(vLinkText) || $vLink(".fa-file-download.fa-lg").parent().attr("href") || urlHref;
      if (vcloudLink?.startsWith("/")) {
        vcloudLink = `${baseUrl}${vcloudLink}`;
      }
      if (vcloudLink?.includes("gofile.io")) {
        try {
          const gofileRes = await Gofile(ctx).extract(new PolyURL(vcloudLink));
          addGofileSources(gofileRes);
        } catch {}
      }
      let vcloudText = "";
      if (vcloudLink && !vcloudLink.includes("gofile.io") && vcloudLink !== urlHref) {
        const vcloudRes = await client.get(vcloudLink, {
          headers: pageHeaders
        });
        vcloudText = vcloudRes.data;
      }
      const $ = load(vcloudText || vLinkText);
      if (pageQuality === "auto") {
        pageQuality = extractQualityFromText($("title").text()) || extractQualityFromText($(".card-header").text()) || extractQualityFromText(vcloudLink) || "auto";
      }
      if (!fileSize) {
        fileSize = parseSizeInBytes($('#size, .list-group-item:contains("Size")').text());
      }
      const linkClass = $(".btn-success.btn-lg.h6, .btn-danger, .btn-secondary");
      for (const element of linkClass.toArray()) {
        const itm = $(element);
        let btnUrl = itm.attr("href") || "";
        switch (true) {
          case btnUrl.includes("pixeld"):
            if (!btnUrl.includes("api")) {
              const redirectedPixelDrainUrl = getRedirectedPixelDrainUrl(vLinkText, vcloudText);
              if (redirectedPixelDrainUrl) {
                btnUrl = redirectedPixelDrainUrl;
              }
              const token = btnUrl.split("/").pop()?.split("?")[0];
              const pxlBaseUrl = btnUrl.split("/").slice(0, -2).join("/");
              btnUrl = `${pxlBaseUrl}/api/file/${token}?download`;
            }
            extractedSources.push({
              url: btnUrl,
              server: "Pixeldrain",
              quality: pageQuality,
              isM3U8: btnUrl.includes(".m3u8"),
              size: fileSize
            });
            break;
          case btnUrl.includes(".dev") && !btnUrl.includes("/?id="):
            extractedSources.push({
              url: btnUrl,
              server: "CF Worker",
              quality: pageQuality,
              isM3U8: btnUrl.includes(".m3u8"),
              size: fileSize
            });
            break;
          case btnUrl.includes("hubcloud") || btnUrl.includes("/?id="):
            try {
              let newUrl = btnUrl;
              try {
                if (typeof fetch !== "undefined") {
                  const fRes = await fetch(btnUrl, {
                    headers: pageHeaders,
                    redirect: "follow"
                  });
                  if (fRes.url && fRes.url.includes("googleusercontent")) {
                    newUrl = fRes.url.split("?link=")[1] || fRes.url;
                  } else if (fRes.url && fRes.url !== btnUrl) {
                    newUrl = fRes.url;
                  }
                }
              } catch {}
              if (!newUrl.includes("googleusercontent")) {
                try {
                  const res1 = await client.get(newUrl, {
                    headers: pageHeaders,
                    maxRedirects: 0,
                    validateStatus: s => s >= 200 && s < 400
                  });
                  if (res1.headers?.location) {
                    newUrl = res1.headers.location;
                  }
                  if (newUrl.includes("googleusercontent")) {
                    newUrl = newUrl.split("?link=")[1] || newUrl;
                  } else if (newUrl.includes("http")) {
                    const res2 = await client.get(newUrl, {
                      headers: pageHeaders,
                      maxRedirects: 0,
                      validateStatus: s => s >= 200 && s < 400
                    });
                    if (res2.headers?.location) {
                      const loc2 = res2.headers.location;
                      newUrl = loc2.includes("?link=") ? loc2.split("?link=")[1] : loc2;
                    }
                  }
                } catch {}
              }
              if (newUrl.includes("?link=")) {
                newUrl = newUrl.split("?link=")[1] || newUrl;
              }
              extractedSources.push({
                url: newUrl,
                server: "GDrive (download only)",
                quality: pageQuality,
                isM3U8: newUrl.includes(".m3u8"),
                size: fileSize
              });
            } catch {}
            break;
          case btnUrl.includes("gofile.io"):
            try {
              const gofileRes = await Gofile(ctx).extract(new PolyURL(btnUrl));
              addGofileSources(gofileRes);
            } catch {}
            break;
          case btnUrl.includes("cloudflarestorage"):
            extractedSources.push({
              url: btnUrl,
              server: "CF Storage",
              quality: pageQuality,
              isM3U8: btnUrl.includes(".m3u8"),
              size: fileSize
            });
            break;
          case btnUrl.includes("fastdl") || btnUrl.includes("fsl."):
            extractedSources.push({
              url: btnUrl,
              server: "FastDl",
              quality: pageQuality,
              isM3U8: btnUrl.includes(".m3u8"),
              size: fileSize
            });
            break;
          case btnUrl.includes("hubcdn") && !btnUrl.includes("/?id="):
            extractedSources.push({
              url: btnUrl,
              server: "HubCdn",
              quality: pageQuality,
              isM3U8: btnUrl.includes(".m3u8"),
              size: fileSize
            });
            break;
          default:
            if (btnUrl.includes(".m3u8") || btnUrl.includes(".mp4") || btnUrl.includes(".mkv") || btnUrl.includes("?token=")) {
              extractedSources.push({
                url: btnUrl,
                server: "CF Worker",
                quality: pageQuality,
                isM3U8: btnUrl.includes(".m3u8"),
                size: fileSize
              });
            }
            break;
        }
      }
      const getPriority = function () {
        let serverName2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        const s = serverName2.toLowerCase();
        if (s.includes("cf storage") || s.includes("storage")) return 1;
        if (s.includes("cf worker") || s.includes("worker") || s.includes("fast cloud")) return 2;
        if (s.includes("gofile")) return 3;
        if (s.includes("pixeldrain")) return 4;
        if (s.includes("fastdl") || s.includes("fsl")) return 5;
        if (s.includes("hubcdn")) return 6;
        if (s.includes("gdrive") || s.includes("google")) return 7;
        return 10;
      };
      extractedSources.sort((a, b) => getPriority(a.server || a.quality) - getPriority(b.server || b.quality));
      return {
        sources: extractedSources,
        headers: {
          "User-Agent": userAgent,
          "Referer": baseUrl
        }
      };
    } catch (error) {
      throw new Error(`[HubCloud] Failed to extract: ${error.message}`);
    }
  };
  return {
    serverName,
    sources,
    extract
  };
}
var hubcloud_default = HubCloud;
if (module.exports !== exports) Object.assign(exports, module.exports);