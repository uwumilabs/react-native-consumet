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
exports.Gofile = Gofile;
const GOFILE_API = 'https://api.gofile.io';
const GOFILE_LANGUAGE = 'en-US';
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
let cachedAccountToken = null;
let cachedGenerateWT = null;
let cachedWTTime = 0;
function getOrFetchGenerateWT(axiosClient, userAgent) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = Date.now();
        if (cachedGenerateWT && now - cachedWTTime < 3 * 60 * 60 * 1000) {
            return cachedGenerateWT;
        }
        try {
            const res = yield axiosClient.get('https://gofile.io/js/wt.obf.js', {
                headers: {
                    'User-Agent': userAgent,
                    'Referer': 'https://gofile.io/',
                },
            });
            const code = res.data;
            const runner = new Function('navigator', 'window', 'document', 'location', `${code}\nreturn typeof generateWT !== 'undefined' ? generateWT : (window && window.generateWT);`);
            const fakeNav = {
                userAgent,
                language: GOFILE_LANGUAGE,
            };
            const fakeWin = {
                navigator: fakeNav,
                location: {
                    href: 'https://gofile.io/',
                    protocol: 'https:',
                    host: 'gofile.io',
                },
            };
            const generateWT = runner(fakeNav, fakeWin, {}, fakeWin.location);
            if (typeof generateWT === 'function') {
                cachedGenerateWT = generateWT;
                cachedWTTime = now;
                return generateWT;
            }
        }
        catch (err) {
            console.warn('[Gofile] Failed to fetch or execute wt.obf.js:', (err === null || err === void 0 ? void 0 : err.message) || err);
        }
        // Fallback if wt.obf.js is unreachable
        return (accountToken) => accountToken;
    });
}
function getOrFetchToken(axiosClient, userAgent) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (cachedAccountToken)
            return cachedAccountToken;
        const accountResponse = yield axiosClient.post(`${GOFILE_API}/accounts`, {}, {
            headers: {
                'User-Agent': userAgent,
                'Origin': 'https://gofile.io',
                'Referer': 'https://gofile.io/',
            },
        });
        const token = (_b = (_a = accountResponse.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.token;
        if (!token)
            throw new Error('[Gofile] Did not return an account token');
        cachedAccountToken = token;
        return token;
    });
}
function findFirstFile(content) {
    var _a;
    if ((content === null || content === void 0 ? void 0 : content.type) === 'file' && (content === null || content === void 0 ? void 0 : content.link))
        return content;
    for (const child of Object.values((_a = content === null || content === void 0 ? void 0 : content.children) !== null && _a !== void 0 ? _a : {})) {
        const file = findFirstFile(child);
        if (file)
            return file;
    }
    return undefined;
}
/**
 * Gofile extractor function / factory relying on ExtractorContext
 * Follows react-native-consumet conventions (Kwik, MegaUp, MegaPlay)
 */
function Gofile(ctx) {
    const serverName = 'Gofile';
    const sources = [];
    const { axios: client, USER_AGENT, PolyURL } = ctx;
    const userAgent = USER_AGENT || DEFAULT_USER_AGENT;
    const extract = (videoUrl) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const urlHref = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
            const urlObj = typeof videoUrl === 'object' && videoUrl.origin ? videoUrl : new PolyURL(urlHref);
            const id = urlObj.searchParams.get('c') || urlObj.pathname.split('/').filter(Boolean).pop() || urlHref;
            const token = yield getOrFetchToken(client, userAgent);
            const generateWT = yield getOrFetchGenerateWT(client, userAgent);
            const websiteToken = generateWT(token);
            const response = yield client.get(`${GOFILE_API}/contents/${id}`, {
                params: {
                    contentFilter: '',
                    page: 1,
                    pageSize: 1000,
                    sortField: 'name',
                    sortDirection: 1,
                },
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': `${GOFILE_LANGUAGE},en;q=0.9`,
                    'Authorization': `Bearer ${token}`,
                    'Origin': 'https://gofile.io',
                    'Referer': 'https://gofile.io/',
                    'User-Agent': userAgent,
                    'X-BL': GOFILE_LANGUAGE,
                    'X-Website-Token': websiteToken,
                },
            });
            if (((_a = response.data) === null || _a === void 0 ? void 0 : _a.status) !== 'ok') {
                if (((_b = response.data) === null || _b === void 0 ? void 0 : _b.status) === 'error-auth' || response.status === 401) {
                    cachedAccountToken = null;
                }
                throw new Error(`[Gofile] API returned ${(_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.status) !== null && _d !== void 0 ? _d : 'invalid data'}`);
            }
            const file = findFirstFile(response.data.data);
            if (!(file === null || file === void 0 ? void 0 : file.link)) {
                throw new Error('[Gofile] No downloadable file found in Gofile response');
            }
            const defaultSource = {
                url: file.link,
                isM3U8: file.link.includes('.m3u8'),
                isDASH: file.link.includes('.mpd'),
                quality: 'auto',
            };
            return {
                sources: [defaultSource],
                headers: {
                    'User-Agent': userAgent,
                    'Referer': 'https://gofile.io/',
                    'Cookie': `accountToken=${token}`,
                },
                download: file.link,
            };
        }
        catch (error) {
            throw new Error(`[Gofile] Failed to extract: ${error.message}`);
        }
    });
    return {
        serverName,
        sources,
        extract,
    };
}
exports.default = Gofile;
//# sourceMappingURL=gofile.js.map