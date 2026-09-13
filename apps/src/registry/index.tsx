/**
 * Registry screen — hosts Anime and Movies sub-tabs, both powered
 * by the extension registry (dynamic provider loading from GitHub CDN).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ExtAnimeScreen from './Ext-anime';
import ExtMoviesScreen from './Ext-movies';
import { colors, PAD, R } from '../theme';

type SubTab = 'anime' | 'movies';

const SUBTABS: { id: SubTab; label: string; emoji: string }[] = [
  { id: 'anime', label: 'Anime', emoji: '◈' },
  { id: 'movies', label: 'Movies & TV', emoji: '🎬' },
];

export default function RegistryScreen() {
  const [subTab, setSubTab] = useState<SubTab>('anime');

  return (
    <View style={S.root}>
      {/* Sub-tab bar */}
      <View style={S.subTabBar}>
        {SUBTABS.map((t) => {
          const active = subTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[S.subTab, active && S.subTabActive]}
              onPress={() => setSubTab(t.id)}
              activeOpacity={0.75}>
              <Text style={[S.subTabEmoji, active && S.subTabEmojiActive]}>{t.emoji}</Text>
              <Text style={[S.subTabLabel, active && S.subTabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content — mount both so state survives tab switches */}
      <View style={[S.screen, subTab !== 'anime' && S.hidden]}>
        <ExtAnimeScreen />
      </View>
      <View style={[S.screen, subTab !== 'movies' && S.hidden]}>
        <ExtMoviesScreen />
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  subTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: PAD,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: R.full,
    gap: 6,
  },
  subTabActive: {
    backgroundColor: colors.accentFaded,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  subTabEmoji: { fontSize: 14, color: colors.dim },
  subTabEmojiActive: { color: colors.accent },
  subTabLabel: { fontSize: 13, fontWeight: '600', color: colors.dim },
  subTabLabelActive: { color: colors.accentLight },

  screen: { flex: 1 },
  hidden: { display: 'none' },
});
