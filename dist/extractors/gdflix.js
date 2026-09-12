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
exports.GDFlix = GDFlix;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
/**
 * GDFlix extractor function / factory relying on ExtractorContext
 * Follows react-native-consumet conventions (Kwik, MegaUp, MegaPlay)
 */
function GDFlix(ctx) {
    const serverName = 'GDFlix';
    const sources = [];
    const { axios: client, load, USER_AGENT, PolyURL } = ctx;
    const userAgent = USER_AGENT || DEFAULT_USER_AGENT;
    const extract = (videoUrl, referer) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            const urlHref = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
            const urlObj = typeof videoUrl === 'object' && videoUrl.origin ? videoUrl : new PolyURL(urlHref);
            const baseUrl = urlObj.origin;
            const pageHeaders = {
                'User-Agent': userAgent,
                'Referer': referer || baseUrl,
            };
            const res = yield client.get(urlHref, { headers: pageHeaders });
            let $ = load(res.data);
            // Handle location.replace redirect in body onload
            const bodyOnload = $('body').attr('onload');
            if (bodyOnload === null || bodyOnload === void 0 ? void 0 : bodyOnload.includes('location.replace')) {
                const redirectUrl = (_c = (_b = (_a = bodyOnload.split("location.replace('")) === null || _a === void 0 ? void 0 : _a[1]) === null || _b === void 0 ? void 0 : _b.split("'")) === null || _c === void 0 ? void 0 : _c[0];
                if (redirectUrl) {
                    const redirectRes = yield client.get(redirectUrl, { headers: pageHeaders });
                    $ = load(redirectRes.data);
                }
            }
            const rawTitle = $('title').text() || '';
            const qualityMatch = rawTitle.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i);
            const pageQuality = qualityMatch
                ? qualityMatch[1].toLowerCase() === '4k'
                    ? '2160p'
                    : qualityMatch[1].toLowerCase()
                : 'auto';
            const extractedSources = [];
            // 1. Resume Cloud / Resume Bot
            try {
                const resumeDrive = $('.btn-secondary').attr('href') || '';
                if (resumeDrive) {
                    if (resumeDrive.includes('indexbot')) {
                        const resumeBotRes = yield client.get(resumeDrive, { headers: pageHeaders });
                        const tokenMatch = resumeBotRes.data.match(/formData\.append\('token',\s*'([a-f0-9]+)'\)/);
                        const resumeBotToken = tokenMatch ? tokenMatch[1] : '';
                        const pathMatch = resumeBotRes.data.match(/fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/);
                        const resumeBotPath = pathMatch ? pathMatch[1] : '';
                        const resumeBotBaseUrl = resumeDrive.split('/download')[0];
                        if (resumeBotToken && resumeBotPath) {
                            const postRes = yield client.post(`${resumeBotBaseUrl}/download?id=${resumeBotPath}`, `token=${encodeURIComponent(resumeBotToken)}`, {
                                headers: {
                                    'Referer': resumeDrive,
                                    'Cookie': 'PHPSESSID=7e9658ce7c805dab5bbcea9046f7f308',
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                },
                            });
                            const downloadUrl = (_d = postRes.data) === null || _d === void 0 ? void 0 : _d.url;
                            if (downloadUrl) {
                                extractedSources.push({
                                    url: downloadUrl,
                                    server: 'ResumeBot',
                                    quality: pageQuality,
                                    isM3U8: downloadUrl.includes('.m3u8'),
                                });
                            }
                        }
                    }
                    else {
                        const targetUrl = resumeDrive.startsWith('http') ? resumeDrive : `${baseUrl}${resumeDrive}`;
                        const resumeDriveRes = yield client.get(targetUrl, { headers: pageHeaders });
                        const $resumeDrive = load(resumeDriveRes.data);
                        const resumeUrl = $resumeDrive('.btn-success').attr('href');
                        if (resumeUrl) {
                            extractedSources.push({
                                url: resumeUrl,
                                server: 'ResumeCloud',
                                quality: pageQuality,
                                isM3U8: resumeUrl.includes('.m3u8'),
                            });
                        }
                    }
                }
            }
            catch (_f) {
                // Resume link not found
            }
            // 2. Instant Link (G-Drive)
            try {
                const seed = $('.btn-danger').attr('href') || '';
                if (seed) {
                    if (!seed.includes('?url=')) {
                        const headRes = yield client.head(seed, { headers: pageHeaders });
                        const redirected = ((_e = headRes.request) === null || _e === void 0 ? void 0 : _e.responseURL) || seed;
                        const driveUrl = redirected.includes('?url=') ? redirected.split('?url=')[1] : redirected;
                        if (driveUrl) {
                            extractedSources.push({
                                url: driveUrl,
                                server: 'G-Drive',
                                quality: pageQuality,
                                isM3U8: driveUrl.includes('.m3u8'),
                            });
                        }
                    }
                    else {
                        const instantToken = seed.split('=')[1];
                        const videoSeedUrl = seed.split('/').slice(0, 3).join('/') + '/api';
                        if (instantToken) {
                            const postRes = yield client.post(videoSeedUrl, `keys=${encodeURIComponent(instantToken)}`, {
                                headers: {
                                    'x-token': videoSeedUrl,
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                },
                            });
                            const instantLinkData = typeof postRes.data === 'string' ? JSON.parse(postRes.data) : postRes.data;
                            if (instantLinkData && instantLinkData.error === false && instantLinkData.url) {
                                extractedSources.push({
                                    url: instantLinkData.url,
                                    server: 'G-Drive (download only)',
                                    quality: pageQuality,
                                    isM3U8: instantLinkData.url.includes('.m3u8'),
                                });
                            }
                        }
                    }
                }
            }
            catch (_g) {
                // Instant link not found
            }
            return {
                sources: extractedSources,
                headers: {
                    'User-Agent': userAgent,
                    'Referer': baseUrl,
                },
            };
        }
        catch (error) {
            throw new Error(`[GDFlix] Failed to extract: ${error.message}`);
        }
    });
    return {
        serverName,
        sources,
        extract,
    };
}
exports.default = GDFlix;
//# sourceMappingURL=gdflix.js.map