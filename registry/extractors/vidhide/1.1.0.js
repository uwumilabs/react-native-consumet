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

// src/extractors/vidhide.ts
function VidHide(ctx) {
  var {
    axios,
    USER_AGENT,
    NativeConsumet,
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
    var packedScript = /eval(\(f.*?)\s*<\/script>/s.exec(data)?.[1];
    if (!packedScript) throw new Error("No packed script found");
    var unpackedData = await NativeConsumet.deobfuscateScript(packedScript);
    if (!unpackedData) throw new Error("Failed to deobfuscate script");
    var m3u8Link = unpackedData.match(/https?:\/\/[^"]+?\.m3u8[^"]*/)?.[0];
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
if (module.exports !== exports) Object.assign(exports, module.exports);