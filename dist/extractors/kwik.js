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
exports.Kwik = Kwik;
/**
 * Kwik extractor function
 * @param ctx ExtractorContext containing axios, load, USER_AGENT
 * @returns Object with extract method implementing IVideoExtractor interface
 */
function Kwik(ctx) {
    const serverName = 'kwik';
    const sources = [];
    const { axios, load, USER_AGENT, PolyURL } = ctx;
    function unPack(code) {
        function indent(code) {
            try {
                let tabs = 0, old = -1, add = '';
                for (let i = 0; i < code.length; i++) {
                    if (code[i].includes('{'))
                        tabs++;
                    if (code[i].includes('}'))
                        tabs--;
                    if (old !== tabs) {
                        old = tabs;
                        add = '';
                        while (old > 0) {
                            add += '\t';
                            old--;
                        }
                        old = tabs;
                    }
                    code[i] = add + code[i];
                }
            }
            finally {
                // let GC cleanup
            }
            return code;
        }
        let captured = '';
        // fake environment
        const env = {
            eval: function (c) {
                captured = c;
            },
            window: {},
            document: {},
        };
        // Instead of `with`, run inside a Function with env injected
        const runner = new Function('env', `
    const { eval, window, document } = env;
    ${code}
  `);
        runner(env);
        // prettify captured code
        captured = (captured + '')
            .replace(/;/g, ';\n')
            .replace(/{/g, '\n{\n')
            .replace(/}/g, '\n}\n')
            .replace(/\n;\n/g, ';\n')
            .replace(/\n\n/g, '\n');
        let lines = captured.split('\n');
        lines = indent(lines);
        return lines.join('\n');
    }
    // @ts-ignore
    const extract = (videoUrl_1, ...args_1) => __awaiter(this, [videoUrl_1, ...args_1], void 0, function* (videoUrl, referer = 'https://animepahe.si/') {
        const extractedData = {
            // subtitles: [],
            // intro: { start: 0, end: 0 },
            // outro: { start: 0, end: 0 },
            sources: [],
        };
        try {
            const response = yield fetch(`${videoUrl.href}`, {
                headers: {
                    'Referer': referer,
                    'User-Agent': USER_AGENT,
                },
            });
            const data = yield response.text();
            const unpackedSourceCode = unPack(data.match(/<script\b[^>]*>\s*(eval\([\s\S]*?\))\s*<\/script>/i)[1]);
            const re = /https?:\/\/[^'"\s]+?\.m3u8(?:\?[^'"\s]*)?/i;
            const source = unpackedSourceCode.match(re)[0];
            extractedData.sources.push({
                url: source,
                isM3U8: source.includes('.m3u8'),
            });
            return extractedData;
        }
        catch (err) {
            throw new Error(err.message);
        }
    });
    return {
        serverName,
        sources,
        extract,
    };
}
//# sourceMappingURL=kwik.js.map