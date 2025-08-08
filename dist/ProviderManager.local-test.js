"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ProviderManager_1 = __importDefault(require("./ProviderManager"));
/**
 * Testing examples using local file loading
 */
async function testingExamples() {
    console.log('🧪 Provider Manager Testing Examples\n');
    const manager = new ProviderManager_1.default();
    // ==========================================
    // METHOD 1: Registry-based (Production)
    // ==========================================
    // console.log('📚 Method 1: Registry-based loading');
    // try {
    //   const zoroFromRegistry = await manager.getAnimeProvider('zoro-anime');
    //   console.log(`✅ Loaded from registry: ${zoroFromRegistry.name}`);
    // } catch (error) {
    //   console.error('❌ Registry loading failed:', error);
    // }
    // ==========================================
    // METHOD 2: Direct file loading (Testing)
    // ==========================================
    console.log('\n📁 Method 2: Direct file loading');
    try {
        // Load Zoro from local dist folder
        const zoroFromFile = await manager.loadProviderCode('./dist/providers/movies/himovies.js', 'createHiMovies');
        console.log(`✅ Loaded from file: ${zoroFromFile.name}`);
        // Test the provider
        const results = await zoroFromFile.search('naruto');
        const firstResult = results.results?.[0];
        let animeInfo;
        let movieInfo;
        if ('fetchAnimeInfo' in zoroFromFile) {
            animeInfo = await zoroFromFile.fetchAnimeInfo(firstResult?.id);
            console.log(`📺 ${animeInfo.title} (${animeInfo.totalEpisodes} episodes)`);
        }
        else {
            movieInfo = await zoroFromFile.fetchMediaInfo(firstResult?.id);
            console.log(`🎬 ${movieInfo.title}`);
        }
        const sources = await zoroFromFile.fetchEpisodeSources(movieInfo?.episodes[0]?.id, results.results?.[0].id);
        console.log(sources);
    }
    catch (error) {
        console.error('❌ File loading failed:', error);
    }
}
(async () => {
    await testingExamples();
})();
//# sourceMappingURL=ProviderManager.local-test.js.map