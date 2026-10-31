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

// src/extractors/kwik.ts
var kwik_exports = {};
__export(kwik_exports, {
  Kwik: () => Kwik
});
module.exports = __toCommonJS(kwik_exports);
function Kwik(ctx) {
  var serverName = "kwik";
  var sources = [];
  var {
    NativeConsumet
  } = ctx;
  var PACKED = /\beval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]+?\}\s*\(\s*'([\s\S]+?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]+?)'\s*\.split\s*\(\s*'(.+?)'\s*\)/;
  function unpackPacked(m) {
    var encoded = m[1].replace(/\\(['"\\])/g, "$1");
    var base = parseInt(m[2], 10);
    var count = parseInt(m[3], 10);
    var words = m[4].split(m[5]);
    function decode(n) {
      var prefix = n < base ? "" : decode(Math.floor(n / base));
      var rem = n % base;
      return prefix + (rem > 35 ? String.fromCharCode(rem + 29) : rem.toString(36));
    }
    var result = encoded;
    for (var i = count - 1; i >= 0; i--) {
      var word = words[i];
      if (word) result = result.replace(new RegExp(`\\b${decode(i)}\\b`, "g"), word);
    }
    return result;
  }
  function findSource(html) {
    var packed = new RegExp(PACKED.source, "g");
    var block;
    while (block = packed.exec(html)) {
      var code = unpackPacked(block);
      var source = code.match(/const\s+source\s*=\s*'([^']+)'/) || code.match(/const\s+source\s*=\s*"([^"]+)"/) || code.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
      if (source?.[1]) return source[1];
    }
    return null;
  }
  var extract = async function (videoUrl) {
    var referer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "https://animepahe.ru/";
    var kwikUrl = typeof videoUrl === "string" ? videoUrl : videoUrl.href;
    var kwikHost = kwikUrl.match(/^https?:\/\/([^/]+)/)?.[1] ?? "kwik.cx";
    var {
      html
    } = await NativeConsumet.makeGetRequestWithWebView(kwikUrl, {
      Referer: referer
    });
    var m3u8 = findSource(html);
    if (!m3u8) {
      var packed = html.includes("eval(function(p,a,c,k,e,");
      throw new Error(packed ? "[Kwik] No source URL found" : "[Kwik] No packed script found");
    }
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