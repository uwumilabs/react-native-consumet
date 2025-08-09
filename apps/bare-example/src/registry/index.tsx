// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import ExtGithub from './Ext-github';
import ExtLocal from './Ext-local';

const ProviderManagerDemo = () => {
  const [selectedExample, setSelectedExample] = useState<'github' | 'local'>('github');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e9ecef' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' }}>
          🚀 ProviderManager Examples
        </Text>
        <Text style={{ fontSize: 14, color: '#6c757d', textAlign: 'center', marginTop: 4 }}>
          Registry vs Local Provider Loading
        </Text>
      </View>

      {/* Tab Selector */}
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: 'white', 
        paddingHorizontal: 16, 
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef'
      }}>
        <TouchableOpacity
          onPress={() => setSelectedExample('github')}
          style={{
            flex: 1,
            backgroundColor: selectedExample === 'github' ? '#27ae60' : '#ecf0f1',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            marginRight: 8,
            alignItems: 'center'
          }}
        >
          <Text style={{
            color: selectedExample === 'github' ? 'white' : '#2c3e50',
            fontWeight: '600',
            fontSize: 16
          }}>
            🌐 GitHub Registry
          </Text>
          <Text style={{
            color: selectedExample === 'github' ? 'rgba(255,255,255,0.8)' : '#6c757d',
            fontSize: 12,
            marginTop: 2
          }}>
            loadExtension()
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedExample('local')}
          style={{
            flex: 1,
            backgroundColor: selectedExample === 'local' ? '#e74c3c' : '#ecf0f1',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: 'center'
          }}
        >
          <Text style={{
            color: selectedExample === 'local' ? 'white' : '#2c3e50',
            fontWeight: '600',
            fontSize: 16
          }}>
            � React Native Loading
          </Text>
          <Text style={{
            color: selectedExample === 'local' ? 'rgba(255,255,255,0.8)' : '#6c757d',
            fontSize: 12,
            marginTop: 2
          }}>
            Direct imports + URLs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Example Description */}
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e9ecef' }}>
        {selectedExample === 'github' ? (
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#27ae60', marginBottom: 8 }}>
              🌐 GitHub Registry Example
            </Text>
            <Text style={{ fontSize: 14, color: '#6c757d', lineHeight: 20 }}>
              Uses <Text style={{ fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: 2 }}>ProviderManager.loadExtension()</Text> to load providers from the GitHub registry. 
              This method fetches providers from remote URLs defined in registry.json and automatically handles factory functions.
            </Text>
            <Text style={{ fontSize: 12, color: '#27ae60', marginTop: 8, fontWeight: '600' }}>
              ✅ Benefits: Remote updates, version control, automatic discovery
            </Text>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#e74c3c', marginBottom: 8 }}>
              � React Native Loading Example
            </Text>
            <Text style={{ fontSize: 14, color: '#6c757d', lineHeight: 20 }}>
              Demonstrates both static module imports and URL-based loading for React Native compatibility. 
              Shows how to handle bundler limitations with dynamic imports.
            </Text>
            <Text style={{ fontSize: 12, color: '#e74c3c', marginTop: 8, fontWeight: '600' }}>
              ✅ Benefits: Static bundling, cross-platform compatibility, remote loading
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {selectedExample === 'github' ? <ExtGithub /> : <ExtLocal />}
      </View>

      {/* Footer */}
      <View style={{ 
        backgroundColor: 'white', 
        padding: 12, 
        borderTopWidth: 1, 
        borderTopColor: '#e9ecef',
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 12, color: '#6c757d' }}>
          💡 Both examples use the same ProviderManager class with different loading methods
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default ProviderManagerDemo;
