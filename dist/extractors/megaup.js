"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    var _a;
    const serverName = 'MegaUp';
    const sources = [];
    const apiBase = 'https://enc-dec.app/api';
    const client = (_a = ctx.axios) !== null && _a !== void 0 ? _a : axios_1.default;
    const userAgent = ctx.USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
    const decodeSources = (payload) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { data } = yield client.post(`${apiBase}/dec-mega`, {
                text: payload,
                agent: userAgent,
            }, { headers: { 'Content-Type': 'application/json' } });
            return data.result;
        }
        catch (error) {
            throw new Error(error.message);
        }
    });
    const extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const mediaUrl = videoUrl.href.replace('/e/', '/media/');
            const subsUrl = videoUrl.searchParams.get('sub.list');
            let externalSubs = [];
            if (subsUrl) {
                externalSubs = yield axios_1.default.get(subsUrl).then((res) => res.data.map((sub) => ({
                    kind: sub.kind,
                    url: sub.file,
                    lang: sub.label,
                })));
            }
            const { data } = yield client.get(mediaUrl, {
                headers: {
                    'Connection': 'keep-alive',
                    'User-Agent': userAgent,
                },
            });
            const decrypted = yield decodeSources(data.result);
            const defaultSource = {
                url: (_a = decrypted.sources[0]) === null || _a === void 0 ? void 0 : _a.file,
                isM3U8: (_b = decrypted.sources[0]) === null || _b === void 0 ? void 0 : _b.file.includes('.m3u8'),
                quality: 'auto',
            };
            //split sources into multiple qualities if available
            const { data: sourceRes } = yield client.get((_c = decrypted.sources[0]) === null || _c === void 0 ? void 0 : _c.file, {
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
                        const url = ((_d = decrypted.sources[0]) === null || _d === void 0 ? void 0 : _d.file.split('/list')[0]) + '/' + lines[i + 1];
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
                            lang: track.label || 'English',
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
    });
    return {
        serverName,
        sources,
        extract,
    };
}
exports.default = MegaUp;
//# sourceMappingURL=megaup.js.map