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

// src/extractors/hls.ts
function resolveUri(uri, playlistUrl) {
  if (/^https?:\/\//i.test(uri)) return uri;
  if (uri.startsWith("//")) return `${playlistUrl.split("//")[0]}${uri}`;
  if (uri.startsWith("/")) return `${playlistUrl.match(/^https?:\/\/[^/?#]+/i)?.[0] ?? ""}${uri}`;
  return `${playlistUrl.split(/[?#]/)[0].replace(/[^/]*$/, "")}${uri}`;
}
function hlsVariants(playlist, masterUrl) {
  if (typeof playlist !== "string") return [];
  var lines = playlist.split("\n").map(line => line.trim());
  var separateAudio = lines.some(line => line.startsWith("#EXT-X-MEDIA:") && line.includes("TYPE=AUDIO") && line.includes("URI="));
  if (separateAudio) return [];
  var variants = [];
  lines.forEach((line, i) => {
    var uri = lines[i + 1];
    if (!line.startsWith("#EXT-X-STREAM-INF") || !uri || uri.startsWith("#")) return;
    var height = line.match(/RESOLUTION=\d+x(\d+)/)?.[1];
    variants.push({
      url: resolveUri(uri, masterUrl),
      isM3U8: true,
      quality: height ? `${height}p` : `quality_${variants.length + 1}`
    });
  });
  return variants;
}

// src/extractors/url.ts
function toUrl(URLClass, url) {
  return typeof url === "string" ? new URLClass(url) : url;
}

// src/extractors/megaplay.ts
var MEGA_KEY_STR = "i?LMTAx0Q6,:}50U";
var MEGA_IV_STR = "W0;27ToaUpl_P%'c";
var SEGMENT_RE = /\/segment\/([A-Za-z0-9_-]+)/;
function MegaPlay(ctx) {
  var {
    axios,
    load,
    CryptoJS,
    USER_AGENT,
    PolyURL
  } = ctx;
  function megaPlayDecrypt(encB64Url) {
    var b64 = encB64Url.replace(/-/g, "+").replace(/_/g, "/");
    var padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
    var key = CryptoJS.enc.Latin1.parse(MEGA_KEY_STR + "\0".repeat(16));
    var iv = CryptoJS.enc.Latin1.parse(MEGA_IV_STR);
    var ciphertext = CryptoJS.enc.Base64.parse(padded);
    var decrypted = CryptoJS.AES.decrypt(CryptoJS.lib.CipherParams.create({
      ciphertext
    }), key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
  function resolveSegmentUrl(raw) {
    var token = raw.match(SEGMENT_RE)?.[1];
    if (!token) return raw;
    try {
      return megaPlayDecrypt(token) || raw;
    } catch {
      return raw;
    }
  }
  var fileOf = sources => (typeof sources?.file === "string" ? sources.file : null) || (Array.isArray(sources) && sources[0]?.file ? String(sources[0].file) : null);
  function extractStreamUrl(data) {
    if (!data || typeof data !== "object") return null;
    if (typeof data.enc === "string" && data.enc.length > 0) {
      var plain = "";
      try {
        plain = megaPlayDecrypt(data.enc);
      } catch {}
      if (plain) {
        var parsed;
        try {
          parsed = JSON.parse(plain);
        } catch {}
        var url = fileOf(parsed?.sources) || (typeof parsed?.file === "string" ? parsed.file : null);
        if (url) return resolveSegmentUrl(url);
        if (/^https?:\/\//i.test(plain) || plain.includes(".m3u8")) return plain.trim();
      }
    }
    var rawUrl = fileOf(data.sources);
    return rawUrl ? resolveSegmentUrl(rawUrl) : null;
  }
  var extract = async (videoUrl, referer) => {
    var embedUrl = toUrl(PolyURL, videoUrl);
    var embedHref = embedUrl.href;
    var origin = embedUrl.origin;
    var cookieJar = [];
    var parseCookies = headers => {
      var raw = headers?.["set-cookie"];
      if (!raw) return [];
      return (Array.isArray(raw) ? raw : [raw]).map(c => c.split(";")[0] ?? "").filter(Boolean);
    };
    var pageRes = await axios.get(embedHref, {
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": referer || embedHref,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    cookieJar.push(...parseCookies(pageRes.headers));
    var playerDiv = load(pageRes.data)("#megaplay-player");
    if (!playerDiv.length) throw new Error("[MegaPlay] Could not find player element (#megaplay-player)");
    var mediaId = playerDiv.attr("data-id");
    if (!mediaId) throw new Error("[MegaPlay] Could not find data-id on player element");
    var sParam = embedUrl.searchParams.get("s");
    var sQuery = sParam ? `&s=${encodeURIComponent(sParam)}` : "";
    var cookieHeader = () => cookieJar.join("; ");
    var fetchJson = async url => {
      try {
        var res = await axios.get(url, {
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Referer": `${origin}/`,
            "Origin": origin,
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/javascript, */*; q=0.01",
            ...(cookieJar.length ? {
              Cookie: cookieHeader()
            } : {})
          }
        });
        cookieJar.push(...parseCookies(res.headers));
        return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      } catch {
        return null;
      }
    };
    var [defSourcesJson, newSourcesJson] = await Promise.all([fetchJson(`${origin}/stream/getSources?id=${mediaId}${sQuery}`), fetchJson(`${origin}/stream/getSourcesNew?id=${mediaId}${sQuery}`)]);
    var streamUrl = extractStreamUrl(defSourcesJson) || extractStreamUrl(newSourcesJson);
    if (!streamUrl) throw new Error("[MegaPlay] No video stream URL found from /getSources or /getSourcesNew");
    var cleanStreamUrl = streamUrl.replace(/\\/g, "").trim();
    var isM3U8 = cleanStreamUrl.includes(".m3u8");
    var master = {
      url: cleanStreamUrl,
      isM3U8,
      quality: "auto"
    };
    var variants = isM3U8 ? hlsVariants((await axios.get(cleanStreamUrl, {
      headers: {
        "Referer": `${origin}/`,
        "User-Agent": USER_AGENT
      }
    })).data, cleanStreamUrl) : [];
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
      "User-Agent": USER_AGENT
    };
    if (cookieJar.length) playerHeaders.Cookie = cookieHeader();
    return {
      sources: [...variants, master],
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
    extract
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);