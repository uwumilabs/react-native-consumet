// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView } from 'react-native';

const ExtGithub = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProvider = async () => {
      setLoading(true);

      try {
        console.log('Loading Zoro provider from GitHub...');
        
        // Fetch the CommonJS version from GitHub dist folder (now built with CommonJS)
        const githubUrl = 'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/zoro.js';
        
        console.log('Fetching CommonJS version from dist:', githubUrl);
        
        // Use fetch instead of axios for downloading
        const response = await fetch(githubUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch from GitHub: ${response.status} ${response.statusText}`);
        }
        
        const providerCode = await response.text();
        console.log('Downloaded provider code length:', providerCode.length);
        
        // Load dependencies for the provider context
        const axios = require('axios');
        const cheerio = require('cheerio');
        
        // Create a comprehensive provider context automatically
        // Developer doesn't need to manually configure axios, cheerio, or extractors!
        const axiosInstance = axios.default ? axios.default.create({
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
          }
        }) : axios.create({
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
          }
        });
        
        // Auto-configured provider context - developer just needs to use it!
        const providerContext = {
          axios: axiosInstance,
          load: cheerio.load,
          USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          extractors: {
            // Pre-configured extractors - no manual setup needed!
            StreamSB: class MockStreamSB { extract() { return Promise.resolve({}); } },
            MegaCloud: class MockMegaCloud { extract() { return Promise.resolve({}); } },
            StreamTape: class MockStreamTape { extract() { return Promise.resolve({}); } },
          },
          logger: console,
          AnimeParser: class AnimeParser {
            constructor() {}
            search() { throw new Error('Method should be overridden'); }
            fetchAnimeInfo() { throw new Error('Method should be overridden'); }
            fetchEpisodeSources() { throw new Error('Method should be overridden'); }
            fetchEpisodeServers() { throw new Error('Method should be overridden'); }
          }
        };
        
        console.log('Provider context created:', {
          hasAxios: !!providerContext.axios,
          hasGet: typeof providerContext.axios.get,
          hasLoad: typeof providerContext.load,
          hasExtractors: !!providerContext.extractors
        });

        // Evaluate the downloaded code to get the module
        // Create a CommonJS-like environment
        const moduleExports = {};
        const module = { exports: moduleExports };
        const exports = moduleExports;
        
        // Mock the require function for dependencies the provider needs
        const require = (modulePath) => {
          console.log('Provider requiring:', modulePath);
          
          // Handle model imports
          if (modulePath.includes('models/index.js') || modulePath.includes('../../models/index.js')) {
            // Return a mock AnimeParser base class
            return {
              AnimeParser: class AnimeParser {
                constructor() {}
                // Base methods that might be called
                search() { throw new Error('Method should be overridden'); }
                fetchAnimeInfo() { throw new Error('Method should be overridden'); }
                fetchEpisodeSources() { throw new Error('Method should be overridden'); }
                fetchEpisodeServers() { throw new Error('Method should be overridden'); }
              }
            };
          }
          
          // Handle other dependencies - just return empty objects for now
          console.warn(`Unknown module required: ${modulePath}`);
          return {};
        };
        
        // Evaluate the code in a controlled environment
        const evalCode = `
          (function(module, exports, require) {
            ${providerCode}
            return module.exports;
          })
        `;
        
        const evalFunction = eval(evalCode);
        const ZoroModule = evalFunction(module, exports, require);
        
        console.log('Evaluated Zoro Module:', ZoroModule);
        console.log('Available exports:', Object.keys(ZoroModule));

        // Test factory function if available
        let provider;
        if (ZoroModule.createZoro && typeof ZoroModule.createZoro === 'function') {
          console.log('Using factory function createZoro from GitHub...');
          console.log('Passing context with axios:', typeof providerContext.axios);
          console.log('Axios has get method:', typeof providerContext.axios.get);
          provider = ZoroModule.createZoro(providerContext);
          console.log('Created provider via factory from GitHub:', provider);
        } else if (ZoroModule.default || ZoroModule.Zoro) {
          // Fallback to class-based approach
          console.log('Using backward compatibility class from GitHub...');
          const ZoroClass = ZoroModule.default || ZoroModule.Zoro || ZoroModule;
          provider = new ZoroClass();
          console.log('Created provider via class from GitHub:', provider);
        } else {
          throw new Error('No valid provider export found in GitHub module');
        }

        if (provider && typeof provider.search === 'function') {
          console.log('Calling search method on GitHub provider...');
          const data = await provider.search('Naruto');
          console.log('Search results from GitHub provider:', data);
          setResults(data?.results || []);
        } else {
          console.error('Provider or search method not found:', { 
            provider: !!provider, 
            search: typeof provider?.search 
          });
          Alert.alert('Error', 'Search function not found in GitHub provider');
        }
      } catch (err: any) {
        console.error('GitHub Provider error:', err);
        Alert.alert('GitHub Provider Error', err.message);
      }

      setLoading(false);
    };

    fetchProvider();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Zoro Extension (GitHub Raw)</Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
        Loading provider directly from GitHub repository
      </Text>
      {loading ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <ActivityIndicator size="large" color="#666" />
          <Text style={{ marginTop: 10, color: '#888' }}>
            Downloading provider from GitHub...
          </Text>
        </View>
      ) : results.length > 0 ? (
        results.map((item, idx) => (
          <View key={idx} style={{ marginBottom: 12, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 }}>
            <Text style={{ fontWeight: 'bold', color: '#2c3e50' }}>{item.title || 'No Title'}</Text>
            <Text style={{ color: '#888', fontSize: 12 }}>{item.id}</Text>
            {item.type && <Text style={{ color: '#666', fontSize: 12 }}>Type: {item.type}</Text>}
            {item.url && <Text style={{ color: '#3498db', fontSize: 10 }}>{item.url}</Text>}
          </View>
        ))
      ) : (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ color: '#e74c3c', fontSize: 16 }}>No results found from GitHub provider.</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ExtGithub;
