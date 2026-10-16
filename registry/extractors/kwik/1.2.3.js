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

// src/extractors/kwik.ts
var kwik_exports = {};
__export(kwik_exports, {
  Kwik: () => Kwik
});
module.exports = __toCommonJS(kwik_exports);
function Kwik(ctx) {
  const serverName = "kwik";
  const sources = [];
  const {
    load,
    USER_AGENT,
    NativeConsumet
  } = ctx;
  const ua = USER_AGENT || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
  function unpackPacked(packed) {
    const re = /\beval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]+?\}\s*\(\s*'([\s\S]+?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]+?)'\s*\.split\s*\(\s*'(.+?)'\s*\)/;
    const m = packed.match(re);
    if (!m) return null;
    const encoded = m[1];
    const base = parseInt(m[2], 10);
    const count = parseInt(m[3], 10);
    const words = m[4].split(m[5]);
    function decode(n) {
      const prefix = n < base ? "" : decode(Math.floor(n / base));
      const rem = n % base;
      return prefix + (rem > 35 ? String.fromCharCode(rem + 29) : rem.toString(36));
    }
    let result = encoded;
    for (let i = count - 1; i >= 0; i--) {
      const word = words[i];
      if (word) result = result.replace(new RegExp(`\\b${decode(i)}\\b`, "g"), word);
    }
    return result;
  }
  const extract = async function (videoUrl) {
    let referer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "https://animepahe.ru/";
    const kwikUrl = typeof videoUrl === "string" ? videoUrl : videoUrl.href;
    const kwikHost = kwikUrl.match(/^https?:\/\/([^/]+)/)?.[1] ?? "kwik.cx";
    const {
      html
    } = await NativeConsumet.makeGetRequestWithWebView(kwikUrl, {
      "Referer": referer,
      "User-Agent": ua
    });
    const $ = load(html);
    let packedScript = null;
    $("script").each((_, el) => {
      const text = $(el).html() ?? "";
      if (text.includes("eval(function(p,a,c,k,e,")) {
        packedScript = text;
        return false;
      }
    });
    if (!packedScript) {
      const m = html.match(/eval\(function\(p,a,c,k,e,[dr]\)[\s\S]+?\.split\(['"]\|['"]\)[\s\S]+?\)/);
      packedScript = m?.[0] ?? null;
    }
    if (!packedScript) throw new Error("[Kwik] No packed script found");
    const unpacked = unpackPacked(packedScript);
    if (!unpacked) throw new Error("[Kwik] Failed to unpack script");
    const sourceMatch = unpacked.match(/const\s+source\s*=\s*'([^']+)'/) || unpacked.match(/const\s+source\s*=\s*"([^"]+)"/) || unpacked.match(/['"]?(https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
    if (!sourceMatch?.[1]) throw new Error("[Kwik] No source URL found");
    const m3u8 = sourceMatch[1];
    return {
      sources: [{
        url: m3u8,
        isM3U8: m3u8.includes(".m3u8")
      }],
      headers: {
        Referer: `https://${kwikHost}/`
      }
    };
  };
  return {
    serverName,
    sources,
    extract
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);