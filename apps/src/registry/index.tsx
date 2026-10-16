/**
 * Registry screen — hosts Anime and Movies sub-tabs, both powered by the extension registry.
 *
 * The "Load from" toggle picks how provider code is loaded (see load-provider.ts):
 * - Registry (default): fetch each entry's `main` from GitHub main and verify its sha256, as apps do.
 * - Local dist: run the bundles in local-dist-map.ts, still checked against the registry sha256.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ExtAnimeScreen from './Ext-anime';
import ExtMoviesScreen from './Ext-movies';
import { LoadErrorView, ModeToggle } from './LoadStatus';
import { createProviderManager, DEFAULT_LOAD_MODE, type LoadMode } from './load-provider';
import { colors, PAD, R } from '../theme';

type SubTab = 'anime' | 'movies';

const SUBTABS: { id: SubTab; label: string; emoji: string }[] = [
  { id: 'anime', label: 'Anime', emoji: '◈' },
  { id: 'movies', label: 'Movies & TV', emoji: '🎬' },
];

export default function RegistryScreen() {
  const [subTab, setSubTab] = useState<SubTab>('anime');
  const [mode, setMode] = useState<LoadMode>(DEFAULT_LOAD_MODE);
  // One ProviderManager (and so one ExtractorManager) for both sub-tabs, as in an app.
  const [setup] = useState(createProviderManager);

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

      {/* Load mode, shared by both sub-tabs */}
      <ModeToggle mode={mode} onChange={setMode} />

      {'failure' in setup ? (
        // The bundled registry failed validation (RegistryError), so nothing can load.
        <LoadErrorView failure={setup.failure} />
      ) : (
        <>
          {/* Content — mount both so state survives tab switches */}
          <View style={[S.screen, subTab !== 'anime' && S.hidden]}>
            <ExtAnimeScreen manager={setup.manager} mode={mode} onModeChange={setMode} />
          </View>
          <View style={[S.screen, subTab !== 'movies' && S.hidden]}>
            <ExtMoviesScreen manager={setup.manager} mode={mode} onModeChange={setMode} />
          </View>
        </>
      )}
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
