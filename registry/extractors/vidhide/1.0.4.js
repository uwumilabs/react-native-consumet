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
function VidHide(ctx) {
  var serverName = "VidHide";
  var sources = [];
  var {
    axios,
    USER_AGENT,
    NativeConsumet
  } = ctx;
  var extract = async videoUrl => {
    try {
      var {
        data
      } = await axios.get(videoUrl.href, {
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": videoUrl.origin
        }
      }).catch(() => {
        throw new Error("Video not found");
      });
      var packedScript = /eval(\(f.*?)\s*<\/script>/s.exec(data)?.[1];
      if (!packedScript) throw new Error("No packed script found");
      var unpackedData = await NativeConsumet.deobfuscateScript(packedScript);
      if (!unpackedData) throw new Error("Failed to deobfuscate script");
      var links = unpackedData.match(/https?:\/\/[^"]+?\.m3u8[^"]*/g) ?? [];
      var m3u8Link = links[0];
      if (!m3u8Link) throw new Error("No m3u8 link found");
      var m3u8Content = await axios.get(m3u8Link, {
        headers: {
          "Referer": m3u8Link,
          "User-Agent": USER_AGENT
        }
      });
      var videoSources = [{
        quality: "auto",
        url: m3u8Link,
        isM3U8: m3u8Link.includes(".m3u8")
      }];
      if (m3u8Content.data.includes("EXTM3U")) {
        var pathWithoutMaster = m3u8Link.split("/master.m3u8")[0];
        var videoList = m3u8Content.data.split("#EXT-X-STREAM-INF:");
        for (var video of videoList ?? []) {
          if (!video.includes("m3u8")) continue;
          var url = video.split("\n")[1];
          var quality = /RESOLUTION=\d+x(\d+)/.exec(video)?.[1];
          videoSources.push({
            url: `${pathWithoutMaster}/${url}`,
            quality: `${quality}p`,
            isM3U8: url.includes(".m3u8")
          });
        }
      }
      return {
        sources: videoSources,
        subtitles: []
      };
    } catch (err) {
      throw new Error(err.message);
    }
  };
  return {
    serverName,
    sources,
    extract
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);