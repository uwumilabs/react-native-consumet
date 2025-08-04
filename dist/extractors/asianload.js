import { load } from 'cheerio';
import CryptoJS from 'crypto-js';
import { VideoExtractor } from '../models';
class AsianLoad extends VideoExtractor {
    constructor() {
        super(...arguments);
        this.serverName = 'asianload';
        this.sources = [];
        this.keys = {
            key: CryptoJS.enc.Utf8.parse('93422192433952489752342908585752'),
            iv: CryptoJS.enc.Utf8.parse('9262859232435825'),
        };
        this.extract = async (videoUrl) => {
            const res = await this.client.get(videoUrl.href);
            const $ = load(res.data);
            const encyptedParams = await this.generateEncryptedAjaxParams($, videoUrl.searchParams.get('id') ?? '');
            const encryptedData = await this.client.get(`${videoUrl.protocol}//${videoUrl.hostname}/encrypt-ajax.php?${encyptedParams}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const decryptedData = await this.decryptAjaxData(encryptedData.data.data);
            if (!decryptedData.source)
                throw new Error('No source found. Try a different server.');
            decryptedData.source.forEach((source) => {
                this.sources.push({
                    url: source.file,
                    isM3U8: source.file.includes('.m3u8'),
                });
            });
            decryptedData.source_bk.forEach((source) => {
                this.sources.push({
                    url: source.file,
                    isM3U8: source.file.includes('.m3u8'),
                });
            });
            const subtitles = decryptedData.track?.tracks?.map((track) => ({
                url: track.file,
                lang: track.kind === 'thumbnails' ? 'Default (maybe)' : track.kind,
            }));
            return {
                sources: this.sources,
                subtitles: subtitles,
            };
        };
        this.generateEncryptedAjaxParams = async ($, id) => {
            const encryptedKey = CryptoJS.AES.encrypt(id, this.keys.key, {
                iv: this.keys.iv,
            }).toString();
            const scriptValue = $("script[data-name='crypto']").data().value;
            const decryptedToken = CryptoJS.AES.decrypt(scriptValue, this.keys.key, {
                iv: this.keys.iv,
            }).toString(CryptoJS.enc.Utf8);
            return `id=${encryptedKey}&alias=${decryptedToken}`;
        };
        this.decryptAjaxData = async (encryptedData) => {
            const decryptedData = CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(encryptedData, this.keys.key, {
                iv: this.keys.iv,
            }));
            return JSON.parse(decryptedData);
        };
    }
}
export default AsianLoad;
//# sourceMappingURL=asianload.js.map