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
    for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    });
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
function MegaCloud(ctx) {
  const serverName = "MegaCloud";
  const sources = [];
  const {
    axios,
    load,
    USER_AGENT,
    PolyURL
  } = ctx;
  async function getSources(embed_url, site) {
    const regex = /\/([^/?]+)(?=\?)/;
    const xrax = embed_url.toString().match(regex)?.[1];
    const basePath = embed_url.pathname.split("/").slice(0, 4).join("/");
    const url = `${embed_url.origin}${basePath}/getSources?id=${xrax}`;
    const headers = {
      "Accept": "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": site,
      "User-Agent": USER_AGENT
    };
    let videoTag;
    let embedRes;
    try {
      embedRes = await axios?.get(embed_url.href, {
        headers
      });
      const $ = load(embedRes.data);
      videoTag = $('[id$="-player"]');
    } catch (error) {
      console.error("\u274C Error fetching embed URL:", error);
      return;
    }
    if (!videoTag.length) {
      console.error("\u274C Looks like URL expired!");
      return;
    }
    const rawText = embedRes.data;
    let nonceMatch = rawText.match(/\b[a-zA-Z0-9]{48}\b/);
    if (!nonceMatch) {
      const altMatch = rawText.match(/\b([a-zA-Z0-9]{16})\b[\s\S]*?\b([a-zA-Z0-9]{16})\b[\s\S]*?\b([a-zA-Z0-9]{16})\b/);
      if (altMatch) nonceMatch = [altMatch.slice(1).join("")];
    }
    const nonce = nonceMatch?.[0];
    if (!nonce) return console.error("\u274C Nonce not found!");
    const fileId = videoTag.attr("data-id");
    const {
      data: encryptedResData
    } = await axios.get(`${embed_url.origin}${basePath}/getSources?id=${fileId}&_k=${nonce}`, {
      headers
    });
    const sources2 = encryptedResData.sources;
    let videoSrc = [];
    if (encryptedResData.encrypted) {
      console.warn("\u274C API returned encrypted sources which we are no longer decrypting. Returning empty array.");
    } else {
      videoSrc = sources2;
    }
    return {
      sources: videoSrc,
      tracks: encryptedResData.tracks,
      intro: encryptedResData?.intro,
      outro: encryptedResData?.outro
    };
  }
  const extract = async function (embedIframeURL) {
    let referer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "https://himovies.sx";
    const extractedData = {
      subtitles: [],
      intro: {
        start: 0,
        end: 0
      },
      outro: {
        start: 0,
        end: 0
      },
      sources: []
    };
    try {
      const resp = await getSources(embedIframeURL, referer);
      if (!resp) return extractedData;
      if (Array.isArray(resp.sources)) {
        for (const s of resp.sources) {
          const isM3U8 = s.type === "hls";
          extractedData.sources.push({
            url: s.file,
            isM3U8,
            quality: "auto"
          });
          if (isM3U8) {
            try {
              const m3u8Response = await fetch(s.file, {
                headers: {
                  "Referer": referer,
                  "User-Agent": USER_AGENT || "Mozilla/5.0"
                }
              });
              const m3u8Content = await m3u8Response.text();
              if (m3u8Content.includes("EXTM3U")) {
                const pathWithoutMaster = s.file.split("/master.m3u8")[0] || s.file.split("/index.m3u8")[0];
                const videoList = m3u8Content.split("#EXT-X-STREAM-INF:");
                for (const video of videoList ?? []) {
                  if (!video.includes("m3u8")) continue;
                  const url = video.split("\n")[1].trim();
                  const resolutionMatch = video.match(/RESOLUTION=(\d+)x(\d+)/);
                  const quality = resolutionMatch ? resolutionMatch[2] : null;
                  const isAbsoluteUrl = url.startsWith("http://") || url.startsWith("https://");
                  const finalUrl = isAbsoluteUrl ? url : `${pathWithoutMaster}/${url}`;
                  extractedData.sources.push({
                    url: finalUrl,
                    quality: quality ? `${quality}p` : "auto",
                    isM3U8: url.includes(".m3u8")
                  });
                }
              }
            } catch (error) {
              console.warn("[MegaCloud] Failed to fetch M3U8 variants:", error);
            }
          } else {
            extractedData.sources[extractedData.sources.length - 1] = {
              url: s.file,
              isM3U8: false,
              quality: "default"
            };
          }
        }
      }
      extractedData.intro = resp.intro ?? extractedData.intro;
      extractedData.outro = resp.outro ?? extractedData.outro;
      extractedData.subtitles = resp.tracks?.map(track => ({
        url: track.file,
        lang: track.label || track.kind
      })) ?? [];
      return extractedData;
    } catch (err) {
      throw err;
    }
  };
  return {
    serverName,
    sources,
    extract
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);