"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unpackScripts = unpackScripts;
// One eval(function(p,a,c,k,e,d){...}('payload',base,count,'words'.split('|'))) block.
const PACKED = /\beval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)\s*\{[\s\S]+?\}\s*\(\s*'([\s\S]+?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]+?)'\s*\.split\s*\(\s*'(.+?)'\s*\)/;
function unpack(block) {
    // The payload is the source of a single-quoted string: undo its escapes (\' and \\).
    const encoded = block[1].replace(/\\(['"\\])/g, '$1');
    const base = parseInt(block[2], 10);
    const count = parseInt(block[3], 10);
    const words = block[4].split(block[5]);
    function encode(n) {
        const prefix = n < base ? '' : encode(Math.floor(n / base));
        const rem = n % base;
        return prefix + (rem > 35 ? String.fromCharCode(rem + 29) : rem.toString(36));
    }
    let code = encoded;
    for (let i = count - 1; i >= 0; i--) {
        const word = words[i];
        if (word)
            code = code.replace(new RegExp(`\\b${encode(i)}\\b`, 'g'), word);
    }
    return code;
}
/** The code of every script in `html` packed with Dean Edwards' packer (`eval(function(p,a,c,k,e,d)…)`), in page order. */
function unpackScripts(html) {
    const blocks = new RegExp(PACKED.source, 'g');
    const scripts = [];
    let block;
    while ((block = blocks.exec(html)))
        scripts.push(unpack(block));
    return scripts;
}
//# sourceMappingURL=packer.js.map