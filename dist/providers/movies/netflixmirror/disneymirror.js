"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisneyMirror = void 0;
const netmirror_parser_1 = require("./netmirror-parser");
const create_netflixmirror_1 = require("./create-netflixmirror");
class DisneyMirror extends netmirror_parser_1.NetMirrorParser {
    constructor(ctxOrBaseURL, customBaseURL) {
        super(create_netflixmirror_1.createDisneyMirror, ctxOrBaseURL, customBaseURL);
    }
}
exports.DisneyMirror = DisneyMirror;
//# sourceMappingURL=disneymirror.js.map