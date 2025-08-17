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
const axios_1 = __importDefault(require("axios"));
const models_1 = require("../models");
class Mp4Upload extends models_1.VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'mp4upload';
        this.sources = [];
        this.extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { data } = yield axios_1.default.get(videoUrl.href);
                const playerSrc = data
                    .replace(/\n/g, ' ')
                    .match(/player\.src\(\s*{\s*type:\s*"[^"]+",\s*src:\s*"([^"]+)"\s*}\s*\);/);
                const streamUrl = playerSrc[1];
                if (!streamUrl)
                    throw new Error('Stream url not found');
                this.sources.push({
                    quality: 'auto',
                    url: streamUrl,
                    isM3U8: streamUrl.includes('.m3u8'),
                });
                return this.sources;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
    }
}
exports.default = Mp4Upload;
//# sourceMappingURL=mp4upload.js.map