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
var PACKED = /\beval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]+?\}\s*\(\s*'([\s\S]+?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]+?)'\s*\.split\s*\(\s*'(.+?)'\s*\)/;
function unpack(block) {
  var encoded = block[1].replace(/\\(['"\\])/g, "$1");
  var base = parseInt(block[2], 10);
  var count = parseInt(block[3], 10);
  var words = block[4].split(block[5]);
  function encode(n) {
    var prefix = n < base ? "" : encode(Math.floor(n / base));
    var rem = n % base;
    return prefix + (rem > 35 ? String.fromCharCode(rem + 29) : rem.toString(36));
  }
  var code = encoded;
  for (var i = count - 1; i >= 0; i--) {
    var word = words[i];
    if (word) code = code.replace(new RegExp(`\\b${encode(i)}\\b`, "g"), word);
  }
  return code;
}
function unpackScripts(html) {
  var blocks = new RegExp(PACKED.source, "g");
  var scripts = [];
  var block;
  while (block = blocks.exec(html)) scripts.push(unpack(block));
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
if (module.exports !== exports) Object.assign(exports, module.exports);