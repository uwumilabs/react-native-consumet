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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleExample = simpleExample;
const ProviderManager_1 = __importDefault(require("./ProviderManager"));
/**
 * Simple example showing the new registry-based approach
 */
function simpleExample() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
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
            const zoro = yield manager.getAnimeProvider('zoro-anime');
            console.log(`✅ Loaded: ${zoro.name}`);
            // Type-safe methods with full IntelliSense
            const results = yield zoro.search('naruto', 1);
            console.log(results);
            if ((_a = results.results) === null || _a === void 0 ? void 0 : _a[0]) {
                const anime = yield zoro.fetchAnimeInfo(results.results[0].id);
                console.log(`📺 ${anime.title} (${anime.totalEpisodes} episodes)`);
            }
        }
        catch (error) {
            console.error('❌ Error:', error);
        }
        // try {
        //   // Load movie provider from registry
        //   console.log('\n📥 Loading HiMovies provider...');
        //   const himovies = await manager.getMovieProvider('himovies-movies');
        //   console.log(`✅ Loaded: ${himovies.name}`);
        //   // Type-safe movie methods
        //   const movieResults = await himovies.search('batman', 1);
        //   console.log(`🔍 Found ${movieResults.results?.length || 0} movies`);
        // } catch (error) {
        //   console.error('❌ Error:', error);
        // }
    });
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