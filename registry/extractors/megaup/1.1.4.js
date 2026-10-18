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

// src/extractors/megaup.ts
var megaup_exports = {};
__export(megaup_exports, {
  MegaUp: () => MegaUp
});
module.exports = __toCommonJS(megaup_exports);
function MegaUp(ctx) {
  var serverName = "MegaUp";
  var sources = [];
  var apiBase = "https://enc-dec.app/api";
  var client = ctx.axios;
  var userAgent = ctx.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
  var decodeSources = async payload => {
    try {
      var {
        data
      } = await client.post(`${apiBase}/dec-mega`, {
        text: payload,
        agent: userAgent
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return data.result;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  var extract = async videoUrl => {
    try {
      var mediaUrl = videoUrl.href.replace("/e/", "/media/");
      var subsUrl = videoUrl.searchParams.get("sub.list");
      var externalSubs = [];
      if (subsUrl) {
        externalSubs = await client.get(subsUrl).then(res => res.data.map(sub => ({
          kind: sub.kind,
          url: sub.file,
          lang: sub.label
        })));
      }
      var {
        data
      } = await client.get(mediaUrl, {
        headers: {
          "Connection": "keep-alive",
          "User-Agent": userAgent
        }
      });
      var decrypted = await decodeSources(data.result);
      var defaultSource = {
        url: decrypted.sources[0]?.file,
        isM3U8: decrypted.sources[0]?.file.includes(".m3u8"),
        quality: "auto"
      };
      var {
        data: sourceRes
      } = await client.get(decrypted.sources[0]?.file, {
        headers: {
          "Connection": "keep-alive",
          "User-Agent": userAgent
        }
      });
      if (sourceRes.includes("#EXT-X-STREAM-INF")) {
        var lines = sourceRes.split("\n");
        var qualitySources = [];
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
            var resolutionMatch = lines[i].match(/RESOLUTION=\d+x(\d+)/);
            var quality = resolutionMatch ? `${resolutionMatch[1]}p` : `quality${qualitySources.length + 1}`;
            var url = decrypted.sources[0]?.file.split("/list")[0] + "/" + lines[i + 1];
            qualitySources.push({
              url,
              isM3U8: true,
              quality
            });
          }
        }
        return {
          sources: [qualitySources, defaultSource].flat(),
          subtitles: [...decrypted.tracks.map(track => ({
            kind: track.kind,
            url: track.file,
            lang: track.label || track.kind || "English"
          })), ...(externalSubs.length > 0 ? externalSubs : [])],
          download: decrypted.download
        };
      }
      return {
        sources: [defaultSource],
        subtitles: [...decrypted.tracks.map(track => ({
          kind: track.kind,
          url: track.file,
          lang: track.label || track.kind
        })), ...(externalSubs.length > 0 ? externalSubs : [])],
        download: decrypted.download
      };
    } catch (error) {
      throw new Error(error.message);
    }
  };
  return {
    serverName,
    sources,
    extract
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);