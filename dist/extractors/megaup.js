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
        try {
            const mediaUrl = videoUrl.href.replace('/e/', '/media/');
            const { data } = yield client.get(mediaUrl, {
                headers: {
                    'Connection': 'keep-alive',
                    'User-Agent': userAgent,
                },
            });
            const decrypted = yield decodeSources(data.result);
            return {
                sources: decrypted.sources.map((source) => ({
                    url: source.file,
                    isM3U8: source.file.includes('.m3u8') || source.file.endsWith('m3u8'),
                })),
                subtitles: decrypted.tracks.map((track) => ({
                    kind: track.kind,
                    url: track.file,
                    lang: track.label || 'English',
                })),
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