"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MegaCloud = void 0;
const models_1 = require("../../models");
const megacloud_getsrcs_1 = require("./megacloud.getsrcs");
class MegaCloud extends models_1.VideoExtractor {
    constructor(ctx) {
        super();
        this.serverName = 'MegaCloud';
        this.sources = [];
        this.ctx = ctx;
    }
    async extract(embedIframeURL, referer = 'https://hianime.to') {
        const { axios, logger } = this.ctx;
        const extractedData = {
            subtitles: [],
            intro: { start: 0, end: 0 },
            outro: { start: 0, end: 0 },
            sources: [],
        };
        try {
            const resp = await (0, megacloud_getsrcs_1.getSources)(embedIframeURL, referer);
            if (!resp)
                return extractedData;
            if (Array.isArray(resp.sources)) {
                extractedData.sources = resp.sources.map((s) => ({
                    url: s.file,
                    isM3U8: s.type === 'hls',
                    type: s.type,
                }));
            }
            else {
                extractedData.sources = [
                    {
                        url: resp.sources,
                        isM3U8: resp.sources.includes('.m3u8'),
                    },
                ];
            }
            extractedData.intro = resp.intro ?? extractedData.intro;
            extractedData.outro = resp.outro ?? extractedData.outro;
            extractedData.subtitles =
                resp.tracks?.map((track) => ({
                    url: track.file,
                    lang: track.label || track.kind,
                })) ?? [];
            logger?.log(`[MegaCloud] Extracted ${extractedData.sources.length} source(s)`);
            return extractedData;
        }
        catch (err) {
            logger?.error('[MegaCloud] Extraction error', err);
            throw err;
        }
    }
}
exports.MegaCloud = MegaCloud;
//# sourceMappingURL=index.js.map