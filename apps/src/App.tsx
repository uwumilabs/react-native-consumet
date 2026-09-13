import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import AnimeScreen from './non-registry/AnimeScreen';
import MoviesScreen from './non-registry/MoviesScreen';
import RegistryScreen from './registry/index';
import { colors, R } from './theme';

type Tab = 'anime' | 'movies' | 'registry';

const TABS: { id: Tab; label: string; icon: string; activeIcon: string }[] = [
  { id: 'anime', label: 'Anime', icon: '▷', activeIcon: '▶' },
  { id: 'movies', label: 'Movies', icon: '◻', activeIcon: '▪' },
  { id: 'registry', label: 'Registry', icon: '⬡', activeIcon: '⬢' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('anime');

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} translucent={false} />

      {/* Screen area — keep all mounted so state survives tab switches */}
      <View style={[S.screen, tab !== 'anime' && S.hidden]}>
        <AnimeScreen />
      </View>
      <View style={[S.screen, tab !== 'movies' && S.hidden]}>
        <MoviesScreen />
      </View>
      <View style={[S.screen, tab !== 'registry' && S.hidden]}>
        <RegistryScreen />
      </View>

      {/* Bottom tab bar */}
      <View style={S.tabBar}>
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

const BAR_H = Platform.OS === 'ios' ? 80 : 62;

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1, paddingTop: 50 },
  hidden: { display: 'none' },

  tabBar: {
    flexDirection: 'row',
    height: BAR_H,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
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
