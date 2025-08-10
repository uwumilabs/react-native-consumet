/**
 * Dynamic VidCloud Extractor
 * This file demonstrates how encryption can be updated without rebuilding the library
 */

// Example: Dynamic encryption configuration
const ENCRYPTION_CONFIG = {
    version: '2025.08.10',
    baseUrl: 'https://vidcloud.pro',
    keyUrl: 'https://raw.githubusercontent.com/consumet/vidcloud-keys/main/keys.json',
    sourcesEndpoint: '/ajax/embed-4/getSources',
};

/**
 * Dynamic VidCloud extractor factory
 * @param {Object} ctx - Extractor context (axios, load, USER_AGENT, logger)
 * @returns {Object} VidCloud extractor instance
 */
function createVidCloud(ctx) {
    return {
        name: 'VidCloud',
        version: ENCRYPTION_CONFIG.version,

        async extract(url, config = {}) {
            try {
                ctx.logger.log('🔧 Using dynamic VidCloud extractor v' + ENCRYPTION_CONFIG.version);

                // Dynamic key fetching - can be updated without rebuild
                const keyData = await this.fetchEncryptionKeys();

                // Extract video ID from URL
                const videoId = this.extractVideoId(url);
                if (!videoId) {
                    throw new Error('Could not extract video ID from URL');
                }

                // Fetch encrypted sources using dynamic configuration
                const sourcesResponse = await ctx.axios.get(
                    ENCRYPTION_CONFIG.baseUrl + ENCRYPTION_CONFIG.sourcesEndpoint,
                    {
                        params: { id: videoId },
                        headers: {
                            'User-Agent': ctx.USER_AGENT,
                            'Referer': ENCRYPTION_CONFIG.baseUrl + '/',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    }
                );

                // Dynamic decryption using fetched keys
                const decryptedSources = this.decryptSources(sourcesResponse.data, keyData);

                return {
                    sources: decryptedSources,
                    subtitles: await this.extractSubtitles(videoId),
                    headers: {
                        'User-Agent': ctx.USER_AGENT,
                        'Referer': ENCRYPTION_CONFIG.baseUrl + '/',
                    },
                    encryptionVersion: ENCRYPTION_CONFIG.version,
                };
            } catch (error) {
                ctx.logger.error('❌ VidCloud extraction failed:', error);
                throw error;
            }
        },

        async fetchEncryptionKeys() {
            try {
                const { data } = await ctx.axios.get(ENCRYPTION_CONFIG.keyUrl);
                return data;
            } catch (error) {
                // Fallback keys if remote fetch fails
                ctx.logger.warn('⚠️ Using fallback encryption keys');
                return {
                    current: 'fallback_key_here',
                    version: 'fallback',
                };
            }
        },

        extractVideoId(url) {
            // Extract video ID from VidCloud URL
            const match = url.toString().match(/\/embed\/([^?]+)/);
            return match ? match[1] : null;
        },

        decryptSources(encryptedData, keys) {
            try {
                // Dynamic decryption logic - can be updated as encryption changes
                const currentKey = keys.current || keys.key;

                if (!encryptedData.encrypted) {
                    // Not encrypted, return as-is
                    return this.formatSources(encryptedData.sources);
                }

                // Decrypt using current algorithm
                const decrypted = this.decrypt(encryptedData.sources, currentKey);
                const sources = JSON.parse(decrypted);

                return this.formatSources(sources);
            } catch (error) {
                throw new Error('Failed to decrypt VidCloud sources: ' + error.message);
            }
        },

        formatSources(sources) {
            return sources.map(source => ({
                url: source.file,
                quality: source.label || 'auto',
                isM3U8: source.file.includes('.m3u8'),
            }));
        },

        async extractSubtitles(videoId) {
            try {
                const subtitlesResponse = await ctx.axios.get(
                    ENCRYPTION_CONFIG.baseUrl + '/ajax/embed-4/getSubtitles',
                    {
                        params: { id: videoId },
                        headers: {
                            'User-Agent': ctx.USER_AGENT,
                            'Referer': ENCRYPTION_CONFIG.baseUrl + '/',
                        },
                    }
                );

                return subtitlesResponse.data.map(sub => ({
                    url: sub.file,
                    lang: sub.label,
                }));
            } catch (error) {
                ctx.logger.warn('⚠️ Could not fetch subtitles:', error);
                return [];
            }
        },

        decrypt(encryptedText, key) {
            // Placeholder for actual decryption logic
            // This can be updated dynamically as encryption changes
            return encryptedText; // Simplified for example
        },
    };
}

// Export the factory function
exports.createVidCloud = createVidCloud;

// For ES modules compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createVidCloud };
}
