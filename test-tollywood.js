// Simple test for Tollywood provider
const { createProviderContext } = require('./dist/utils/create-provider-context').default;
const Tollywood = require('./dist/providers/movies/tollywood/tollywood').default;

console.log('=== Testing Tollywood Provider ===\n');

async function testTollywood() {
  console.log('1. Creating Tollywood provider...');
  const provider = new Tollywood();
  console.log('   Provider:', { name: provider.name, baseUrl: provider.baseUrl, languages: provider.languages });

  console.log('\n2. Testing fetchLatestMovies()...');
  try {
    const latest = await provider.fetchLatestMovies();
    console.log(`   Found ${latest.length} movies`);
    if (latest.length > 0) {
      console.log('   First movie:', {
        id: latest[0].id,
        title: latest[0].title,
        image: latest[0].image?.substring(0, 50) + '...',
      });
    }
  } catch (err) {
    console.error('   Error:', err.message);
  }

  console.log('\n3. Testing fetchTeluguFeatured()...');
  try {
    const featured = await provider.fetchTeluguFeatured(1);
    console.log(`   Found ${featured.results.length} featured movies`);
    console.log(`   Has next page: ${featured.hasNextPage}`);
  } catch (err) {
    console.error('   Error:', err.message);
  }

  console.log('\n4. Testing search()...');
  try {
    const searchResults = await provider.search('Baahubali');
    console.log(`   Found ${searchResults.results.length} search results`);
    if (searchResults.results.length > 0) {
      console.log('   First result:', {
        id: searchResults.results[0].id,
        title: searchResults.results[0].title,
      });
    }
  } catch (err) {
    console.error('   Error:', err.message);
  }

  console.log('\n=== All tests completed! ===\n');
}

testTollywood().catch(err => {
  console.error('Test failed:', err);
});
