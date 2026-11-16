/** The Anime tab: the library's bundled anime providers, picked from the header. */

import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimeBrowser } from '../components/AnimeBrowser';
import { DirectUrlButton } from '../components/DirectUrlButton';
import { ProviderSheet } from '../components/ProviderSheet';
import { HeaderChip, ScreenHeader } from '../components/ScreenHeader';
import { ANIME_PROVIDERS, isDubSeparate, pickProvider } from '../providers';
import { colors } from '../theme';

export default function AnimeScreen() {
  const [{ def, provider }, setChoice] = useState(() => pickProvider(ANIME_PROVIDERS[0]!));
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <SafeAreaView style={S.root} edges={['top', 'left', 'right']}>
      <AnimeBrowser
        provider={provider}
        label={def.label}
        subDubSeparate={isDubSeparate(provider)}
        header={
          <ScreenHeader logo="◈" title="Anime">
            <DirectUrlButton />
            <HeaderChip emoji={def.emoji} label={def.label} onPress={() => setSheetOpen(true)} />
          </ScreenHeader>
        }
      />
      <ProviderSheet
        visible={sheetOpen}
        providers={ANIME_PROVIDERS}
        selectedKey={def.key}
        onSelect={(key) => {
          const next = ANIME_PROVIDERS.find((p) => p.key === key);
          if (next && next !== def) setChoice(pickProvider(next));
        }}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
