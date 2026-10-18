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
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function GDFlix(ctx) {
  var serverName = "GDFlix";
  var sources = [];
  var {
    axios: client,
    load,
    USER_AGENT,
    PolyURL
  } = ctx;
  var userAgent = USER_AGENT || DEFAULT_USER_AGENT;
  var extract = async (videoUrl, referer) => {
    try {
      var urlHref = typeof videoUrl === "string" ? videoUrl : videoUrl.href;
      var urlObj = typeof videoUrl === "object" && videoUrl.origin ? videoUrl : new PolyURL(urlHref);
      var baseUrl = urlObj.origin;
      var pageHeaders = {
        "User-Agent": userAgent,
        "Referer": referer || baseUrl
      };
      var res = await client.get(urlHref, {
        headers: pageHeaders
      });
      var $ = load(res.data);
      var bodyOnload = $("body").attr("onload");
      if (bodyOnload?.includes("location.replace")) {
        var redirectUrl = bodyOnload.split("location.replace('")?.[1]?.split("'")?.[0];
        if (redirectUrl) {
          var redirectRes = await client.get(redirectUrl, {
            headers: pageHeaders
          });
          $ = load(redirectRes.data);
        }
      }
      var rawTitle = $("title").text() || "";
      var qualityMatch = rawTitle.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
      var pageQuality = qualityMatch ? qualityMatch[1].toLowerCase() === "4k" ? "2160p" : qualityMatch[1].toLowerCase() : "auto";
      var extractedSources = [];
      try {
        var resumeDrive = $(".btn-secondary").attr("href") || "";
        if (resumeDrive) {
          if (resumeDrive.includes("indexbot")) {
            var resumeBotRes = await client.get(resumeDrive, {
              headers: pageHeaders
            });
            var tokenMatch = resumeBotRes.data.match(/formData\.append\('token',\s*'([a-f0-9]+)'\)/);
            var resumeBotToken = tokenMatch ? tokenMatch[1] : "";
            var pathMatch = resumeBotRes.data.match(/fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/);
            var resumeBotPath = pathMatch ? pathMatch[1] : "";
            var resumeBotBaseUrl = resumeDrive.split("/download")[0];
            if (resumeBotToken && resumeBotPath) {
              var postRes = await client.post(`${resumeBotBaseUrl}/download?id=${resumeBotPath}`, `token=${encodeURIComponent(resumeBotToken)}`, {
                headers: {
                  "Referer": resumeDrive,
                  "Cookie": "PHPSESSID=7e9658ce7c805dab5bbcea9046f7f308",
                  "Content-Type": "application/x-www-form-urlencoded"
                }
              });
              var downloadUrl = postRes.data?.url;
              if (downloadUrl) {
                extractedSources.push({
                  url: downloadUrl,
                  server: "ResumeBot",
                  quality: pageQuality,
                  isM3U8: downloadUrl.includes(".m3u8")
                });
              }
            }
          } else {
            var targetUrl = resumeDrive.startsWith("http") ? resumeDrive : `${baseUrl}${resumeDrive}`;
            var resumeDriveRes = await client.get(targetUrl, {
              headers: pageHeaders
            });
            var $resumeDrive = load(resumeDriveRes.data);
            var resumeUrl = $resumeDrive(".btn-success").attr("href");
            if (resumeUrl) {
              extractedSources.push({
                url: resumeUrl,
                server: "ResumeCloud",
                quality: pageQuality,
                isM3U8: resumeUrl.includes(".m3u8")
              });
            }
          }
        }
      } catch {}
      try {
        var seed = $(".btn-danger").attr("href") || "";
        if (seed) {
          if (!seed.includes("?url=")) {
            var headRes = await client.head(seed, {
              headers: pageHeaders
            });
            var redirected = headRes.request?.responseURL || seed;
            var driveUrl = redirected.includes("?url=") ? redirected.split("?url=")[1] : redirected;
            if (driveUrl) {
              extractedSources.push({
                url: driveUrl,
                server: "G-Drive",
                quality: pageQuality,
                isM3U8: driveUrl.includes(".m3u8")
              });
            }
          } else {
            var instantToken = seed.split("=")[1];
            var videoSeedUrl = seed.split("/").slice(0, 3).join("/") + "/api";
            if (instantToken) {
              var _postRes = await client.post(videoSeedUrl, `keys=${encodeURIComponent(instantToken)}`, {
                headers: {
                  "x-token": videoSeedUrl,
                  "Content-Type": "application/x-www-form-urlencoded"
                }
              });
              var instantLinkData = typeof _postRes.data === "string" ? JSON.parse(_postRes.data) : _postRes.data;
              if (instantLinkData && instantLinkData.error === false && instantLinkData.url) {
                extractedSources.push({
                  url: instantLinkData.url,
                  server: "G-Drive (download only)",
                  quality: pageQuality,
                  isM3U8: instantLinkData.url.includes(".m3u8")
                });
              }
            }
          }
        }
      } catch {}
      return {
        sources: extractedSources,
        headers: {
          "User-Agent": userAgent,
          "Referer": baseUrl
        }
      };
    } catch (error) {
      throw new Error(`[GDFlix] Failed to extract: ${error.message}`);
    }
  };
  return {
    serverName,
    sources,
    extract
  };
}
if (module.exports !== exports) Object.assign(exports, module.exports);