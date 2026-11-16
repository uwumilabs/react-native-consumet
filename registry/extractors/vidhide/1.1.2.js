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

// src/extractors/vidhide.ts
var vidhide_exports = {};
__export(vidhide_exports, {
  VidHide: () => VidHide
});
module.exports = __toCommonJS(vidhide_exports);

// src/extractors/hls.ts
var M3U8_URL = /https?:\/\/[^"]+?\.m3u8[^"]*/;
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

// src/extractors/packer.ts
var PACKED = /\beval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]+?\}\s*\(\s*'((?:[^'\\]|\\[\s\S])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:[^'\\]|\\[\s\S])*)'\s*\.split\s*\(\s*'(.+?)'\s*\)/;
var unescapeJs = text => text.replace(/\\(.)/g, (_, char) => char === "n" ? "\n" : char === "r" ? "\r" : char === "t" ? "	" : char);
function unpack(block) {
  var radix = parseInt(block[2], 10);
  var count = parseInt(block[3], 10);
  var words = unescapeJs(block[4]).split(block[5]);
  var encode = n => {
    var rest = n % radix;
    return (n < radix ? "" : encode(Math.floor(n / radix))) + (rest > 35 ? String.fromCharCode(rest + 29) : rest.toString(36));
  };
  var dictionary = /* @__PURE__ */new Map();
  for (var i = 0; i < count; i++) dictionary.set(encode(i), words[i] || encode(i));
  return unescapeJs(block[1]).replace(/\b\w+\b/g, word => dictionary.get(word) ?? word);
}
function unpackScripts(text) {
  var blocks = new RegExp(PACKED.source, "g");
  var scripts = [];
  var block;
  while (block = blocks.exec(text)) scripts.push(unpack(block));
  return scripts;
}

// src/extractors/url.ts
function toUrl(URLClass, url) {
  return typeof url === "string" ? new URLClass(url) : url;
}

// src/extractors/vidhide.ts
function VidHide(ctx) {
  var {
    axios,
    USER_AGENT,
    PolyURL
  } = ctx;
  var extract = async videoUrl => {
    var url = toUrl(PolyURL, videoUrl);
    var {
      data
    } = await axios.get(url.href, {
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": url.origin
      }
    });
    var scripts = unpackScripts(data);
    if (!scripts.length) throw new Error("No packed script found");
    var m3u8Link = scripts.map(code => code.match(M3U8_URL)?.[0]).find(Boolean);
    if (!m3u8Link) throw new Error("No m3u8 link found");
    var {
      data: master
    } = await axios.get(m3u8Link, {
      headers: {
        "Referer": m3u8Link,
        "User-Agent": USER_AGENT
      }
    });
    return {
      sources: [{
        quality: "auto",
        url: m3u8Link,
        isM3U8: true
      }, ...hlsVariants(master, m3u8Link)],
      subtitles: []
    };
  };
  return {
    extract
  };
}