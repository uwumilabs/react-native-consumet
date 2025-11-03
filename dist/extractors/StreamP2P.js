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
// @ts-nocheck
const axios_1 = __importDefault(require("axios"));
const video_extractor_1 = __importDefault(require("../models/video-extractor"));
const constants_1 = require("../utils/constants");
class StreamP2P extends video_extractor_1.default {
    constructor() {
        super(...arguments);
        this.serverName = 'StreamP2P';
        this.sources = [];
        this.host = 'https://multimovies.p2pplay.pro';
    }
    extract(videoUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const headers = {
                'Referer': this.host,
                'User-Agent': constants_1.USER_AGENT,
            };
            // Extract video ID from URL fragment
            const videoId = videoUrl.href.split('#')[1];
            // API to fetch encrypted data
            const api = `${this.host}/api/v1/video?id=${videoId}`;
            // AES keys
            const password = 'kiemtienmua911ca';
            const iv = '1234567890oiuytr';
            try {
                const { data: encryptedHex } = yield axios_1.default.get(api, { headers });
                // Convert hex to WordArray
                const encryptedData = CryptoJS.enc.Hex.parse(encryptedHex);
                // Key and IV as WordArrays
                const key = CryptoJS.enc.Utf8.parse(password);
                const ivWordArray = CryptoJS.enc.Utf8.parse(iv);
                // Decrypt using AES-CBC and PKCS7 padding
                const decrypted = CryptoJS.AES.decrypt({ ciphertext: encryptedData }, key, {
                    iv: ivWordArray,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7,
                });
                const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
                const json = JSON.parse(decryptedStr);
                //console.log('Captured URL:', json.source);
                //console.log('\nUse these headers to access the URL:\n');
                for (const [key, value] of Object.entries(headers)) {
                    //console.log(`${key}: ${value}`);
                }
            }
            catch (error) {
                console.error('Error occurred:', error);
            }
        });
    }
}
exports.default = StreamP2P;
//# sourceMappingURL=streamp2p.js.map