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
//extractor for https://animekai.to
// Keys required for the decryption to work are loaded dynamically from
// https://raw.githubusercontent.com/amarullz/kaicodex/main/generated/keys.json
const models_1 = require("../models");
class MegaUp extends models_1.VideoExtractor {
    constructor() {
        super();
        this.serverName = 'MegaUp';
        this.sources = [];
        this.homeKeys = [];
        this.megaKeys = [];
        this.keysChar = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-~!*()'.".split('');
        this.GenerateToken = (n) => {
            n = encodeURIComponent(n);
            const l = n.length;
            let o = [];
            for (var i = 0; i < l; i++) {
                const kc = this.homeKeys[this.keysChar.indexOf(n.charAt(i))];
                const c = kc === null || kc === void 0 ? void 0 : kc.charAt(i % kc.length);
                o.push(c);
            }
            return btoa(o.join('')).replace(/\//g, '_').replace(/\+/g, '-').replace(/\=/g, '');
        };
        this.DecodeIframeData = (n) => {
            n = atob(n.replace(/_/g, '/').replace(/-/g, '+'));
            const l = n.length;
            let o = [];
            for (var i = 0; i < l; i++) {
                const c = n.charCodeAt(i);
                const k = this.megaKeys[c];
                o.push(k === null || k === void 0 ? void 0 : k.charCodeAt(i % k.length));
            }
            return decodeURIComponent(String.fromCharCode.apply(null, o.filter((val) => val !== undefined)));
        };
        this.Decode = (n) => {
            var _a, _b;
            n = atob(n.replace(/_/g, '/').replace(/-/g, '+'));
            const l = n.length;
            let o = [];
            for (var i = 0; i < l; i++) {
                const c = n.charCodeAt(i);
                let cp = '';
                for (var j = 0; j < this.homeKeys.length; j++) {
                    var ck = (_a = this.homeKeys[j]) === null || _a === void 0 ? void 0 : _a.charCodeAt(i % ((_b = this.homeKeys[j]) === null || _b === void 0 ? void 0 : _b.length));
                    if (ck === c) {
                        cp = this.keysChar[j];
                        break;
                    }
                }
                if (cp) {
                    o.push(cp);
                }
                else {
                    o.push('%');
                }
            }
            return decodeURIComponent(o.join(''));
        };
        this.extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.kaiKeysReady;
                const url = videoUrl.href.replace(/\/(e|e2)\//, '/media/');
                const res = yield axios_1.default.get(url);
                const decrypted = JSON.parse(this.DecodeIframeData(res.data.result).replace(/\\/g, ''));
                const data = {
                    sources: decrypted.sources.map((s) => ({
                        url: s.file,
                        isM3U8: s.file.includes('.m3u8') || s.file.endsWith('m3u8'),
                    })),
                    subtitles: decrypted.tracks.map((t) => ({
                        kind: t.kind,
                        url: t.file,
                    })),
                    download: decrypted.download,
                };
                return data;
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
        this.kaiKeysReady = this.loadKAIKEYS();
    }
    loadKAIKEYS() {
        return __awaiter(this, void 0, void 0, function* () {
            const extraction_keys = 'https://raw.githubusercontent.com/amarullz/kaicodex/main/generated/keys.json';
            const response = yield axios_1.default.get(extraction_keys);
            const keys = yield response.data;
            for (var i = 0; i < keys.kai.length; i++) {
                this.homeKeys.push(atob(keys.kai[i]));
            }
            for (var i = 0; i < keys.mega.length; i++) {
                this.megaKeys.push(atob(keys.mega[i]));
            }
        });
    }
}
exports.MegaUp = MegaUp;
//# sourceMappingURL=megaup.js.map