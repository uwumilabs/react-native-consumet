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
        // Load required dependencies
        const axios = require('axios');
        const cheerio = require('cheerio');
        
        console.log('Axios loaded:', axios);
        console.log('Axios default:', axios.default);
        console.log('Axios.create:', typeof axios.create);
        
        // Try different axios import patterns for React Native compatibility
        const axiosInstance = axios.default ? axios.default.create({
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }) : axios.create({
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        // Create provider context with dependencies
        const providerContext = {
          axios: axiosInstance,
          load: cheerio.load,
          USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          extractors: {}, // Can be empty for basic testing
          logger: console
        };
        
        console.log('Provider context created:', {
          hasAxios: !!providerContext.axios,
          hasGet: typeof providerContext.axios.get,
          hasLoad: typeof providerContext.load,
          hasExtractors: !!providerContext.extractors
        });

        // Test both factory function and backward compatibility
        const ZoroModule = require('../../../lib/commonjs/providers/anime/zoro.js');
        
        console.log('Loaded Zoro Module:', ZoroModule);
        console.log('Available exports:', Object.keys(ZoroModule));

        // Test factory function if available
        let provider;
        if (ZoroModule.createZoro && typeof ZoroModule.createZoro === 'function') {
          console.log('Using factory function createZoro...');
          console.log('Passing context with axios:', typeof providerContext.axios);
          console.log('Axios has get method:', typeof providerContext.axios.get);
          provider = ZoroModule.createZoro(providerContext);
          console.log('Created provider via factory:', provider);
        } else {
          // Fallback to class-based approach
          console.log('Using backward compatibility class...');
          const ZoroClass = ZoroModule.default || ZoroModule;
          provider = new ZoroClass();
          console.log('Created provider via class:', provider);
        }

        if (provider && typeof provider.search === 'function') {
          console.log('Calling search method...');
          const data = await provider.search('Naruto');
          console.log('Search results:', data);
          setResults(data?.results || []);
        } else {
          console.error('Provider or search method not found:', { 
            provider: !!provider, 
            search: typeof provider?.search 
          });
          Alert.alert('Error', 'Search function not found in provider');
        }
      } catch (err: any) {
        console.error('Provider error:', err);
        Alert.alert('Search Error', err.message);
      }

      setLoading(false);
    };

    fetchProvider();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Zoro Extension (Factory Function Test)</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#666" />
      ) : results.length > 0 ? (
        results.map((item, idx) => (
          <View key={idx} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.title || 'No Title'}</Text>
            <Text style={{ color: '#888' }}>{item.id}</Text>
            {item.type && <Text style={{ color: '#666' }}>Type: {item.type}</Text>}
            {item.url && <Text style={{ color: '#666', fontSize: 12 }}>{item.url}</Text>}
          </View>
        ))
      ) : (
        <Text>No results found.</Text>
      )}
    </ScrollView>
  );
};

export default Ext;
