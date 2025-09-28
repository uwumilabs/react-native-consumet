// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import ExtAnime from './Ext-anime';
import ExtMovies from './Ext-movies';
import ExtMeta from './Ext-meta';

const ProviderManagerDemo = () => {
  const [selectedExample, setSelectedExample] = useState<'anime' | 'movies'>('anime');

  return (
    <>
    {/* <ExtAnime/> */}
    {/* <ExtMovies/> */}
    <ExtMeta/>
    </>

  );
};

export default ProviderManagerDemo;
