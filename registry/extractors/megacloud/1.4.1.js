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

// src/extractors/megacloud.ts
var megacloud_exports = {};
__export(megacloud_exports, {
  MegaCloud: () => MegaCloud
});
module.exports = __toCommonJS(megacloud_exports);

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

// src/extractors/megacloud.ts
function MegaCloud(ctx) {
  var {
    axios,
    load,
    USER_AGENT,
    PolyURL
  } = ctx;
  function findNonce(embedPage) {
    var whole = embedPage.match(/\b[a-zA-Z0-9]{48}\b/)?.[0];
    if (whole) return whole;
    var parts = embedPage.match(/\b([a-zA-Z0-9]{16})\b[\s\S]*?\b([a-zA-Z0-9]{16})\b[\s\S]*?\b([a-zA-Z0-9]{16})\b/);
    return parts?.slice(1).join("");
  }
  var extract = async (videoUrl, referer) => {
    var embedUrl = toUrl(PolyURL, videoUrl);
    var headers = {
      "Accept": "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": referer,
      "User-Agent": USER_AGENT
    };
    var {
      data: embedPage
    } = await axios.get(embedUrl.href, {
      headers
    });
    var player = load(embedPage)('[id$="-player"]');
    if (!player.length) throw new Error("[MegaCloud] The embed page has no player; the URL may have expired");
    var nonce = findNonce(embedPage);
    if (!nonce) throw new Error("[MegaCloud] Nonce not found");
    var basePath = embedUrl.pathname.split("/").slice(0, 4).join("/");
    var {
      data
    } = await axios.get(`${embedUrl.origin}${basePath}/getSources?id=${player.attr("data-id")}&_k=${nonce}`, {
      headers
    });
    if (data.encrypted) throw new Error("[MegaCloud] The sources are encrypted, which this extractor does not decrypt");
    var sources = [];
    for (var source of Array.isArray(data.sources) ? data.sources : []) {
      if (source.type !== "hls") {
        sources.push({
          url: source.file,
          isM3U8: false,
          quality: "default"
        });
        continue;
      }
      sources.push({
        url: source.file,
        isM3U8: true,
        quality: "auto"
      });
      var {
        data: master
      } = await axios.get(source.file, {
        headers: {
          "Referer": referer,
          "User-Agent": USER_AGENT
        }
      });
      sources.push(...hlsVariants(master, source.file));
    }
    return {
      sources,
      // The stream plays inside the embed page, so a player sends that page as the Referer.
      headers: {
        Referer: embedUrl.href
      },
      subtitles: data.tracks?.map(track => ({
        url: track.file,
        lang: track.label || track.kind
      })) ?? [],
      intro: data.intro ?? {
        start: 0,
        end: 0
      },
      outro: data.outro ?? {
        start: 0,
        end: 0
      }
    };
  };
  return {
    extract
  };
}