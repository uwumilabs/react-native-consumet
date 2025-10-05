"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_parser_1 = __importDefault(require("./base-parser"));
class AnimeParser extends base_parser_1.default {
    constructor() {
        super(...arguments);
        /**
         * if the provider has dub and it's avialable seperatly from sub set this to `true`
         */
        this.isDubAvailableSeparately = false;
    }
}
exports.default = AnimeParser;
//# sourceMappingURL=anime-parser.js.map