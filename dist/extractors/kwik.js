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
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
class Kwik extends models_1.VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'kwik';
        this.sources = [];
        this.host = 'https://animepahe.ru/';
        this.extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${videoUrl.href}`, {
                    headers: { Referer: this.host },
                });
                const data = yield response.text();
                const source = eval(/(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))[2].replace('eval', '')).match(/https.*?m3u8/);
                this.sources.push({
                    url: source[0],
                    isM3U8: source[0].includes('.m3u8'),
                });
                return this.sources;
            }
            catch (err) {
                throw new Error(err.message);
            }
        });
    }
}
exports.default = Kwik;
//# sourceMappingURL=kwik.js.map