// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { ProviderManager } from 'react-native-consumet';
const ExtGithub = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableExtensions, setAvailableExtensions] = useState<any[]>([]);
  const [selectedExtension, setSelectedExtension] = useState<string>('zoro-anime');
  const [provider, setProvider] = useState<any>(null);
  const [providerManager, setProviderManager] = useState<any>(null);

  useEffect(() => {
    const initializeProviderManager = async () => {
      setLoading(true);

      try {
        console.log('🚀 Initializing ProviderManager for GitHub registry...');
        
        // Create ProviderManager instance with registry
        const manager = new ProviderManager();
        setProviderManager(manager);
        
        // Get available extensions from registry
        const extensions = manager.getAvailableExtensions();
        console.log('📚 Available extensions:', extensions.map(ext => ext.id));
        setAvailableExtensions(extensions);
        
        // Load default extension (Zoro)
        await loadExtension(manager, selectedExtension);
        
      } catch (err: any) {
        console.error('❌ Failed to initialize ProviderManager:', err);
        Alert.alert('Initialization Error', err.message);
      }

      setLoading(false);
    };

    initializeProviderManager();
  }, []);

  const loadExtension = async (manager: any, extensionId: string) => {
    try {
      console.log(`📥 Loading extension: ${extensionId}`);
      
      // Get extension metadata
      const metadata = manager.getExtensionMetadata(extensionId);
      console.log('📋 Extension metadata:', {
        id: metadata?.id,
        name: metadata?.name,
        category: metadata?.category,
        main: metadata?.main,
        factories: metadata?.factories
      });
      
      // Load the extension from GitHub registry using type-safe method
      let providerInstance;
      if (metadata?.category === 'anime') {
        providerInstance = await manager.getAnimeProvider(extensionId);
        console.log("pass ho gya");
      } else if (metadata?.category === 'movies') {
        providerInstance = await manager.getMovieProvider(extensionId);
      } else {
        throw new Error(`Unsupported provider category: ${metadata?.category}. Only 'anime' and 'movies' are supported in React Native environment.`);
      }
      setProvider(providerInstance);
      
      console.log('✅ Extension loaded successfully:', {
        name: providerInstance.name,
        baseUrl: providerInstance.baseUrl,
        hasSearch: typeof providerInstance.search === 'function',
        hasFetchAnimeInfo: typeof providerInstance.fetchAnimeInfo === 'function'
      });
      
      // Test search functionality
      await testSearch(providerInstance);
      
    } catch (err: any) {
      console.error(`❌ Failed to load extension ${extensionId}:`, err);
      console.error('Full error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      Alert.alert('Extension Load Error', `Failed to load ${extensionId}: ${err.message}`);
    }
  };

  const testSearch = async (providerInstance: any) => {
    try {
      console.log('🔍 Testing search functionality...');
      
      const searchQuery = 'Naruto';
      const searchResults = await providerInstance.search(searchQuery);
      
      console.log('🎯 Search results:', {
        query: searchQuery,
        currentPage: searchResults.currentPage,
        hasNextPage: searchResults.hasNextPage,
        resultCount: searchResults.results
      });
      
      if (searchResults.results && searchResults.results.length > 0) {
        setResults(searchResults.results.slice(0, 10)); // Show first 10 results
        console.log('✅ Search successful, showing results');
      } else {
        console.log('⚠️ No search results found');
        setResults([]);
      }
      
    } catch (err: any) {
      console.error('❌ Search failed:', err);
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
        🌐 GitHub Registry Extension
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        Using ProviderManager with registry.json from GitHub
      </Text>
      
      {/* Extension Selector */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
          Available Extensions:
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
            📦 Loaded Provider: {provider.name}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            Base URL: {provider.baseUrl}
          </Text>
          <TouchableOpacity 
            onPress={refreshSearch}
            style={{ 
              marginTop: 8, 
              backgroundColor: '#27ae60', 
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
            Loading extension from registry...
          </Text>
        </View>
      ) : results.length > 0 ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#27ae60' }}>
            ✅ Registry provider working! Found {results.length} results:
          </Text>
          {results.map((item, idx) => (
            <View key={idx} style={{ 
              marginBottom: 12, 
              backgroundColor: '#e8f5e8', 
              padding: 12, 
              borderRadius: 8, 
              borderLeftWidth: 4, 
              borderLeftColor: '#27ae60' 
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
            Extension loaded but no results found.
          </Text>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
            Try refreshing or check network connection
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ExtGithub;

export default ExtGithub;
