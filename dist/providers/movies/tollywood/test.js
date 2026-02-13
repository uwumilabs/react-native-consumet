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
// Test file for Tollywood provider
const tollywood_1 = __importDefault(require("./tollywood"));
function testTollywood() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Testing Tollywood Provider...');
        const provider = new tollywood_1.default();
        try {
            // Test 1: Fetch latest movies
            console.log('\n=== Test 1: Fetch Latest Movies ===');
            const latestMovies = yield provider.fetchLatestMovies();
            console.log(`Found ${latestMovies.length} movies`);
            if (latestMovies.length > 0) {
                console.log('First movie:', latestMovies[0]);
            }
            // Test 2: Fetch Telugu featured
            console.log('\n=== Test 2: Fetch Telugu Featured ===');
            const featured = yield provider.fetchTeluguFeatured(1);
            console.log(`Found ${featured.results.length} featured movies`);
            console.log(`Has next page: ${featured.hasNextPage}`);
            // Test 3: Search
            console.log('\n=== Test 3: Search ===');
            const searchResults = yield provider.search('Baahubali');
            console.log(`Found ${searchResults.results.length} search results`);
            // Test 4: Fetch media info
            if (latestMovies.length > 0) {
                console.log('\n=== Test 4: Fetch Media Info ===');
                const movieId = latestMovies[0].id;
                console.log(`Fetching info for: ${movieId}`);
                const mediaInfo = yield provider.fetchMediaInfo(movieId);
                console.log('Media info:', {
                    title: mediaInfo.title,
                    genres: mediaInfo.genres,
                    type: mediaInfo.type,
                });
            }
            console.log('\n=== All tests passed! ===');
        }
        catch (error) {
            console.error('Test failed:', error);
        }
    });
}
// Run tests
testTollywood();
//# sourceMappingURL=test.js.map