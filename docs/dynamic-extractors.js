/**
 * Example: Using Dynamic Extractors in React Native Consumet
 * 
 * Dynamic extractors are now the default and only option!
 * Encryption updates happen automatically via commits to the extension registry.
 */

import { ProviderManager, ExtractorManager, createProviderContext } from 'react-native-consumet';

// Example 1: Using ProviderManager (simplest approach)
// Dynamic extractors are automatically enabled
const providerManager = new ProviderManager();

// Load a provider - it will use dynamic extractors automatically
const zoroProvider = await providerManager.loadExtension('zoro');
const episodeSources = await zoroProvider.fetchEpisodeSources('episode-123');

// Example 2: Direct ExtractorManager usage
const extractorManager = new ExtractorManager();

// Load specific extractor dynamically from extension registry
const megacloudExtractor = await extractorManager.loadExtractor('megacloud');
const sources = await megacloudExtractor.extract('https://megacloud.tv/embed-2/video123');

// Example 3: Auto-select extractor by site URL
const extractor = await extractorManager.loadExtractorBySite('https://megacloud.tv/embed-2/video123');
const result = await extractor.extract('https://megacloud.tv/embed-2/video123');

// Example 4: Using provider context (advanced)
const context = createProviderContext({
    userAgent: 'Custom User Agent',
    // Dynamic extractors are always enabled, no need to specify
});

// Access extractor manager from context
const contextExtractorManager = context.extractorManager;
const vidcloudExtractor = await contextExtractorManager.loadExtractor('vidcloud');

// Example 5: Provider using dynamic extractors
export function createZoro(ctx) {
    return {
        name: 'Zoro',

        async fetchEpisodeSources(episodeId) {
            // Get server URL from episode page  
            const serverUrl = await this.getServerUrl(episodeId);

            // Automatically use the right extractor based on server URL
            if (serverUrl.includes('megacloud.tv')) {
                // Dynamic extractor - automatically gets latest encryption from registry
                const sources = await ctx.extractors.MegaCloud(ctx).extract(serverUrl);
                return sources;
            } else if (serverUrl.includes('vidcloud.pro')) {
                // Dynamic extractor - automatically gets latest encryption from registry
                const sources = await ctx.extractors.VidCloud(ctx).extract(serverUrl);
                return sources;
            }

            // Fallback to other extractors...
        },
    };
}

/**
 * Key Changes in the New System:
 * 
 * 1. 🎯 Dynamic Extractors are Default
 *    - No need to specify useDynamicExtractors: true
 *    - All extractors load from extension-registry.json
 *    - Automatic encryption updates via git commits
 * 
 * 2. 📦 Unified Registry
 *    - Extractors are embedded in provider definitions
 *    - Single source of truth for all extensions
 *    - Version tracking per extractor
 * 
 * 3. � Automatic Updates
 *    - Encryption changes deployed in minutes
 *    - No library rebuilds needed
 *    - Users get updates automatically
 * 
 * 4. 🛡️ Smart Fallbacks
 *    - Falls back to static extractors if dynamic fails
 *    - Robust error handling
 *    - No breaking changes for existing code
 * 
 * 5. � Performance
 *    - Lazy loading of extractors
 *    - Only loads what you need
 *    - Caching for repeated use
 */

/**
 * Extension Registry Format:
 * 
 * {
 *   "extensions": [
 *     {
 *       "id": "zoro",
 *       "extractors": [
 *         {
 *           "name": "MegaCloud",
 *           "version": "1.0.0",
 *           "main": "https://raw.githubusercontent.com/.../dynamic-megacloud.js"
 *         },
 *         {
 *           "name": "VidCloud", 
 *           "version": "1.0.0",
 *           "main": "https://raw.githubusercontent.com/.../dynamic-vidcloud.js"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

export {
    ProviderManager,
    ExtractorManager,
    createProviderContext,
};