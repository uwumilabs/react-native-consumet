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

// src/extractors/gdflix.ts
var gdflix_exports = {};
__export(gdflix_exports, {
  GDFlix: () => GDFlix
});
module.exports = __toCommonJS(gdflix_exports);

// src/extractors/file-hosts.ts
function qualityIn(text) {
  var label = text.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i)?.[1]?.toLowerCase();
  return label === "4k" ? "2160p" : label;
}
function finalUrl(response, fallback) {
  return response.request?.responseURL || response.request?.res?.responseUrl || fallback;
}

// src/extractors/url.ts
function toUrl(URLClass, url) {
  return typeof url === "string" ? new URLClass(url) : url;
}

// src/extractors/gdflix.ts
function GDFlix(ctx) {
  var {
    axios,
    load,
    USER_AGENT,
    PolyURL
  } = ctx;
  var extract = async (videoUrl, referer) => {
    var url = toUrl(PolyURL, videoUrl);
    var baseUrl = url.origin;
    var pageHeaders = {
      "User-Agent": USER_AGENT,
      "Referer": referer || baseUrl
    };
    var res = await axios.get(url.href, {
      headers: pageHeaders
    });
    var $ = load(res.data);
    var redirectUrl = $("body").attr("onload")?.split("location.replace('")?.[1]?.split("'")?.[0];
    if (redirectUrl) {
      var redirectRes = await axios.get(redirectUrl, {
        headers: pageHeaders
      });
      $ = load(redirectRes.data);
    }
    var pageQuality = qualityIn($("title").text()) ?? "auto";
    var sources = [];
    try {
      var resumeDrive = $(".btn-secondary").attr("href") || "";
      if (resumeDrive.includes("indexbot")) {
        var resumeBotRes = await axios.get(resumeDrive, {
          headers: pageHeaders
        });
        var token = resumeBotRes.data.match(/formData\.append\('token',\s*'([a-f0-9]+)'\)/)?.[1];
        var path = resumeBotRes.data.match(/fetch\('\/download\?id=([a-zA-Z0-9/+]+)'/)?.[1];
        if (token && path) {
          var postRes = await axios.post(`${resumeDrive.split("/download")[0]}/download?id=${path}`, `token=${encodeURIComponent(token)}`, {
            headers: {
              "Referer": resumeDrive,
              "Content-Type": "application/x-www-form-urlencoded"
            }
          });
          var downloadUrl = postRes.data?.url;
          if (downloadUrl) {
            sources.push({
              url: downloadUrl,
              server: "ResumeBot",
              quality: pageQuality,
              isM3U8: downloadUrl.includes(".m3u8")
            });
          }
        }
      } else if (resumeDrive) {
        var targetUrl = resumeDrive.startsWith("http") ? resumeDrive : `${baseUrl}${resumeDrive}`;
        var resumeDriveRes = await axios.get(targetUrl, {
          headers: pageHeaders
        });
        var resumeUrl = load(resumeDriveRes.data)(".btn-success").attr("href");
        if (resumeUrl) {
          sources.push({
            url: resumeUrl,
            server: "ResumeCloud",
            quality: pageQuality,
            isM3U8: resumeUrl.includes(".m3u8")
          });
        }
      }
    } catch {}
    try {
      var seed = $(".btn-danger").attr("href") || "";
      if (seed && !seed.includes("?url=")) {
        var headRes = await axios.head(seed, {
          headers: pageHeaders
        });
        var redirected = finalUrl(headRes, seed);
        var driveUrl = redirected.includes("?url=") ? redirected.split("?url=")[1] : redirected;
        if (driveUrl) {
          sources.push({
            url: driveUrl,
            server: "G-Drive",
            quality: pageQuality,
            isM3U8: driveUrl.includes(".m3u8")
          });
        }
      } else if (seed) {
        var instantToken = seed.split("=")[1];
        var videoSeedUrl = seed.split("/").slice(0, 3).join("/") + "/api";
        if (instantToken) {
          var _postRes = await axios.post(videoSeedUrl, `keys=${encodeURIComponent(instantToken)}`, {
            headers: {
              "x-token": videoSeedUrl,
              "Content-Type": "application/x-www-form-urlencoded"
            }
          });
          var instantLink = typeof _postRes.data === "string" ? JSON.parse(_postRes.data) : _postRes.data;
          if (instantLink?.error === false && instantLink.url) {
            sources.push({
              url: instantLink.url,
              server: "G-Drive (download only)",
              quality: pageQuality,
              isM3U8: instantLink.url.includes(".m3u8")
            });
          }
        }
      }
    } catch {}
    return {
      sources,
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": baseUrl
      }
    };
  };
  return {
    extract
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);