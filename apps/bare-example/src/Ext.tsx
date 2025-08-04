// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, ScrollView } from 'react-native';
import {ANIME}from 'react-native-consumet';

const loadRemoteProvider = async (id: string) => {
  const url = `https://raw.githubusercontent.com/uwumilabs/react-native-consumet/refs/heads/main/dist/providers/anime/${id}.js`;

  try {
    const jsCode = await fetch(url).then(res => res.text());
    const module = { exports: {} };
    const runner = new Function('module', 'exports', jsCode);
    runner(module, module.exports);
    return module.exports;
  } catch (e: any) {
    Alert.alert('Provider Load Error', e.message);
    return null;
  }
};

const Ext = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProvider = async () => {
      setLoading(true);
      const provider = await loadRemoteProvider('zoro')!;
      console.log('Loaded Provider:', provider);
      if (provider?.search!) {
        try {
          const data = await provider?.search('Naruto');
          setResults(data?.results || []);
        } catch (err: any) {
          Alert.alert('Search Error', err.message);
        }
      } else {
        Alert.alert('Error', 'Search function not found in provider');
      }
      setLoading(false);
    };

    fetchProvider();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Zoro Extension</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#666" />
      ) : results.length > 0 ? (
        results.map((item, idx) => (
          <View key={idx} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.title?.romaji || item.title?.english || 'No Title'}</Text>
            <Text style={{ color: '#888' }}>{item.id}</Text>
          </View>
        ))
      ) : (
        <Text>No results found.</Text>
      )}
    </ScrollView>
  );
};

export default Ext;
