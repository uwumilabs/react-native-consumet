import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimeScreen from './non-registry/AnimeScreen';
import MoviesScreen from './non-registry/MoviesScreen';
import MangaScreen from './non-registry/MangaScreen';
import RegistryScreen from './registry/index';
import { colors, R } from './theme';

type Tab = 'anime' | 'movies' | 'manga' | 'registry';

const TABS: { id: Tab; label: string; icon: string; activeIcon: string }[] = [
  { id: 'anime', label: 'Anime', icon: '▷', activeIcon: '▶' },
  { id: 'movies', label: 'Movies', icon: '◻', activeIcon: '▪' },
  { id: 'manga', label: 'Manga', icon: '◇', activeIcon: '◆' },
  { id: 'registry', label: 'Registry', icon: '⬡', activeIcon: '⬢' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <Tabs />
    </SafeAreaProvider>
  );
}

function Tabs() {
  const [tab, setTab] = useState<Tab>('anime');
  // The app draws edge to edge: each screen's SafeAreaView clears the status bar, and the tab bar
  // sits above the system navigation bar (three buttons or gesture handle) with a little room.
  const { bottom } = useSafeAreaInsets();
  const barBottom = bottom + 8;

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" />

      {/* Screen area — keep all mounted so state survives tab switches */}
      <View style={[S.screen, tab !== 'anime' && S.hidden]}>
        <AnimeScreen />
      </View>
      <View style={[S.screen, tab !== 'movies' && S.hidden]}>
        <MoviesScreen />
      </View>
      <View style={[S.screen, tab !== 'manga' && S.hidden]}>
        <MangaScreen />
      </View>
      <View style={[S.screen, tab !== 'registry' && S.hidden]}>
        <RegistryScreen />
      </View>

      {/* Bottom tab bar */}
      <View style={[S.tabBar, { height: BAR_H + barBottom, paddingBottom: barBottom }]}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity key={t.id} style={S.tab} onPress={() => setTab(t.id)} activeOpacity={0.7}>
              {active && <View style={S.activePill} />}
              <Text style={[S.tabIcon, active && S.tabIconActive]}>{active ? t.activeIcon : t.icon}</Text>
              <Text style={[S.tabLabel, active && S.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Tab bar height above the bottom inset.
const BAR_H = 54;

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
  hidden: { display: 'none' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    gap: 3,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    borderRadius: R.full,
    backgroundColor: colors.accent,
  },
  tabIcon: { fontSize: 18, color: colors.dim, lineHeight: 22 },
  tabIconActive: { color: colors.accent },
  tabLabel: { fontSize: 11, fontWeight: '600', color: colors.dim, letterSpacing: 0.2 },
  tabLabelActive: { color: colors.accent },
});
