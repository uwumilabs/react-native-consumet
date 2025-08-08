"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleExample = simpleExample;
const ProviderManager_1 = __importDefault(require("./ProviderManager"));
/**
 * Simple example showing the new registry-based approach
 */
async function simpleExample() {
    console.log('🚀 Registry-based Provider Manager\n');
    const manager = new ProviderManager_1.default();
    // Browse available extensions
    console.log('📚 Available Extensions:');
    const extensions = manager.getAvailableExtensions();
    extensions.forEach((ext) => {
        console.log(`  - ${ext.name} (${ext.category})`);
    });
    try {
        // Load anime provider from registry
        console.log('\n📥 Loading Zoro provider...');
        const zoro = await manager.getAnimeProvider('zoro-anime');
        console.log(`✅ Loaded: ${zoro.name}`);
        // Type-safe methods with full IntelliSense
        const results = await zoro.search('naruto', 1);
        console.log(`🔍 Found ${results.results?.length || 0} anime`);
        if (results.results?.[0]) {
            const anime = await zoro.fetchAnimeInfo(results.results[0].id);
            console.log(`📺 ${anime.title} (${anime.totalEpisodes} episodes)`);
        }
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    try {
        // Load movie provider from registry
        console.log('\n📥 Loading HiMovies provider...');
        const himovies = await manager.getMovieProvider('himovies-movies');
        console.log(`✅ Loaded: ${himovies.name}`);
        // Type-safe movie methods
        const movieResults = await himovies.search('batman', 1);
        console.log(`🔍 Found ${movieResults.results?.length || 0} movies`);
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
}
/**
 * Key benefits of the new approach:
 *
 * OLD WAY:
 * const manager = new ProviderManager();
 * await manager.loadProviderCode('./dist/providers/anime/zoro.js', 'zoro');
 * await manager.initializeProvider();
 * const provider = manager.asAnimeProvider();
 *
 * NEW WAY:
 * const manager = new ProviderManager();
 * const provider = await manager.getAnimeProvider('zoro-anime');
 *
 * Benefits:
 * 1. Registry-based: All providers in registry.json
 * 2. Auto-loading: Fetches from URLs automatically
 * 3. Type safety: getAnimeProvider() returns typed instance
 * 4. Metadata: Rich provider information
 * 5. Discovery: Browse providers by category
 * 6. Settings: Provider-specific configuration
 * 7. Validation: Automatic method validation
 */
if (require.main === module) {
    simpleExample().catch(console.error);
}
//# sourceMappingURL=ProviderManager.registry-example.js.map