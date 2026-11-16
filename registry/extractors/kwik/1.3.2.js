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

// src/extractors/kwik.ts
function Kwik(ctx) {
  var {
    NativeConsumet,
    PolyURL
  } = ctx;
  function findSource(scripts) {
    for (var code of scripts) {
      var source = code.match(/const\s+source\s*=\s*'([^']+)'/) || code.match(/const\s+source\s*=\s*"([^"]+)"/) || code.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
      if (source?.[1]) return source[1];
    }
    return null;
  }
  var extract = async (videoUrl, referer) => {
    var url = toUrl(PolyURL, videoUrl);
    var {
      html
    } = await NativeConsumet.makeGetRequestWithWebView(url.href, {
      Referer: referer
    });
    var scripts = unpackScripts(html);
    var m3u8 = findSource(scripts);
    if (!m3u8) throw new Error(scripts.length ? "[Kwik] No source URL found" : "[Kwik] No packed script found");
    return {
      sources: [{
        url: m3u8,
        isM3U8: m3u8.includes(".m3u8")
      }],
      headers: {
        Referer: `${url.origin}/`
      }
    };
  };
  return {
    extract
  };
}