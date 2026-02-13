// Test file for Tollywood provider
import Tollywood from './tollywood';
import { createProviderContext } from '../../../utils';

async function testTollywood() {
  console.log('Testing Tollywood Provider...');

  const provider = new Tollywood();

  try {
    // Test 1: Fetch latest movies
    console.log('\n=== Test 1: Fetch Latest Movies ===');
    const latestMovies = await provider.fetchLatestMovies();
    console.log(`Found ${latestMovies.length} movies`);
    if (latestMovies.length > 0) {
      console.log('First movie:', latestMovies[0]);
    }

    // Test 2: Fetch Telugu featured
    console.log('\n=== Test 2: Fetch Telugu Featured ===');
    const featured = await provider.fetchTeluguFeatured(1);
    console.log(`Found ${featured.results.length} featured movies`);
    console.log(`Has next page: ${featured.hasNextPage}`);

    // Test 3: Search
    console.log('\n=== Test 3: Search ===');
    const searchResults = await provider.search('Baahubali');
    console.log(`Found ${searchResults.results.length} search results`);

    // Test 4: Fetch media info
    if (latestMovies.length > 0) {
      console.log('\n=== Test 4: Fetch Media Info ===');
      const movieId = latestMovies[0]!.id;
      console.log(`Fetching info for: ${movieId}`);
      const mediaInfo = await provider.fetchMediaInfo(movieId);
      console.log('Media info:', {
        title: mediaInfo.title,
        genres: mediaInfo.genres,
        type: mediaInfo.type,
      });
    }

    console.log('\n=== All tests passed! ===');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests
testTollywood();
