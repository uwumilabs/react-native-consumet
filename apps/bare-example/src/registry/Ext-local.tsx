import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import React, { useState } from 'react';

const ExtLocal = () => {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const testNetworkAndFunction = async () => {
    setTestResults([]);
    addResult('🚀 Starting tests...');

    // Test 1: Basic fetch to GitHub raw content
    try {
      addResult('📡 Testing basic fetch to GitHub...');
      const response = await fetch('https://raw.githubusercontent.com/uwumilabs/react-native-consumet/native-executor/dist/providers/anime/zoro.js');
      if (response.ok) {
        const content = await response.text();
        addResult(`✅ Fetch successful! Content length: ${content.length} characters`);
        addResult(`📋 First 100 chars: ${content.substring(0, 100)}...`);
        
        // Test 2: Function constructor with simple code
        try {
          addResult('🔧 Testing Function constructor with simple code...');
          const simpleFunction = new Function('return "Hello from Function constructor"');
          const result = simpleFunction();
          addResult(`✅ Simple Function constructor works: ${result}`);
        } catch (funcError: any) {
          addResult(`❌ Simple Function constructor failed: ${funcError.message}`);
        }

        // Test 3: Function constructor with fetched code (simplified)
        try {
          addResult('🔧 Testing Function constructor with variable assignment...');
          const varFunction = new Function('x', 'return x * 2');
          const varResult = varFunction(5);
          addResult(`✅ Function with parameter works: ${varResult}`);
        } catch (funcError: any) {
          addResult(`❌ Function with parameter failed: ${funcError.message}`);
        }

        // Test 4: Function constructor with more complex code
        try {
          addResult('🔧 Testing Function constructor with complex code...');
          const complexCode = `
            const data = { name: 'Test', value: 42 };
            return data;
          `;
          const complexFunction = new Function(complexCode);
          const complexResult = complexFunction();
          addResult(`✅ Complex Function constructor works: ${JSON.stringify(complexResult)}`);
        } catch (funcError: any) {
          addResult(`❌ Complex Function constructor failed: ${funcError.message}`);
        }

        // Test 5: Try to execute a small portion of the actual provider code
        try {
          addResult('🔧 Testing Function constructor with provider-like code...');
          const providerLikeCode = `
            const exports = {};
            function createTest() {
              return {
                name: 'Test Provider',
                search: function(query) {
                  return Promise.resolve({ results: [{ title: query }] });
                }
              };
            }
            return { createTest };
          `;
          const providerFunction = new Function(providerLikeCode);
          const providerResult = providerFunction();
          const testProvider = providerResult.createTest();
          addResult(`✅ Provider-like Function works: ${testProvider.name}`);
        } catch (funcError: any) {
          addResult(`❌ Provider-like Function failed: ${funcError.message}`);
        }

        // Test 6: Test async function support (after disabling Hermes)
        try {
          addResult('🔧 Testing Function constructor with async function...');
          const asyncCode = `
            const exports = {};
            function createAsyncTest() {
              return {
                name: 'Async Test Provider',
                search: async function(query) {
                  return { results: [{ title: 'async: ' + query }] };
                }
              };
            }
            return { createAsyncTest };
          `;
          const asyncFunction = new Function(asyncCode);
          const asyncResult = asyncFunction();
          const asyncProvider = asyncResult.createAsyncTest();
          addResult(`✅ Async Function constructor works: ${asyncProvider.name}`);
          
          // Test the async method
          asyncProvider.search('test').then((result: any) => {
            addResult(`✅ Async method executed: ${JSON.stringify(result)}`);
          }).catch((err: any) => {
            addResult(`❌ Async method failed: ${err.message}`);
          });
        } catch (funcError: any) {
          addResult(`❌ Async Function constructor failed: ${funcError.message}`);
        }

      } else {
        addResult(`❌ Fetch failed with status: ${response.status} ${response.statusText}`);
      }
    } catch (networkError: any) {
      addResult(`❌ Network error: ${networkError.message}`);
      addResult(`❌ Error name: ${networkError.name}`);
      addResult(`❌ Error stack: ${networkError.stack}`);
    }

    // Test 6: Test different URLs
    const testUrls = [
      'https://httpbin.org/get',
      'https://jsonplaceholder.typicode.com/posts/1',
      'https://raw.githubusercontent.com/uwumilabs/react-native-consumet/main/README.md'
    ];

    for (const url of testUrls) {
      try {
        addResult(`📡 Testing URL: ${url}`);
        const response = await fetch(url);
        addResult(`${response.ok ? '✅' : '❌'} Status: ${response.status} for ${url}`);
      } catch (error: any) {
        addResult(`❌ Failed to fetch ${url}: ${error.message}`);
      }
    }

    addResult('🏁 Tests completed!');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Network & Function Tests
      </Text>
      
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <TouchableOpacity
          onPress={testNetworkAndFunction}
          style={{
            backgroundColor: '#007AFF',
            padding: 10,
            borderRadius: 5,
            marginRight: 10,
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Run Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={clearResults}
          style={{
            backgroundColor: '#FF3B30',
            padding: 10,
            borderRadius: 5,
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5', padding: 10 }}>
        {testResults.map((result, index) => (
          <Text key={index} style={{ marginBottom: 5, fontFamily: 'monospace' }}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

export default ExtLocal;