"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_parser_1 = __importDefault(require("./base-parser"));
class AnimeParser extends base_parser_1.default {
    /** `true` when the site lists sub and dub as separate entries */
    isDubAvailableSeparately = false;
}
exports.default = AnimeParser;
//# sourceMappingURL=anime-parser.js.map