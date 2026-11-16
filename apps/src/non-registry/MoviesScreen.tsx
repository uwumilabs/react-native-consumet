/** The Movies tab: the library's bundled movie providers, picked from the header. */

import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MovieBrowser } from '../components/MovieBrowser';
import { ProviderSheet } from '../components/ProviderSheet';
import { HeaderChip, ScreenHeader } from '../components/ScreenHeader';
import { MOVIE_PROVIDERS, useProviderChoice } from '../providers';
import { colors } from '../theme';

export default function MoviesScreen() {
  const { def, provider, select } = useProviderChoice(MOVIE_PROVIDERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <SafeAreaView style={S.root} edges={['top', 'left', 'right']}>
      <MovieBrowser
        provider={provider}
        label={def.label}
        header={
          <ScreenHeader title="Movies & TV">
            <HeaderChip emoji={def.emoji} label={def.label} onPress={() => setSheetOpen(true)} />
          </ScreenHeader>
        }
      />
      <ProviderSheet
        visible={sheetOpen}
        title="Movie Provider"
        providers={MOVIE_PROVIDERS}
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
