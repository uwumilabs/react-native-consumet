/** The Anime tab: the library's bundled anime providers, picked from the header. */

import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimeBrowser } from '../components/AnimeBrowser';
import { DirectUrlButton } from '../components/DirectUrlButton';
import { ProviderSheet } from '../components/ProviderSheet';
import { HeaderChip, ScreenHeader } from '../components/ScreenHeader';
import { ANIME_PROVIDERS, useProviderChoice } from '../providers';
import { colors } from '../theme';

export default function AnimeScreen() {
  const { def, provider, select } = useProviderChoice(ANIME_PROVIDERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <SafeAreaView style={S.root} edges={['top', 'left', 'right']}>
      <AnimeBrowser
        provider={provider}
        label={def.label}
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
        onSelect={select}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
