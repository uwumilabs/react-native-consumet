"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extractors/megaup.ts
var megaup_exports = {};
__export(megaup_exports, {
  MegaUp: () => MegaUp,
  default: () => megaup_default
});
module.exports = __toCommonJS(megaup_exports);
var import_axios = __toESM(require("axios"));
function MegaUp(ctx) {
  const serverName = "MegaUp";
  const sources = [];
  const apiBase = "https://enc-dec.app/api";
  const client = ctx.axios ?? import_axios.default;
  const userAgent = ctx.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
  const decodeSources = async (payload) => {
    try {
      const { data } = await client.post(
        `${apiBase}/dec-mega`,
        {
          text: payload,
          agent: userAgent
        },
        { headers: { "Content-Type": "application/json" } }
      );
      return data.result;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  const extract = async (videoUrl) => {
    try {
      const mediaUrl = videoUrl.href.replace("/e/", "/media/");
      const subsUrl = videoUrl.searchParams.get("sub.list");
      let externalSubs = [];
      if (subsUrl) {
        externalSubs = await import_axios.default.get(subsUrl).then(
          (res) => res.data.map((sub) => ({
            kind: sub.kind,
            url: sub.file,
            lang: sub.label
          }))
        );
      }
      const { data } = await client.get(mediaUrl, {
        headers: {
          "Connection": "keep-alive",
          "User-Agent": userAgent
        }
      });
      const decrypted = await decodeSources(data.result);
      const defaultSource = {
        url: decrypted.sources[0]?.file,
        isM3U8: decrypted.sources[0]?.file.includes(".m3u8"),
        quality: "auto"
      };
      const { data: sourceRes } = await client.get(decrypted.sources[0]?.file, {
        headers: {
          "Connection": "keep-alive",
          "User-Agent": userAgent
        }
      });
      if (sourceRes.includes("#EXT-X-STREAM-INF")) {
        const lines = sourceRes.split("\n");
        const qualitySources = [];
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
            const resolutionMatch = lines[i].match(/RESOLUTION=\d+x(\d+)/);
            const quality = resolutionMatch ? `${resolutionMatch[1]}p` : `quality${qualitySources.length + 1}`;
            const url = decrypted.sources[0]?.file.split("/list")[0] + "/" + lines[i + 1];
            qualitySources.push({
              url,
              isM3U8: true,
              quality
            });
          }
        }
        return {
          sources: [qualitySources, defaultSource].flat(),
          subtitles: [
            ...decrypted.tracks.map((track) => ({
              kind: track.kind,
              url: track.file,
              lang: track.label || track.kind || "English"
            })),
            ...externalSubs.length > 0 ? externalSubs : []
          ],
          download: decrypted.download
        };
      }
      return {
        sources: [defaultSource],
        subtitles: [
          ...decrypted.tracks.map((track) => ({
            kind: track.kind,
            url: track.file,
            lang: track.label || track.kind
          })),
          ...externalSubs.length > 0 ? externalSubs : []
        ],
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
var megaup_default = MegaUp;
if (module.exports !== exports) Object.assign(exports, module.exports);
