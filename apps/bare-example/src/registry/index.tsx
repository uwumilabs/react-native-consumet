// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import ExtAnime from './Ext-anime';
import ExtMovies from './Ext-movies';

const ProviderManagerDemo = () => {
  const [selectedExample, setSelectedExample] = useState<'anime' | 'movies'>('anime');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e9ecef' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' }}>
          🚀 Provider Registry Demo
        </Text>
        <Text style={{ fontSize: 14, color: '#6c757d', textAlign: 'center', marginTop: 4 }}>
          Anime vs Movies Provider Testing
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
          onPress={() => setSelectedExample('anime')}
          style={{
            flex: 1,
            backgroundColor: selectedExample === 'anime' ? '#e74c3c' : '#ecf0f1',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            marginRight: 8,
            alignItems: 'center'
          }}
        >
          <Text style={{
            color: selectedExample === 'anime' ? 'white' : '#2c3e50',
            fontWeight: '600',
            fontSize: 16
          }}>
            📺 Anime Providers
          </Text>
          <Text style={{
            color: selectedExample === 'anime' ? 'rgba(255,255,255,0.8)' : '#6c757d',
            fontSize: 12,
            marginTop: 2
          }}>
            Test anime extensions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedExample('movies')}
          style={{
            flex: 1,
            backgroundColor: selectedExample === 'movies' ? '#3498db' : '#ecf0f1',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            alignItems: 'center'
          }}
        >
          <Text style={{
            color: selectedExample === 'movies' ? 'white' : '#2c3e50',
            fontWeight: '600',
            fontSize: 16
          }}>
            🎬 Movie Providers
          </Text>
          <Text style={{
            color: selectedExample === 'movies' ? 'rgba(255,255,255,0.8)' : '#6c757d',
            fontSize: 12,
            marginTop: 2
          }}>
            Test movie extensions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Example Description */}
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e9ecef' }}>
        {selectedExample === 'anime' ? (
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#e74c3c', marginBottom: 8 }}>
              📺 Anime Provider Testing
            </Text>
            <Text style={{ fontSize: 14, color: '#6c757d', lineHeight: 20 }}>
              Tests anime providers from the GitHub registry. Loads anime-specific extensions and tests 
              search functionality, anime info fetching, and episode source retrieval.
            </Text>
            <Text style={{ fontSize: 12, color: '#e74c3c', marginTop: 8, fontWeight: '600' }}>
              ✅ Features: Anime search, episode info, streaming sources
            </Text>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#3498db', marginBottom: 8 }}>
              🎬 Movie Provider Testing
            </Text>
            <Text style={{ fontSize: 14, color: '#6c757d', lineHeight: 20 }}>
              Tests movie providers from the GitHub registry. Loads movie-specific extensions and tests 
              search functionality, media info fetching, and episode source retrieval.
            </Text>
            <Text style={{ fontSize: 12, color: '#3498db', marginTop: 8, fontWeight: '600' }}>
              ✅ Features: Movie search, media info, streaming sources
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {selectedExample === 'anime' ? <ExtAnime /> : <ExtMovies />}
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
          💡 Both examples use the same ProviderManager class to test different provider categories
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default ProviderManagerDemo;
