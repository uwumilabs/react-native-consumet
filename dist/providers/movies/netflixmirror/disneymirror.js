"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const netmirror_parser_1 = __importDefault(require("./netmirror-parser"));
const create_netflixmirror_1 = require("./create-netflixmirror");
class DisneyMirror extends netmirror_parser_1.default {
    constructor(customBaseURL) {
        super(create_netflixmirror_1.createDisneyMirror, customBaseURL);
    }
}
exports.default = DisneyMirror;
//# sourceMappingURL=disneymirror.js.map