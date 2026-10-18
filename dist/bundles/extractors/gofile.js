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

// src/extractors/gofile.ts
var gofile_exports = {};
__export(gofile_exports, {
  Gofile: () => Gofile
});
module.exports = __toCommonJS(gofile_exports);
var GOFILE_API = "https://api.gofile.io";
var GOFILE_LANGUAGE = "en-US";
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var cachedAccountToken = null;
var cachedGenerateWT = null;
var cachedWTTime = 0;
async function getOrFetchGenerateWT(axiosClient, userAgent) {
  var now = Date.now();
  if (cachedGenerateWT && now - cachedWTTime < 3 * 60 * 60 * 1e3) {
    return cachedGenerateWT;
  }
  try {
    var res = await axiosClient.get("https://gofile.io/js/wt.obf.js", {
      headers: {
        "User-Agent": userAgent,
        "Referer": "https://gofile.io/"
      }
    });
    var code = res.data;
    var runner = new Function("navigator", "window", "document", "location", `${code}
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
  var serverName = "Gofile";
  var sources = [];
  var {
    axios: client,
    USER_AGENT,
    PolyURL
  } = ctx;
  var userAgent = USER_AGENT || DEFAULT_USER_AGENT;
  var extract = async videoUrl => {
    try {
      var urlHref = typeof videoUrl === "string" ? videoUrl : videoUrl.href;
      var urlObj = typeof videoUrl === "object" && videoUrl.origin ? videoUrl : new PolyURL(urlHref);
      var id = urlObj.searchParams.get("c") || urlObj.pathname.split("/").filter(Boolean).pop() || urlHref;
      var token = await getOrFetchToken(client, userAgent);
      var generateWT = await getOrFetchGenerateWT(client, userAgent);
      var websiteToken = generateWT(token);
      var response = await client.get(`${GOFILE_API}/contents/${id}`, {
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
      var file = findFirstFile(response.data.data);
      if (!file?.link) {
        throw new Error("[Gofile] No downloadable file found in Gofile response");
      }
      var defaultSource = {
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
if (module.exports !== exports) Object.assign(exports, module.exports);