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
exports.MegaUp = void 0;
const axios_1 = __importDefault(require("axios"));
const models_1 = require("../models");
class MegaUp extends models_1.VideoExtractor {
    constructor() {
        super();
        this.serverName = 'MegaUp';
        this.sources = [];
        this.apiBase = 'https://enc-dec.app/api';
        this.GenerateToken = (n) => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield axios_1.default.get(`${this.apiBase}/enc-kai?text=${encodeURIComponent(n)}`);
                return res.data.result;
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
        this.DecodeIframeData = (n) => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield axios_1.default.post(`${this.apiBase}/dec-kai`, { text: n });
                return res.data.result;
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
        this.Decode = (n) => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield axios_1.default.post(`${this.apiBase}/dec-mega`, {
                    text: n,
                    agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                }, { headers: { 'Content-Type': 'application/json' } });
                return res.data.result;
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
        this.extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
            try {
                const url = videoUrl.href.replace('/e/', '/media/');
                const res = yield axios_1.default.get(url, {
                    headers: {
                        'Connection': 'keep-alive',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                    },
                });
                const decrypted = yield this.Decode(res.data.result);
                const data = {
                    sources: decrypted.sources.map((s) => ({
                        url: s.file,
                        isM3U8: s.file.includes('.m3u8') || s.file.endsWith('m3u8'),
                    })),
                    subtitles: decrypted.tracks.map((t) => ({
                        kind: t.kind,
                        url: t.file,
                        lang: t.label || 'English',
                    })),
                    download: decrypted.download,
                };
                return data;
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
    }
}
exports.MegaUp = MegaUp;
exports.default = MegaUp;
//# sourceMappingURL=megaup.js.map