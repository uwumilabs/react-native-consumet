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
var HIDDEN_GLOBALS = ["global", "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "require", "module", "exports", "process", "nativeModuleProxy", "__turboModuleProxy", "__fbBatchedBridge", "NativeConsumet", "localStorage", "sessionStorage", "indexedDB"];
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
  var runner = new Function(["navigator", "window", "document", "location", "self", "globalThis"].concat(HIDDEN_GLOBALS).join(","), `${res.data}
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
  var generateWT = runner.call(fakeWin, fakeNav, fakeWin, {}, fakeWin.location, fakeWin, fakeWin);
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