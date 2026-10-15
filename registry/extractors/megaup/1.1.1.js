"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MegaUp = MegaUp;
const axios_1 = __importDefault(require("axios"));
/**
 * MegaUp extractor factory that relies on the shared extractor context
 */
function MegaUp(ctx) {
    const serverName = 'MegaUp';
    const sources = [];
    const apiBase = 'https://enc-dec.app/api';
    const client = ctx.axios ?? axios_1.default;
    const userAgent = ctx.USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
    const decodeSources = async (payload) => {
        try {
            const { data } = await client.post(`${apiBase}/dec-mega`, {
                text: payload,
                agent: userAgent,
            }, { headers: { 'Content-Type': 'application/json' } });
            return data.result;
        }
        catch (error) {
            throw new Error(error.message);
        }
    };
    const extract = async (videoUrl) => {
        try {
            const mediaUrl = videoUrl.href.replace('/e/', '/media/');
            const subsUrl = videoUrl.searchParams.get('sub.list');
            let externalSubs = [];
            if (subsUrl) {
                externalSubs = await axios_1.default.get(subsUrl).then((res) => res.data.map((sub) => ({
                    kind: sub.kind,
                    url: sub.file,
                    lang: sub.label,
                })));
            }
            const { data } = await client.get(mediaUrl, {
                headers: {
                    'Connection': 'keep-alive',
                    'User-Agent': userAgent,
                },
            });
            const decrypted = await decodeSources(data.result);
            const defaultSource = {
                url: decrypted.sources[0]?.file,
                isM3U8: decrypted.sources[0]?.file.includes('.m3u8'),
                quality: 'auto',
            };
            //split sources into multiple qualities if available
            const { data: sourceRes } = await client.get(decrypted.sources[0]?.file, {
                headers: {
                    'Connection': 'keep-alive',
                    'User-Agent': userAgent,
                },
            });
            if (sourceRes.includes('#EXT-X-STREAM-INF')) {
                const lines = sourceRes.split('\n');
                const qualitySources = [];
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
                        const resolutionMatch = lines[i].match(/RESOLUTION=\d+x(\d+)/);
                        const quality = resolutionMatch ? `${resolutionMatch[1]}p` : `quality${qualitySources.length + 1}`;
                        const url = decrypted.sources[0]?.file.split('/list')[0] + '/' + lines[i + 1];
                        qualitySources.push({
                            url,
                            isM3U8: true,
                            quality,
                        });
                    }
                }
                return {
                    sources: [qualitySources, defaultSource].flat(),
                    subtitles: [
                        ...decrypted.tracks.map((track) => ({
                            kind: track.kind,
                            url: track.file,
                            lang: track.label || track.kind || 'English',
                        })),
                        ...(externalSubs.length > 0 ? externalSubs : []),
                    ],
                    download: decrypted.download,
                };
            }
            return {
                sources: [defaultSource],
                subtitles: [
                    ...decrypted.tracks.map((track) => ({
                        kind: track.kind,
                        url: track.file,
                        lang: track.label || track.kind,
                    })),
                    ...(externalSubs.length > 0 ? externalSubs : []),
                ],
                download: decrypted.download,
            };
        }
        catch (error) {
            throw new Error(error.message);
        }
    };
    return {
        serverName,
        sources,
        extract,
    };
}
exports.default = MegaUp;
//# sourceMappingURL=megaup.js.map