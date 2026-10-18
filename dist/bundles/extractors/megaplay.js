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

// src/extractors/megaplay.ts
var megaplay_exports = {};
__export(megaplay_exports, {
  MegaPlay: () => MegaPlay
});
module.exports = __toCommonJS(megaplay_exports);
var MEGA_KEY_STR = "i?LMTAx0Q6,:}50U";
var MEGA_IV_STR = "W0;27ToaUpl_P%'c";
var SEGMENT_RE = /\/segment\/([A-Za-z0-9_-]+)/;
function MegaPlay(ctx) {
  var serverName = "MegaPlay";
  var sources = [];
  var client = ctx.axios;
  var load = ctx.load;
  var CryptoJS = ctx.CryptoJS;
  var userAgent = ctx.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
  function megaPlayDecrypt(encB64Url) {
    var b64 = encB64Url.replace(/-/g, "+").replace(/_/g, "/");
    var padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
    var key = CryptoJS.enc.Latin1.parse(MEGA_KEY_STR + "\0".repeat(16));
    var iv = CryptoJS.enc.Latin1.parse(MEGA_IV_STR);
    var ciphertext = CryptoJS.enc.Base64.parse(padded);
    var cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext
    });
    var decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
  function resolveSegmentUrl(raw) {
    var m = raw.match(SEGMENT_RE);
    if (!m || !m[1]) return raw;
    try {
      var decrypted = megaPlayDecrypt(m[1]);
      return decrypted || raw;
    } catch {
      return raw;
    }
  }
  function extractStreamUrl(data) {
    if (!data || typeof data !== "object") return null;
    if (typeof data.enc === "string" && data.enc.length > 0) {
      try {
        var plain = megaPlayDecrypt(data.enc);
        if (plain) {
          try {
            var parsed = JSON.parse(plain);
            var url = (typeof parsed?.sources?.file === "string" ? parsed.sources.file : null) || (Array.isArray(parsed?.sources) && parsed.sources[0]?.file ? String(parsed.sources[0].file) : null) || (typeof parsed?.file === "string" ? parsed.file : null);
            if (url) return resolveSegmentUrl(url);
          } catch {}
          if (/^https?:\/\//i.test(plain) || plain.includes(".m3u8")) {
            return plain.trim();
          }
        }
      } catch {}
    }
    var rawUrl = (typeof data?.sources?.file === "string" ? data.sources.file : null) || (Array.isArray(data?.sources) && data.sources[0]?.file ? String(data.sources[0].file) : null);
    if (rawUrl) return resolveSegmentUrl(rawUrl);
    return null;
  }
  var extract = async (videoUrl, referer) => {
    var embedHref = typeof videoUrl === "string" ? videoUrl : videoUrl.href;
    var urlObj = typeof videoUrl === "object" && videoUrl.origin ? videoUrl : new (ctx.PolyURL || URL)(embedHref);
    var origin = urlObj.origin || "https://megaplay.buzz";
    var pageReferer = referer || embedHref;
    var cookieJar = [];
    var parseCookies = headers => {
      var raw = headers?.["set-cookie"];
      if (!raw) return [];
      var arr = Array.isArray(raw) ? raw : [raw];
      return arr.map(c => c.split(";")[0] ?? "").filter(Boolean);
    };
    var pageRes = await client.get(embedHref, {
      headers: {
        "User-Agent": userAgent,
        "Referer": pageReferer,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    cookieJar.push(...parseCookies(pageRes.headers));
    var $ = load(pageRes.data);
    var playerDiv = $("#megaplay-player");
    if (!playerDiv.length) {
      throw new Error("[MegaPlay] Could not find player element (#megaplay-player)");
    }
    var mediaId = playerDiv.attr("data-id");
    if (!mediaId) {
      throw new Error("[MegaPlay] Could not find data-id on player element");
    }
    var sParam = urlObj.searchParams?.get("s");
    var sQuery = sParam ? `&s=${encodeURIComponent(sParam)}` : "";
    var cookieHeader = () => cookieJar.join("; ");
    var ajaxHeaders = () => ({
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${origin}/`,
      "Origin": origin,
      "User-Agent": userAgent,
      "Accept": "application/json, text/javascript, */*; q=0.01",
      ...(cookieJar.length ? {
        Cookie: cookieHeader()
      } : {})
    });
    var fetchJson = async url => {
      try {
        var res = await client.get(url, {
          headers: ajaxHeaders()
        });
        cookieJar.push(...parseCookies(res.headers));
        var data = res.data;
        return typeof data === "string" ? JSON.parse(data) : data;
      } catch {
        return null;
      }
    };
    var [defSourcesJson, newSourcesJson] = await Promise.all([fetchJson(`${origin}/stream/getSources?id=${mediaId}${sQuery}`), fetchJson(`${origin}/stream/getSourcesNew?id=${mediaId}${sQuery}`)]);
    var streamUrl = extractStreamUrl(defSourcesJson) || extractStreamUrl(newSourcesJson);
    if (!streamUrl) {
      throw new Error("[MegaPlay] No video stream URL found from /getSources or /getSourcesNew");
    }
    var cleanStreamUrl = streamUrl.replace(/\\/g, "").trim();
    var isM3U8 = cleanStreamUrl.includes(".m3u8");
    var extractedSources = [];
    var defaultSource = {
      url: cleanStreamUrl,
      isM3U8,
      quality: "auto"
    };
    if (isM3U8) {
      try {
        var {
          data: m3u8Data
        } = await client.get(cleanStreamUrl, {
          headers: {
            "Referer": `${origin}/`,
            "User-Agent": userAgent
          }
        });
        if (typeof m3u8Data === "string" && m3u8Data.includes("#EXT-X-STREAM-INF")) {
          var lines = m3u8Data.split("\n");
          var streamBasePath = cleanStreamUrl.substring(0, cleanStreamUrl.lastIndexOf("/"));
          var streamOrigin = new (ctx.PolyURL || URL)(cleanStreamUrl).origin;
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i]?.trim();
            if (line?.startsWith("#EXT-X-STREAM-INF")) {
              var resMatch = line.match(/RESOLUTION=\d+x(\d+)/);
              var quality = resMatch ? `${resMatch[1]}p` : `quality_${extractedSources.length + 1}`;
              var next = lines[i + 1]?.trim();
              if (next && !next.startsWith("#")) {
                var variantUrl = next.startsWith("http://") || next.startsWith("https://") ? next : next.startsWith("/") ? `${streamOrigin}${next}` : `${streamBasePath}/${next}`;
                extractedSources.push({
                  url: variantUrl,
                  isM3U8: true,
                  quality
                });
              }
            }
          }
        }
      } catch {}
    }
    var finalSources = extractedSources.length > 0 ? [...extractedSources, defaultSource] : [defaultSource];
    var tracks = defSourcesJson?.tracks ?? newSourcesJson?.tracks ?? [];
    var subtitles = [];
    if (Array.isArray(tracks)) {
      for (var track of tracks) {
        if (track?.file) {
          subtitles.push({
            url: String(track.file).replace(/\\/g, ""),
            lang: track.label || track.kind || "English"
          });
        }
      }
    }
    var intro = defSourcesJson?.intro ?? newSourcesJson?.intro;
    var outro = defSourcesJson?.outro ?? newSourcesJson?.outro;
    var playerHeaders = {
      "Referer": `${origin}/`,
      "Origin": origin,
      "User-Agent": userAgent
    };
    if (cookieJar.length) {
      playerHeaders.Cookie = cookieHeader();
    }
    return {
      sources: finalSources,
      subtitles,
      headers: playerHeaders,
      intro: intro ? {
        start: intro.start,
        end: intro.end
      } : void 0,
      outro: outro ? {
        start: outro.start,
        end: outro.end
      } : void 0,
      embedURL: embedHref
    };
  };
  return {
    serverName,
    sources,
    extract
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);