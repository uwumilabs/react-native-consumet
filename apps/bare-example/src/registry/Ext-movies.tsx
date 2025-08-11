import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { ProviderManager, MOVIES, ExtractorManager } from 'react-native-consumet';
import { type ExtensionManifest, type MovieParser } from '../../../../src/models';
import HiMovies from '../../../../src/providers/movies/himovies/himovies';
import { PolyURL } from '../../../../src/utils/url-polyfill';
const testCode=require('./test-code-generated.js');
console.log((testCode.testCodeString));

const ExtMovies = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableExtensions, setAvailableExtensions] = useState<any[]>([]);
  const [selectedExtension, setSelectedExtension] = useState<string>('himovies');
  const [provider, setProvider] = useState<MovieParser | null>(null);
  const [providerManager, setProviderManager] = useState<ProviderManager | null>(null);

  useEffect(() => {
    const initializeProviderManager = async () => {
      setLoading(true);

      try {
        console.log('🚀 Initializing ProviderManager for movie providers...');
        
        // Create ProviderManager instance with registry
        const manager = new ProviderManager();
        setProviderManager(manager);
        
        // Get available movie extensions from registry
        const extensions = manager.getAvailableExtensions().filter(ext => ext.category === 'movies');
        console.log('📚 Available movie extensions:', extensions.map(ext => ext.id));
        setAvailableExtensions(extensions);
        
        // Load default extension (HiMovies)
        if (extensions.length > 0) {
          const defaultExtension = extensions.find(ext => ext.id === selectedExtension) || extensions[0];
          if (defaultExtension) {
            await loadExtension(manager, defaultExtension.id);
          }
        }
        
      } catch (err: any) {
        console.error('❌ Failed to initialize ProviderManager:', err);
        Alert.alert('Initialization Error', err.message);
      }

      setLoading(false);
    };

    initializeProviderManager();
  }, []);
  const loadExtension = async (manager: ProviderManager, extensionId: string) => {
    try {
      console.log(`📥 Loading movie extension: ${extensionId}`);
      
      // Get extension metadata
      const metadata = manager.getExtensionMetadata(extensionId);
      console.log('📋 Extension metadata:', {
        id: metadata?.id,
        name: metadata?.name,
        category: metadata?.category,
        main: metadata?.main,
        factories: metadata?.factoryName
      });
      
      // Ensure this is a movie provider
      if (metadata?.category !== 'movies') {
        throw new Error(`Expected movie provider, got ${metadata?.category}`);
      }
      
      // Load the movie extension from GitHub registry
      const providerInstance = await manager.getMovieProvider(extensionId) as HiMovies;
      setProvider(providerInstance);
      
      console.log('✅ Movie extension loaded successfully:', {
        name: providerInstance.name,
        hasSearch: typeof providerInstance.search === 'function',
        hasFetchMediaInfo: typeof providerInstance.fetchMediaInfo === 'function'
      });
      
      // Test search functionality
      await testSearch(providerInstance);
      
    } catch (err: any) {
      console.error(`❌ Failed to load movie extension ${extensionId}:`, err);
      console.error('Full error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      Alert.alert('Extension Load Error', `Failed to load ${extensionId}: ${err.message}`);
    }
  };

  const testSearch = async (providerInstance: MovieParser) => {
    try {
      console.log('🔍 Testing movie search functionality...');
      
      const searchQuery = 'Avengers';
      const searchResults = await providerInstance.search(searchQuery);
      
      console.log('🎯 Movie search results:', {
        query: searchQuery,
        currentPage: (searchResults as any)?.currentPage,
        hasNextPage: (searchResults as any)?.hasNextPage,
        resultCount: (searchResults as any)?.results?.length
      });
      
      if ((searchResults as any)?.results && (searchResults as any).results.length > 0) {
        setResults((searchResults as any).results.slice(0, 10)); // Show first 10 results
        console.log('✅ Movie search successful, showing results');
        
        // Test fetching movie info and episode sources
        const info = await providerInstance.fetchMediaInfo((searchResults as any).results[0].id);
        console.log('🎬 Movie info fetched:', {
          title: info.title,
          episodeCount: info.episodes?.length
        });
        
        if (info.episodes && info.episodes.length > 0 && info.episodes[0]) {
          const sources = await providerInstance.fetchEpisodeSources(
            info.episodes[0].id, 
            (searchResults as any).results[0].id
          );
          console.log('🎥 Episode sources fetched:', sources);
          const extractorManager = new ExtractorManager();
          
          // Load specific extractor dynamically from extension registry
          // const megacloudExtractor = await extractorManager.loadExtractor('megacloud');
          // load the code itself
          // @ts-ignore
          const metadata=extractorManager.getExtractorMetadata('megacloud');
          const megacloudExtractor = await extractorManager.executeExtractorCode(`${testCode.testCodeString}`,metadata!)
          const links = await megacloudExtractor.extract(new PolyURL(sources.headers?.Referer!),"https://himovies.sx");
          console.log('📹 Extracted video links:', links);

        }
      } else {
        console.log('⚠️ No movie search results found');
        setResults([]);
      }
      
    } catch (err: any) {
      console.error('❌ Movie search failed:', err);
      setResults([]);
    }
  };

  const switchExtension = async (extensionId: string) => {
    if (!providerManager) return;
    
    setSelectedExtension(extensionId);
    setResults([]);
    setLoading(true);
    
    await loadExtension(providerManager, extensionId);
    setLoading(false);
  };

  const refreshSearch = async () => {
    if (!provider) return;
    
    setLoading(true);
    await testSearch(provider);
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
        🎬 Movie Provider Registry
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        Testing movie providers from GitHub registry
      </Text>
      
      {/* Extension Selector */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
          Available Movie Extensions:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableExtensions.map((ext) => (
            <TouchableOpacity
              key={ext.id}
              onPress={() => switchExtension(ext.id)}
              style={{
                backgroundColor: selectedExtension === ext.id ? '#3498db' : '#ecf0f1',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
              }}
            >
              <Text style={{
                color: selectedExtension === ext.id ? 'white' : '#2c3e50',
                fontSize: 12,
                fontWeight: '600'
              }}>
                {ext.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Provider Info */}
      {provider && (
        <View style={{ marginBottom: 16, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2c3e50' }}>
            📦 Loaded Movie Provider: {provider.name}
          </Text>
          <TouchableOpacity 
            onPress={refreshSearch}
            style={{ 
              marginTop: 8, 
              backgroundColor: '#3498db', 
              paddingHorizontal: 12, 
              paddingVertical: 4, 
              borderRadius: 4,
              alignSelf: 'flex-start'
            }}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>🔄 Refresh Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={{ marginTop: 10, color: '#888' }}>
            Loading movie extension from registry...
          </Text>
        </View>
      ) : results.length > 0 ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#3498db' }}>
            ✅ Movie provider working! Found {results.length} results:
          </Text>
          {results.map((item, idx) => (
            <View key={idx} style={{ 
              marginBottom: 12, 
              backgroundColor: '#e8f4f8', 
              padding: 12, 
              borderRadius: 8, 
              borderLeftWidth: 4, 
              borderLeftColor: '#3498db' 
            }}>
              <Text style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                {item.title || 'No Title'}
              </Text>
              <Text style={{ color: '#888', fontSize: 12 }}>ID: {item.id}</Text>
              {item.type && <Text style={{ color: '#666', fontSize: 12 }}>Type: {item.type}</Text>}
              {item.releaseDate && <Text style={{ color: '#666', fontSize: 12 }}>Release: {item.releaseDate}</Text>}
              {item.url && <Text style={{ color: '#3498db', fontSize: 10 }}>{item.url}</Text>}
            </View>
          ))}
        </>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ color: '#3498db', fontSize: 16 }}>
            Movie extension loaded but no results found.
          </Text>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
            Try refreshing or check network connection
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ExtMovies;
