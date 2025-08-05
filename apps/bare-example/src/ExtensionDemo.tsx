// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';

const ExtensionDemo = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Test 1: Basic createProviderFromURL
  const testCreateProviderFromURL = async () => {
    setLoading(true);
    setCurrentTest('Creating provider from URL');
    setResults([]);

    try {
      addLog('Starting createProviderFromURL test...');

      const { createProviderFromURL } = require('../../../lib/commonjs/utils/index.js');
      
      const githubUrl = 'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/zoro.js';
      
      addLog('Creating provider with zero configuration...');
      const provider = await createProviderFromURL(githubUrl, 'createZoro');
      
      addLog('Provider created! Testing search...');
      const data = await provider.search('Demon Slayer');
      
      addLog(`✅ Success! Found ${data?.results?.length || 0} results`);
      setResults(data?.results || []);
      
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      Alert.alert('Test Failed', err.message);
    }

    setLoading(false);
  };

  // Test 2: testProviderURL with validation
  const testProviderValidation = async () => {
    setLoading(true);
    setCurrentTest('Validating provider URL');
    setResults([]);

    try {
      addLog('Starting provider URL validation test...');

      const { testProviderURL, createProviderFromURL } = require('../../../lib/commonjs/utils/index.js');
      
      const githubUrl = 'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/zoro.js';
      
      addLog('Testing provider URL...');
      const test = await testProviderURL(githubUrl);
      
      addLog(`Validation result: ${test.isValid ? '✅ Valid' : '❌ Invalid'}`);
      addLog(`Load time: ${test.loadTime}ms`);
      addLog(`Factories found: ${test.factories.join(', ')}`);
      
      if (test.errors.length > 0) {
        addLog(`Errors: ${test.errors.join(', ')}`);
      }

      if (test.isValid) {
        addLog('Provider is valid! Creating instance...');
        const provider = await createProviderFromURL(githubUrl, 'createZoro', {
          sanitize: false, // Trust validated source
          cache: true
        });
        
        const data = await provider.search('Attack on Titan');
        addLog(`✅ Validated provider works! Found ${data?.results?.length || 0} results`);
        setResults(data?.results || []);
      }
      
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      Alert.alert('Test Failed', err.message);
    }

    setLoading(false);
  };

  // Test 3: loadMultipleProviders
  const testMultipleProviders = async () => {
    setLoading(true);
    setCurrentTest('Loading multiple providers');
    setResults([]);

    try {
      addLog('Starting multiple providers test...');

      const { loadMultipleProviders } = require('../../../lib/commonjs/utils/index.js');
      
      const providerConfigs = [
        { 
          name: 'zoro', 
          url: 'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/zoro.js', 
          factory: 'createZoro' 
        }
        // Add more providers here when available
      ];
      
      addLog(`Loading ${providerConfigs.length} provider(s) in parallel...`);
      const providers = await loadMultipleProviders(providerConfigs, {
        timeout: 15000,
        sanitize: false
      });
      
      addLog(`✅ Loaded providers: ${Object.keys(providers).join(', ')}`);
      
      // Test search across all providers
      const allResults = [];
      for (const [name, provider] of Object.entries(providers)) {
        try {
          addLog(`Searching with ${name} provider...`);
          const data = await provider.search('Jujutsu Kaisen');
          if (data?.results?.length > 0) {
            allResults.push(...data.results.slice(0, 3).map(r => ({ ...r, source: name })));
          }
        } catch (searchErr) {
          addLog(`Search failed for ${name}: ${searchErr.message}`);
        }
      }
      
      addLog(`✅ Combined results from all providers: ${allResults.length}`);
      setResults(allResults);
      
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      Alert.alert('Test Failed', err.message);
    }

    setLoading(false);
  };

  // Test 4: Context utilities
  const testContextUtilities = async () => {
    setLoading(true);
    setCurrentTest('Testing context utilities');
    setResults([]);

    try {
      addLog('Starting context utilities test...');

      const { 
        createProviderContext, 
        createReactNativeProviderContext 
      } = require('../../../lib/commonjs/utils/index.js');
      
      const ZoroModule = require('../../../lib/commonjs/providers/anime/zoro.js');
      
      addLog('Testing createProviderContext...');
      const standardContext = createProviderContext();
      addLog(`Standard context extractors: ${Object.keys(standardContext.extractors).length}`);
      
      addLog('Testing createReactNativeProviderContext...');
      const rnContext = createReactNativeProviderContext();
      addLog(`RN context extractors: ${Object.keys(rnContext.extractors).length}`);
      
      addLog('Creating provider with standard context...');
      const provider1 = ZoroModule.createZoro(standardContext);
      
      addLog('Creating provider with RN context...');
      const provider2 = ZoroModule.createZoro(rnContext);
      
      addLog('Testing both providers...');
      const [data1, data2] = await Promise.all([
        provider1.search('Chainsaw Man'),
        provider2.search('Chainsaw Man')
      ]);
      
      addLog(`✅ Standard context: ${data1?.results?.length || 0} results`);
      addLog(`✅ RN context: ${data2?.results?.length || 0} results`);
      
      setResults([
        ...((data1?.results || []).slice(0, 3).map(r => ({ ...r, context: 'Standard' }))),
        ...((data2?.results || []).slice(0, 3).map(r => ({ ...r, context: 'React Native' })))
      ]);
      
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      Alert.alert('Test Failed', err.message);
    }

    setLoading(false);
  };

  // Test 5: Cache management
  const testCacheManagement = async () => {
    setLoading(true);
    setCurrentTest('Testing cache management');
    setResults([]);

    try {
      addLog('Starting cache management test...');

      const { 
        createProviderFromURL,
        getCachedExtensions,
        clearExtensionCache
      } = require('../../../lib/commonjs/utils/index.js');
      
      const githubUrl = 'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/dist/providers/anime/zoro.js';
      
      addLog('Clearing all cache...');
      clearExtensionCache();
      addLog(`Cached extensions: ${getCachedExtensions().length}`);
      
      addLog('Loading provider with cache enabled...');
      const startTime = Date.now();
      await createProviderFromURL(githubUrl, 'createZoro', { cache: true });
      const firstLoadTime = Date.now() - startTime;
      addLog(`First load time: ${firstLoadTime}ms`);
      addLog(`Cached extensions: ${getCachedExtensions().length}`);
      
      addLog('Loading same provider again (should be cached)...');
      const startTime2 = Date.now();
      const provider = await createProviderFromURL(githubUrl, 'createZoro', { cache: true });
      const secondLoadTime = Date.now() - startTime2;
      addLog(`Second load time: ${secondLoadTime}ms`);
      
      addLog(`✅ Cache speedup: ${firstLoadTime - secondLoadTime}ms faster`);
      
      const data = await provider.search('My Hero Academia');
      setResults(data?.results || []);
      
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      Alert.alert('Test Failed', err.message);
    }

    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#2c3e50' }}>
        Extension Utilities Demo
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
        Comprehensive test of all new utility functions
      </Text>

      {/* Test Buttons */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#3498db', padding: 12, borderRadius: 8, marginBottom: 10 }}
          onPress={testCreateProviderFromURL}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Test 1: createProviderFromURL
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#2ecc71', padding: 12, borderRadius: 8, marginBottom: 10 }}
          onPress={testProviderValidation}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Test 2: testProviderURL
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#9b59b6', padding: 12, borderRadius: 8, marginBottom: 10 }}
          onPress={testMultipleProviders}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Test 3: loadMultipleProviders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#e67e22', padding: 12, borderRadius: 8, marginBottom: 10 }}
          onPress={testContextUtilities}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Test 4: Context Utilities
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#34495e', padding: 12, borderRadius: 8, marginBottom: 10 }}
          onPress={testCacheManagement}
          disabled={loading}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Test 5: Cache Management
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      {loading && (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={{ marginTop: 10, color: '#888', textAlign: 'center' }}>
            {currentTest}
          </Text>
        </View>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Logs:</Text>
          <View style={{ backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, maxHeight: 200 }}>
            <ScrollView>
              {logs.map((log, idx) => (
                <Text key={idx} style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
                  {log}
                </Text>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Results */}
      {results.length > 0 && (
        <View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#27ae60' }}>
            Results ({results.length}):
          </Text>
          {results.map((item, idx) => (
            <View key={idx} style={{ 
              marginBottom: 12, 
              backgroundColor: '#f0f8ff', 
              padding: 12, 
              borderRadius: 8, 
              borderLeftWidth: 4, 
              borderLeftColor: '#3498db' 
            }}>
              <Text style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                {item.title || 'No Title'}
              </Text>
              <Text style={{ color: '#888', fontSize: 12 }}>{item.id}</Text>
              {item.type && <Text style={{ color: '#666', fontSize: 12 }}>Type: {item.type}</Text>}
              {item.source && <Text style={{ color: '#e67e22', fontSize: 12 }}>Source: {item.source}</Text>}
              {item.context && <Text style={{ color: '#9b59b6', fontSize: 12 }}>Context: {item.context}</Text>}
              {item.url && <Text style={{ color: '#3498db', fontSize: 10 }}>{item.url}</Text>}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default ExtensionDemo;
