"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimeMirror = void 0;
const netmirror_parser_1 = require("./netmirror-parser");
const create_netflixmirror_1 = require("./create-netflixmirror");
class PrimeMirror extends netmirror_parser_1.NetMirrorParser {
    constructor(ctxOrBaseURL, customBaseURL) {
        super(create_netflixmirror_1.createPrimeMirror, ctxOrBaseURL, customBaseURL);
    }
}
exports.PrimeMirror = PrimeMirror;
//# sourceMappingURL=primemirror.js.map