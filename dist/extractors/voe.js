"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Voe = void 0;
const cheerio_1 = require("cheerio");
const models_1 = require("../models");
const extension_utils_1 = require("../utils/extension-utils");
class Voe extends models_1.VideoExtractor {
  ctx;
  serverName = 'voe';
  sources = [];
  domains = ['voe.sx'];
  /** @param ctx extractor context; requests go through its axios (default: the library's) */
  constructor() {
    let ctx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : extension_utils_1.defaultExtractorContext;
    super();
    this.ctx = ctx;
  }
  extract = async videoUrl => {
    try {
      function decryptF7(p8) {
        try {
          const vF = rot13(p8);
          const vF2 = replacePatterns(vF);
          const vF3 = removeUnderscores(vF2);
          const vF4 = base64Decode(vF3);
          const vF5 = charShift(vF4, 3);
          const vF6 = reverse(vF5);
          const vAtob = base64Decode(vF6);
          return JSON.parse(vAtob);
        } catch (e) {
          console.error('Decryption error:', e);
          return {};
        }
      }
      function rot13(input) {
        return input.replace(/[a-zA-Z]/g, c => {
          const base = c <= 'Z' ? 65 : 97;
          return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
        });
      }
      function replacePatterns(input) {
        const patterns = ['@$', '^^', '~@', '%?', '*~', '!!', '#&'];
        let result = input;
        for (const pattern of patterns) {
          const regex = new RegExp(pattern.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'), 'g');
          result = result.replace(regex, '_');
        }
        return result;
      }
      function removeUnderscores(input) {
        return input.replace(/_/g, '');
      }
      function charShift(input, shift) {
        return [...input].map(c => String.fromCharCode(c.charCodeAt(0) - shift)).join('');
      }
      function reverse(input) {
        return input.split('').reverse().join('');
      }
      function base64Decode(input) {
        try {
          return Buffer.from(input, 'base64').toString('utf-8');
        } catch (e) {
          console.error('Base64 decode failed:', e);
          return '';
        }
      }
      const res = await this.ctx.axios.get(videoUrl.href);
      const $ = (0, cheerio_1.load)(res.data);
      const scriptContent = $('script').html();
      const pageUrl = scriptContent ? scriptContent.match(/window\.location\.href\s*=\s*'(https:\/\/[^']+)';/)?.[1] ?? '' : '';
      const {
        data
      } = await this.ctx.axios.get(pageUrl);
      const $$ = (0, cheerio_1.load)(data);
      const encodedString = $$('script[type="application/json"]').html()?.trim() || '';
      const jsonData = decryptF7(encodedString);
      let url = jsonData.source;
      let siteName = jsonData.site_name;
      let subtitles = jsonData.captions.map(sub => ({
        lang: sub.label,
        url: `https://${siteName}${sub.file}`
      }));
      this.sources.push({
        url: url,
        quality: 'default',
        isM3U8: url.includes('.m3u8')
      });
      return {
        sources: this.sources,
        subtitles: subtitles
      };
    } catch (err) {
      throw new Error(err.message);
    }
  };
}
exports.Voe = Voe;
//# sourceMappingURL=voe.js.map