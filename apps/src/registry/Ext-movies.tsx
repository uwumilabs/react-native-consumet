import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import {
  ProviderManager,
  ExtensionRegistry,
  type IMovieResult,
  type ISearch,
  ExtractorManager,
  defaultExtractorContext,
  PolyURL,
  type MovieProvider,
} from 'react-native-consumet';
import { MovieParser, StreamingServers } from '../../../src/models';
// @ts-ignore
import * as testExtCode from './test-ext-code-generated.js';
// @ts-ignore
import * as testExtrCode from './test-extr-code-generated.js';
const ExtMovies = () => {
  const [results, setResults] = useState<IMovieResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableExtensions, setAvailableExtensions] = useState<any[]>([]);
  const [selectedExtension, setSelectedExtension] = useState<string>('multimovies');
  const [provider, setProvider] = useState<MovieParser | null>(null);
  const [providerManager, setProviderManager] = useState<ProviderManager | null>(null);

  useEffect(() => {
    const initializeProviderManager = async () => {
      setLoading(true);

      try {
        console.log('🚀 Initializing ProviderManager for movie providers...');

        const manager = new ProviderManager(ExtensionRegistry);
        setProviderManager(manager);

        const extensions = manager.getExtensionsByCategory('movies');
        console.log(
          '📚 Available movie extensions:',
          extensions.map((ext) => ext.id)
        );
        setAvailableExtensions(extensions);

        if (extensions.length > 0) {
          const defaultExtension = extensions.find((ext) => ext.id === selectedExtension) || extensions[0];
          if (defaultExtension) {
            await loadExtension(manager, defaultExtension.id as MovieProvider);
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

  const loadExtension = async (manager: ProviderManager, extensionId: MovieProvider) => {
    try {
      console.log(`📥 Loading movie extension: ${extensionId}`);

      // const providerInstance = (await manager.loadExtension(extensionId)) as MultiMovies;
      const metadata = manager.getExtensionMetadata(extensionId);
      // @ts-ignore
      const providerInstance = await manager.executeProviderCode<'MultiMovies'>(
        `${testExtCode.testCodeString}`,
        'createMultiMovies',
        // @ts-ignore
        metadata
      );
      console.log({ providerInstance });
      setProvider(providerInstance);

      console.log('✅ Movie extension loaded successfully:', {
        name: providerInstance.name,
        hasSearch: typeof providerInstance.search === 'function',
        hasFetchMovieInfo: typeof providerInstance.fetchMediaInfo === 'function',
      });

      const searchQuery = 'True Detective';
      const searchResults = (await providerInstance.search(searchQuery)) as ISearch<IMovieResult>;

      console.log('🎯 Movie search results:', searchResults);

      if (searchResults?.results && searchResults.results.length > 0) {
        setResults(searchResults.results.slice(0, 10));
        console.log('✅ Movie search successful, showing results');

        const info = await providerInstance.fetchMediaInfo(searchResults.results[0]!.id);
        console.log('📺 Movie info fetched:', info);
        const servers = await providerInstance.fetchEpisodeServers(
          info.episodes[0].id,
          (searchResults as any).results[0].id
        );
        console.log(servers);

        if (info.episodes && info.episodes.length > 0 && info.episodes[0]) {
          const sources1 = await providerInstance.fetchEpisodeSources(info.episodes[0].id, info.id, servers[0].name);
          const sources2 = await providerInstance.fetchEpisodeSources(info.episodes[0].id, info.id, servers[1].name);
          console.log('🎬 Episode sources fetched:', { sources1, sources2 });
          const extractorManager = new ExtractorManager(ExtensionRegistry);

          // Load specific extractor dynamically from extension registry
          // const megacloudExtractor = await extractorManager.loadExtractor('megacloud');
          // load the code itself
          const metadata = extractorManager.getExtractorMetadata(StreamingServers.MegaUp);

          const megacloudExtractor = await extractorManager.executeExtractorCode(
            `${testExtrCode.testCodeString}`,
            metadata!
          );
          const links1 = await megacloudExtractor.extract(new PolyURL(servers[0]?.url!), 'https://himovies.sx');
          const links2 = await megacloudExtractor.extract(new PolyURL(servers[1]?.url!), 'https://himovies.sx');
          console.log('📹 Extracted video links:', { links1, links2 });
        }
      } else {
        console.log('⚠️ No movie search results found');
        setResults([]);
      }
    } catch (err: any) {
      console.error(`❌ Failed to load movie extension ${extensionId}:`, err);
      Alert.alert('Extension Load Error', `Failed to load ${extensionId}: ${err.message}`);
    }
  };

  const switchExtension = async (extensionId: string) => {
    if (!providerManager) return;

    setSelectedExtension(extensionId);
    setResults([]);
    setLoading(true);

    await loadExtension(providerManager, extensionId as MovieProvider);
    setLoading(false);
  };

  const refreshSearch = async () => {
    if (!provider) return;

    setLoading(true);
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>📺 Movie Provider Registry</Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        Testing movie providers from GitHub registry
      </Text>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Available Movie Extensions:</Text>
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
              }}>
              <Text
                style={{
                  color: selectedExtension === ext.id ? 'white' : '#2c3e50',
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                {ext.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {provider && (
        <View style={{ marginBottom: 16, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2c3e50' }}>
            📦 Loaded Movie Provider: {provider.name}
          </Text>
          <TouchableOpacity
            onPress={refreshSearch}
            style={{
              marginTop: 8,
              backgroundColor: '#e74c3c',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 4,
              alignSelf: 'flex-start',
            }}>
            <Text style={{ color: 'white', fontSize: 12 }}>🔄 Refresh Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <ActivityIndicator size="large" color="#e74c3c" />
          <Text style={{ marginTop: 10, color: '#888' }}>Loading movie extension from registry...</Text>
        </View>
      ) : results.length > 0 ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#e74c3c' }}>
            ✅ Movie provider working! Found {results.length} results:
          </Text>
          {results.map((item, idx) => (
            <View
              key={idx}
              style={{
                marginBottom: 12,
                backgroundColor: '#fdeaea',
                padding: 12,
                borderRadius: 8,
                borderLeftWidth: 4,
                borderLeftColor: '#e74c3c',
              }}>
              <Text style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                {typeof item.title === 'string'
                  ? item.title
                  : item.title?.english || item.title?.romaji || item.title?.native || 'No Title'}
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
          <Text style={{ color: '#e74c3c', fontSize: 16 }}>Movie extension loaded but no results found.</Text>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Try refreshing or check network connection</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ExtMovies;
