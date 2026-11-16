"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDFlix = GDFlix;
const file_hosts_1 = require("./file-hosts");
const url_1 = require("./url");
function GDFlix(ctx) {
    const { axios, load, USER_AGENT, PolyURL } = ctx;
    const extract = async (videoUrl, referer) => {
        const url = (0, url_1.toUrl)(PolyURL, videoUrl);
        const baseUrl = url.origin;
        const pageHeaders = { 'User-Agent': USER_AGENT, 'Referer': referer || baseUrl };
        const res = await axios.get(url.href, { headers: pageHeaders });
        let $ = load(res.data);
        // Some pages only redirect, from the body's onload handler.
        const redirectUrl = $('body').attr('onload')?.split("location.replace('")?.[1]?.split("'")?.[0];
        if (redirectUrl) {
            const redirectRes = await axios.get(redirectUrl, { headers: pageHeaders });
            $ = load(redirectRes.data);
        }
        const pageQuality = (0, file_hosts_1.qualityIn)($('title').text()) ?? 'auto';
        const sources = [];
        try {
            const resumeDrive = $('.btn-secondary').attr('href') || '';
            if (resumeDrive.includes('indexbot')) {
                const resumeBotRes = await axios.get(resumeDrive, { headers: pageHeaders });
                const token = resumeBotRes.data.match(/formData\.append\('token',\s*'([a-f0-9]+)'\)/)?.[1];
                const path = resumeBotRes.data.match(/fetch\('\/download\?id=([a-zA-Z0-9/+]+)'/)?.[1];
                if (token && path) {
                    const postRes = await axios.post(`${resumeDrive.split('/download')[0]}/download?id=${path}`, `token=${encodeURIComponent(token)}`, { headers: { 'Referer': resumeDrive, 'Content-Type': 'application/x-www-form-urlencoded' } });
                    const downloadUrl = postRes.data?.url;
                    if (downloadUrl) {
                        sources.push({
                            url: downloadUrl,
                            server: 'ResumeBot',
                            quality: pageQuality,
                            isM3U8: downloadUrl.includes('.m3u8'),
                        });
                    }
                }
            }
            else if (resumeDrive) {
                const targetUrl = resumeDrive.startsWith('http') ? resumeDrive : `${baseUrl}${resumeDrive}`;
                const resumeDriveRes = await axios.get(targetUrl, { headers: pageHeaders });
                const resumeUrl = load(resumeDriveRes.data)('.btn-success').attr('href');
                if (resumeUrl) {
                    sources.push({
                        url: resumeUrl,
                        server: 'ResumeCloud',
                        quality: pageQuality,
                        isM3U8: resumeUrl.includes('.m3u8'),
                    });
                }
            }
        }
        catch {
            // Each button is a different host; one that fails leaves the others' sources.
        }
        try {
            const seed = $('.btn-danger').attr('href') || '';
            if (seed && !seed.includes('?url=')) {
                const headRes = await axios.head(seed, { headers: pageHeaders });
                const redirected = (0, file_hosts_1.finalUrl)(headRes, seed);
                const driveUrl = redirected.includes('?url=') ? redirected.split('?url=')[1] : redirected;
                if (driveUrl) {
                    sources.push({ url: driveUrl, server: 'G-Drive', quality: pageQuality, isM3U8: driveUrl.includes('.m3u8') });
                }
            }
            else if (seed) {
                const instantToken = seed.split('=')[1];
                const videoSeedUrl = seed.split('/').slice(0, 3).join('/') + '/api';
                if (instantToken) {
                    const postRes = await axios.post(videoSeedUrl, `keys=${encodeURIComponent(instantToken)}`, {
                        headers: { 'x-token': videoSeedUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
                    });
                    const instantLink = typeof postRes.data === 'string' ? JSON.parse(postRes.data) : postRes.data;
                    if (instantLink?.error === false && instantLink.url) {
                        sources.push({
                            url: instantLink.url,
                            server: 'G-Drive (download only)',
                            quality: pageQuality,
                            isM3U8: instantLink.url.includes('.m3u8'),
                        });
                    }
                }
            }
        }
        catch {
            // As above: the other hosts' sources stay.
        }
        return { sources, headers: { 'User-Agent': USER_AGENT, 'Referer': baseUrl } };
    };
    return { extract };
}
//# sourceMappingURL=gdflix.js.map