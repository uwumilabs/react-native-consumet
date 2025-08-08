"use strict";
// @ts-nocheck
/**
 * Personal Zoro Provider Manager - Usage Examples
 *
 * This file demonstrates how to use your ProviderManager
 * with different scenarios and configurations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimeBackgroundService = exports.AnimeProviderComponent = void 0;
exports.basicUsageExample = basicUsageExample;
exports.standardizedApiExample = standardizedApiExample;
exports.advancedUsageExample = advancedUsageExample;
const ProviderManager_1 = __importDefault(require("./ProviderManager"));
/**
 * Example 1: Basic Usage
 * Load zoro.js from dist folder and use original methods
 */
async function basicUsageExample() {
    console.log('🚀 Starting Basic Usage Example');
    // Create provider manager instance
    const zoroManager = new ProviderManager_1.default({
        // Custom configuration if needed
        userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
        timeout: 10000,
    });
    try {
        // Method 1: Load directly from GitHub URL
        // await zoroManager.loadProviderCode(
        //   'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/refs/heads/native-executor/dist/providers/anime/zoro.js'
        // );
        // Method 2: Fetch code first, then load from string (alternative approach)
        // const res = await fetch(
        //   'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/refs/heads/native-executor/dist/providers/anime/zoro.js'
        // );
        // const providerCode = await res.text();
        // zoroManager.loadProviderCodeFromString(providerCode);
        // Method 3: Load from local file (if available)
        await zoroManager.loadProviderCode('./dist/providers/anime/zoro.js');
        // Initialize the provider
        await zoroManager.initializeProvider();
        console.log('✅ Provider initialized successfully');
        // Use original zoro methods
        console.log('🔍 Searching for "Naruto"...');
        const searchResults = await zoroManager.search('solo leveling');
        console.log(`Found ${searchResults.results?.length || 0} anime`);
        if (searchResults.results && searchResults.results.length > 0) {
            const firstAnime = searchResults.results[0];
            console.log(`📺 Getting info for: ${firstAnime.title}`);
            const animeInfo = await zoroManager.fetchAnimeInfo(firstAnime.id);
            console.log(`✅ Got anime info: ${animeInfo.title} (${animeInfo.totalEpisodes} episodes)`);
            if (animeInfo.episodes && animeInfo.episodes.length > 0) {
                console.log('🎬 Getting episode sources...');
                const episodeSources = await zoroManager.fetchEpisodeSources(animeInfo.episodes[0].id, 'VidCloud', 'sub');
                console.log(`✅ Got ${episodeSources.sources?.length || 0} sources`);
            }
        }
    }
    catch (error) {
        console.error('❌ Error in basic usage:', error);
    }
}
/**
 * Example 2: Using Standardized API
 * Use the standardized API for compatibility with other systems
 */
async function standardizedApiExample() {
    console.log('🚀 Starting Standardized API Example');
    const zoroManager = new ProviderManager_1.default();
    try {
        await zoroManager.loadProviderCode('./lib/commonjs/providers/anime/zoro.js');
        await zoroManager.initializeProvider();
        // Get catalog of available content types
        const catalog = zoroManager.getCatalog();
        console.log('📋 Available catalogs:', catalog);
        // Get genres
        const genres = await zoroManager.getGenres();
        console.log('🏷️ Available genres:', genres.slice(0, 5)); // Show first 5
        // Get popular anime using standardized API
        const popularAnime = await zoroManager.getPosts('popular', 1);
        console.log(`⭐ Got ${popularAnime.length} popular anime`);
        // Search using standardized API
        const searchResults = await zoroManager.getSearchPosts('One Piece', 1);
        console.log(`🔍 Search returned ${searchResults.length} results`);
        if (searchResults.length > 0) {
            const firstResult = searchResults[0];
            // Get metadata using standardized API
            const metadata = await zoroManager.getMeta(firstResult.id);
            console.log(`📊 Metadata for ${metadata.title}:`, {
                type: metadata.type,
                status: metadata.status,
                episodes: metadata.totalEpisodes,
            });
            // Get episodes using standardized API
            const episodes = await zoroManager.getEpisodes(firstResult.id);
            console.log(`📺 Got ${episodes.length} episodes`);
            if (episodes.length > 0) {
                // Get streaming sources using standardized API
                const streams = await zoroManager.getStream(episodes[0].id);
                console.log(`🎬 Got ${streams.length} streaming sources`);
            }
        }
    }
    catch (error) {
        console.error('❌ Error in standardized API example:', error);
    }
}
/**
 * Example 3: Advanced Usage with Custom Configuration
 * Show advanced features and error handling
 */
async function advancedUsageExample() {
    console.log('🚀 Starting Advanced Usage Example');
    // Custom provider context configuration
    const customConfig = {
        userAgent: 'MyAnimeApp/1.0.0 (Android; Mobile)',
        timeout: 15000,
        headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
        },
    };
    const zoroManager = new ProviderManager_1.default(customConfig);
    try {
        // Load from URL (if you host zoro.js somewhere)
        // await zoroManager.loadProviderCode('https://your-domain.com/zoro.js');
        // Or load from local file
        await zoroManager.loadProviderCode('./lib/commonjs/providers/anime/zoro.js');
        await zoroManager.initializeProvider();
        console.log('🔧 Provider context details:', {
            isReady: zoroManager.isReady(),
            providerInfo: zoroManager.getProviderInfo(),
        });
        // Advanced search with filters
        const advancedSearchResults = await zoroManager.fetchAdvancedSearch({
            page: 1,
            type: 'TV',
            status: 'ongoing',
            season: 'fall',
            sort: 'popularity-desc',
            genres: ['Action', 'Adventure'],
        });
        console.log(`🔍 Advanced search found ${advancedSearchResults.results?.length || 0} anime`);
        // Get different content types
        const topAiring = await zoroManager.fetchTopAiring(1);
        const movies = await zoroManager.fetchMovie(1);
        const recentlyAdded = await zoroManager.fetchRecentlyAdded(1);
        console.log('📊 Content summary:', {
            topAiring: topAiring.results?.length || 0,
            movies: movies.results?.length || 0,
            recentlyAdded: recentlyAdded.results?.length || 0,
        });
        // Get direct access to zoro instance for custom methods
        const zoroInstance = zoroManager.getZoroInstance();
        console.log('🔗 Direct access to zoro instance available');
        // You can call any method directly on the instance
        // const customResult = await zoroInstance.someCustomMethod();
    }
    catch (error) {
        console.error('❌ Error in advanced usage:', error);
        // Detailed error handling
    }
}
exports.default = {
    basicUsageExample,
    standardizedApiExample,
    advancedUsageExample,
};
(async () => {
    console.log('🚀 Running all examples...');
    await basicUsageExample();
    //   await standardizedApiExample();
    //   await advancedUsageExample();
    console.log('✅ All examples completed successfully!');
})();
//# sourceMappingURL=ProviderManager.examples.js.map