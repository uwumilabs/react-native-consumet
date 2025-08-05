// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { 
  loadProviderFromURL,
  createReactNativeProviderContext, 
  createZoro,
  type ExtensionManifest,
  type ExtensionRegistry 
} from 'react-native-consumet';

const ExtGithub = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerSource, setProviderSource] = useState<string>('');
  const [extensionInfo, setExtensionInfo] = useState<ExtensionManifest | null>(null);

  useEffect(() => {
    const fetchProvider = async () => {
      setLoading(true);

      try {
        console.log('Loading Zoro provider directly from GitHub...');
        
        // Create the test registry to get the GitHub URL
        const testRegistry: ExtensionRegistry = {
          metadata: {
            name: "Local Test Registry",
            description: "Local registry for testing extensions",
            version: "1.0.0",
            lastUpdated: "2025-08-05T00:00:00Z",
            url: "local://test-registry"
          },
          extensions: [
            {
              id: "zoro-anime",
              name: "Zoro Anime Provider",
              description: "High-quality anime streaming from Zoro (hianime.to) with multiple servers and subtitles",
              version: "1.0.0",
              author: {
                name: "Consumet Team",
                url: "https://github.com/uwumilabs"
              },
              category: "anime",
              main: "https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/zoro.js",
              factories: ["createZoro"],
              minConsumetVersion: "0.9.0",
              tags: ["anime", "streaming", "subbed", "dubbed", "popular"],
              homepage: "https://hianime.to",
              repository: "https://github.com/uwumilabs/react-native-consumet",
              license: "MIT",
              languages: ["en", "ja"],
              nsfw: false,
              status: "stable",
              lastUpdated: "2025-08-05T00:00:00Z"
            }
          ]
        };
        
        // Get the extension info
        const zoroExtension = testRegistry.extensions[0];
        const githubUrl = zoroExtension.main;
        
        console.log(`Loading provider from: ${githubUrl}`);
        setExtensionInfo(zoroExtension);
        
        let provider;
        
        try {
          // Direct load from GitHub URL - BADA BOOM! 💥
          const context = createReactNativeProviderContext();
          const module = await loadProviderFromURL(githubUrl, { 
            context,
            useNative: true // Enable native Android JavaScript evaluation!
          });
          console.log('Loaded module:', module);
          // Create provider instance
          provider = module.createZoro(context);
          console.log('Provider created successfully:',provider);
          console.log('✅ Provider loaded directly from GitHub using native evaluation!');
          setProviderSource(`GitHub Native (${zoroExtension.name} v${zoroExtension.version})`);
          
        } catch (urlError) {
          console.warn('GitHub URL failed, falling back to local version:', urlError.message);
          
          // Fallback to local provider
          const context = createReactNativeProviderContext();
          provider = createZoro(context);
          setProviderSource('Local (Built-in)');
        }
        
        console.log('Provider created successfully:', {
          hasSearch: typeof provider.search,
          hasFetchAnimeInfo: typeof provider.fetchAnimeInfo,
          hasFetchEpisodeSources: typeof provider.fetchEpisodeSources
        });

        // Test the search functionality
        console.log('Searching for "Naruto" using provider...');
        const data = await provider.search('sakamoto days');
        console.log('Search completed:', {
          hasResults: !!data?.results,
          resultCount: data?.results?.length || 0,
          currentPage: data?.currentPage,
          hasNextPage: data?.hasNextPage
        });
        
        setResults(data?.results || []);
        
      } catch (err: any) {
        console.error('Direct GitHub loading error:', err);
        Alert.alert('Extension Loading Error', err.message);
      }

      setLoading(false);
    };

    fetchProvider();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
        Zoro Extension (Registry System)
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        Direct loading from GitHub URL - skipping installation, just BADA BOOM! 💥
      </Text>
      
      {providerSource && (
        <View style={{ backgroundColor: '#e8f4fd', padding: 10, borderRadius: 6, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: '#1976d2' }}>
            Provider Source: {providerSource}
          </Text>
          {extensionInfo && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 11, color: '#1976d2' }}>
                Extension: {extensionInfo.name}
              </Text>
              <Text style={{ fontSize: 11, color: '#1976d2' }}>
                Author: {extensionInfo.author.name}
              </Text>
              <Text style={{ fontSize: 11, color: '#1976d2' }}>
                Description: {extensionInfo.description}
              </Text>
              {extensionInfo.tags && (
                <Text style={{ fontSize: 11, color: '#1976d2' }}>
                  Tags: {extensionInfo.tags.join(', ')}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
      
      {loading ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <ActivityIndicator size="large" color="#666" />
          <Text style={{ marginTop: 10, color: '#888' }}>
            Loading provider directly from GitHub URL...
          </Text>
        </View>
      ) : results.length > 0 ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#27ae60' }}>
            ✅ Provider loaded directly! Found {results.length} results:
          </Text>
          {results.map((item, idx) => (
            <View key={idx} style={{ marginBottom: 12, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontWeight: 'bold', color: '#2c3e50' }}>{item.title || 'No Title'}</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>{item.id}</Text>
              {item.type && <Text style={{ color: '#666', fontSize: 12 }}>Type: {item.type}</Text>}
              {item.url && <Text style={{ color: '#3498db', fontSize: 10 }}>{item.url}</Text>}
            </View>
          ))}
        </>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ color: '#e74c3c', fontSize: 16 }}>
            Provider loaded but no results found.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ExtGithub;
