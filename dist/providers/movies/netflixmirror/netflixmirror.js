"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetflixMirror = void 0;
const netmirror_parser_1 = require("./netmirror-parser");
const create_netflixmirror_1 = require("./create-netflixmirror");
class NetflixMirror extends netmirror_parser_1.NetMirrorParser {
    constructor(ctxOrBaseURL, customBaseURL) {
        super(create_netflixmirror_1.createNetflixMirror, ctxOrBaseURL, customBaseURL);
    }
}
exports.NetflixMirror = NetflixMirror;
//# sourceMappingURL=netflixmirror.js.map