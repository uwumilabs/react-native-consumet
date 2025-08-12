import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { ProviderManager, ANIME } from 'react-native-consumet';
import { AnimeParser } from '../../../../src/models';
import Zoro from '../../../../src/providers/anime/zoro/zoro';

const ExtAnime = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableExtensions, setAvailableExtensions] = useState<any[]>([]);
  const [selectedExtension, setSelectedExtension] = useState<string>('zoro');
  const [provider, setProvider] = useState<Zoro | null>(null);
  const [providerManager, setProviderManager] = useState<ProviderManager | null>(null);

  useEffect(() => {
    const initializeProviderManager = async () => {
      setLoading(true);

      try {
        console.log('🚀 Initializing ProviderManager for anime providers...');
        
        // Create ProviderManager instance with registry
        const manager = new ProviderManager();
        setProviderManager(manager);
        
        // Get available anime extensions from registry
        const extensions = manager.getAvailableExtensions().filter(ext => ext.category === 'anime');
        console.log('📚 Available anime extensions:', extensions.map(ext => ext.id));
        setAvailableExtensions(extensions);
        
        // Load default extension (Zoro)
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
      console.log(`📥 Loading anime extension: ${extensionId}`);
      
      // Get extension metadata
      const metadata = manager.getExtensionMetadata(extensionId);
      console.log('📋 Extension metadata:', {
        id: metadata?.id,
        name: metadata?.name,
        category: metadata?.category,
        main: metadata?.main,
        factories: metadata?.factoryName
      });
      
      // Ensure this is an anime provider
      if (metadata?.category !== 'anime') {
        throw new Error(`Expected anime provider, got ${metadata?.category}`);
      }
      
      // Load the anime extension from GitHub registry
      const providerInstance = await manager.getAnimeProvider(extensionId) as Zoro;
      setProvider(providerInstance);
      
      console.log('✅ Anime extension loaded successfully:', {
        name: providerInstance.name,
        hasSearch: typeof providerInstance.search === 'function',
        hasFetchAnimeInfo: typeof providerInstance.fetchAnimeInfo === 'function'
      });
      
      // Test search functionality
      await testSearch(providerInstance);
      
    } catch (err: any) {
      console.error(`❌ Failed to load anime extension ${extensionId}:`, err);
      console.error('Full error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      Alert.alert('Extension Load Error', `Failed to load ${extensionId}: ${err.message}`);
    }
  };

  const testSearch = async (providerInstance: Zoro) => {
    try {
      console.log('🔍 Testing anime search functionality...');
      
      const searchQuery = 'Naruto';
      const searchResults = await providerInstance.search(searchQuery) as any;
      
      console.log('🎯 Anime search results:', {
        query: searchQuery,
        currentPage: searchResults?.currentPage,
        hasNextPage: searchResults?.hasNextPage,
        resultCount: searchResults?.results?.length
      });
      
      if (searchResults?.results && searchResults.results.length > 0) {
        setResults(searchResults.results.slice(0, 10)); // Show first 10 results
        console.log('✅ Anime search successful, showing results');
        
        // Test fetching anime info and episode sources
        const info = await providerInstance.fetchAnimeInfo(searchResults.results[0].id);
        console.log('📺 Anime info fetched:', {
          title: info.title,
          episodeCount: info.episodes?.length
        });
        
        if (info.episodes && info.episodes.length > 0 && info.episodes[0]) {
          const sources = await providerInstance.fetchEpisodeSources(info.episodes[0].id);
          console.log('🎬 Episode sources fetched:', {
            sourceCount: sources.sources?.length,
            quality: sources.sources?.[0]?.quality
          });
        }
      } else {
        console.log('⚠️ No anime search results found');
        setResults([]);
      }
      
    } catch (err: any) {
      console.error('❌ Anime search failed:', err);
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
        📺 Anime Provider Registry
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        Testing anime providers from GitHub registry
      </Text>
      
      {/* Extension Selector */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
          Available Anime Extensions:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableExtensions.map((ext) => (
            <TouchableOpacity
              key={ext.id}
              onPress={() => switchExtension(ext.id)}
              style={{
                backgroundColor: selectedExtension === ext.id ? '#e74c3c' : '#ecf0f1',
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
            📦 Loaded Anime Provider: {provider.name}
          </Text>
          <TouchableOpacity 
            onPress={refreshSearch}
            style={{ 
              marginTop: 8, 
              backgroundColor: '#e74c3c', 
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
          <ActivityIndicator size="large" color="#e74c3c" />
          <Text style={{ marginTop: 10, color: '#888' }}>
            Loading anime extension from registry...
          </Text>
        </View>
      ) : results.length > 0 ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#e74c3c' }}>
            ✅ Anime provider working! Found {results.length} results:
          </Text>
          {results.map((item, idx) => (
            <View key={idx} style={{ 
              marginBottom: 12, 
              backgroundColor: '#fdeaea', 
              padding: 12, 
              borderRadius: 8, 
              borderLeftWidth: 4, 
              borderLeftColor: '#e74c3c' 
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
          <Text style={{ color: '#e74c3c', fontSize: 16 }}>
            Anime extension loaded but no results found.
          </Text>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
            Try refreshing or check network connection
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ExtAnime;
