"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extractors/vidhide.ts
var vidhide_exports = {};
__export(vidhide_exports, {
  VidHide: () => VidHide
});
module.exports = __toCommonJS(vidhide_exports);
function VidHide(ctx) {
  const serverName = "VidHide";
  const sources = [];
  const { axios, USER_AGENT, NativeConsumet } = ctx;
  const extract = async (videoUrl) => {
    try {
      const { data } = await axios.get(videoUrl.href, {
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": videoUrl.origin
        }
      }).catch(() => {
        throw new Error("Video not found");
      });
      const packedScript = /eval(\(f.*?)\s*<\/script>/s.exec(data)?.[1];
      if (!packedScript) throw new Error("No packed script found");
      const unpackedData = await NativeConsumet.deobfuscateScript(packedScript);
      if (!unpackedData) throw new Error("Failed to deobfuscate script");
      const links = unpackedData.match(/https?:\/\/[^"]+?\.m3u8[^"]*/g) ?? [];
      const m3u8Link = links[0];
      if (!m3u8Link) throw new Error("No m3u8 link found");
      const m3u8Content = await axios.get(m3u8Link, {
        headers: {
          "Referer": m3u8Link,
          "User-Agent": USER_AGENT
        }
      });
      const videoSources = [
        {
          quality: "auto",
          url: m3u8Link,
          isM3U8: m3u8Link.includes(".m3u8")
        }
      ];
      if (m3u8Content.data.includes("EXTM3U")) {
        const pathWithoutMaster = m3u8Link.split("/master.m3u8")[0];
        const videoList = m3u8Content.data.split("#EXT-X-STREAM-INF:");
        for (const video of videoList ?? []) {
          if (!video.includes("m3u8")) continue;
          const url = video.split("\n")[1];
          const quality = /RESOLUTION=\d+x(\d+)/.exec(video)?.[1];
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
