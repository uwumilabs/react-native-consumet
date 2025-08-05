// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView } from 'react-native';

const Ext = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProvider = async () => {
      setLoading(true);

      try {
        console.log('Testing local provider with new utilities...');
        
        // Import the new utility functions and provider context
        const { 
          createProviderContext,
          createReactNativeProviderContext 
        } = require('../../../lib/commonjs/utils/index.js');
        
        // Import the local provider module directly
        const ZoroModule = require('../../../lib/commonjs/providers/anime/zoro.js');
        console.log(ZoroModule)
        console.log('Loaded Zoro Module:', {
          hasCreateZoro: typeof ZoroModule.createZoro,
          hasDefault: !!ZoroModule.default,
          exports: Object.keys(ZoroModule)
        });

        // Test both factory function and context utilities
        let provider;
        
        if (ZoroModule.createZoro && typeof ZoroModule.createZoro === 'function') {
          console.log('Using factory function with createProviderContext...');
          
          // Create provider context with all defaults (axios, extractors, etc.)
          const context = createProviderContext();
          console.log('Provider context created with defaults:', {
            hasAxios: !!context.axios,
            hasLoad: typeof context.load,
            hasExtractors: !!context.extractors,
            extractorCount: Object.keys(context.extractors).length,
            hasAnimeParser: !!context.AnimeParser,
            hasMovieParser: !!context.MovieParser
          });
          
          provider = ZoroModule.createZoro(context);
          console.log('Created provider via factory with full context:', {
            hasSearch: typeof provider.search,
            hasFetchAnimeInfo: typeof provider.fetchAnimeInfo,
            hasFetchEpisodeSources: typeof provider.fetchEpisodeSources
          });
        } else {
          // Fallback to class-based approach
          console.log('Using backward compatibility class...');
          const ZoroClass = ZoroModule.default || ZoroModule;
          provider = new ZoroClass();
          console.log('Created provider via class:', {
            hasSearch: typeof provider.search
          });
        }

        // Test different search scenarios
        console.log('Testing search functionality...');
        
        const searchQueries = ['Naruto', 'One Piece'];
        
        for (const query of searchQueries) {
          try {
            console.log(`Searching for "${query}"...`);
            const data = await provider.search(query);
            console.log(`Search results for "${query}":`, {
              hasResults: !!data?.results,
              resultCount: data?.results?.length || 0,
              currentPage: data?.currentPage,
              hasNextPage: data?.hasNextPage
            });
            
            if (data?.results?.length > 0) {
              setResults(data.results);
              break; // Use first successful result
            }
          } catch (searchErr) {
            console.warn(`Search failed for "${query}":`, searchErr.message);
          }
        }
        
      } catch (err: any) {
        console.error('Provider error:', err);
        Alert.alert('Provider Error', err.message);
      }

      setLoading(false);
    };

    fetchProvider();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
        Zoro Extension (Local + New Utils)
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        Using createProviderContext utility with factory function pattern
      </Text>
      {loading ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <ActivityIndicator size="large" color="#666" />
          <Text style={{ marginTop: 10, color: '#888' }}>
            Testing provider with new utilities...
          </Text>
        </View>
      ) : results.length > 0 ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#27ae60' }}>
            ✅ Local provider working! Found {results.length} results:
          </Text>
          {results.map((item, idx) => (
            <View key={idx} style={{ marginBottom: 12, backgroundColor: '#f0f8ff', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#3498db' }}>
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

export default Ext;
