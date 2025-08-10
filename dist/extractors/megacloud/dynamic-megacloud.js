/**
 * Dynamic MegaCloud Extractor
 * This file demonstrates how encryption can be updated without rebuilding the library
 */

// Example: Dynamic encryption keys fetched from external source
const ENCRYPTION_CONFIG = {
    version: '2025.08.10',
    keyUrl: 'https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json',
    decodeUrl: 'https://megacloud.tv/embed-2/ajax/e-1/getSources',
};

/**
 * Dynamic MegaCloud extractor factory
 * @param {Object} ctx - Extractor context (axios, load, USER_AGENT, logger)
 * @returns {Object} MegaCloud extractor instance
 */
function createMegaCloud(ctx) {
    return {
        name: 'MegaCloud',
        version: ENCRYPTION_CONFIG.version,

        async extract(url, config = {}) {
            try {
                ctx.logger.log('🔧 Using dynamic MegaCloud extractor v' + ENCRYPTION_CONFIG.version);

                // Dynamic key fetching - can be updated without rebuild
                const { data: keyData } = await ctx.axios.get(ENCRYPTION_CONFIG.keyUrl);

                // Extract video ID from URL
                const videoId = this.extractVideoId(url);
                if (!videoId) {
                    throw new Error('Could not extract video ID from URL');
                }

                // Fetch encrypted sources using dynamic decode URL
                const sourcesResponse = await ctx.axios.get(ENCRYPTION_CONFIG.decodeUrl, {
                    params: { id: videoId },
                    headers: {
                        'User-Agent': ctx.USER_AGENT,
                        'Referer': 'https://megacloud.tv/',
                    },
                });

                // Dynamic decryption using fetched keys
                const decryptedSources = this.decryptSources(sourcesResponse.data, keyData);

                return {
                    sources: decryptedSources,
                    subtitles: [],
                    headers: {
                        'User-Agent': ctx.USER_AGENT,
                        'Referer': 'https://megacloud.tv/',
                    },
                    encryptionVersion: ENCRYPTION_CONFIG.version,
                };
            } catch (error) {
                ctx.logger.error('❌ MegaCloud extraction failed:', error);
                throw error;
            }
        },

        extractVideoId(url) {
            // Extract video ID from MegaCloud URL
            const match = url.toString().match(/\/embed-2\/([^?]+)/);
            return match ? match[1] : null;
        },

        decryptSources(encryptedData, keys) {
            // Dynamic decryption logic - can be updated as encryption changes
            try {
                // Example: Use latest key from fetched keys
                const currentKey = keys.latest || keys.keys[0];

                // Decrypt using current algorithm
                const decrypted = this.decrypt(encryptedData.sources, currentKey);

                return JSON.parse(decrypted).map(source => ({
                    url: source.file,
                    quality: source.label || 'auto',
                    isM3U8: source.file.includes('.m3u8'),
                }));
            } catch (error) {
                throw new Error('Failed to decrypt MegaCloud sources: ' + error.message);
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
exports.createMegaCloud = createMegaCloud;

// For ES modules compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMegaCloud };
}
