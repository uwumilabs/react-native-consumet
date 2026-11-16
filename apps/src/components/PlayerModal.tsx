import { Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Video from 'react-native-video';
import type { Player } from '../hooks/usePlayer';
import { colors, R } from '../theme';
import { ErrorView, LoadingView } from './StateViews';

/** The full-screen player for `usePlayer`; `label` names what plays, and the server chips switch servers. */
export function PlayerModal({ player, label }: { player: Player; label?: string }) {
  const { open, loading, error, stream, servers, server } = player;
  return (
    <Modal visible={open} animationType="fade" onRequestClose={player.close} statusBarTranslucent>
      <View style={S.root}>
        <StatusBar hidden />
        {loading ? (
          <LoadingView text="Fetching stream…" />
        ) : error ? (
          <ErrorView message={error} onRetry={player.retry} />
        ) : stream ? (
          <Video
            source={{
              uri: stream.url,
              headers: stream.headers,
              ...(stream.isM3U8 && Platform.OS === 'ios' ? { type: 'hls' } : {}),
            }}
            style={StyleSheet.absoluteFill}
            controls
            resizeMode="contain"
            onError={player.videoFailed}
            onLoad={player.videoLoaded}
          />
        ) : null}

        <TouchableOpacity style={S.back} onPress={player.close}>
          <Text style={S.backText}>←</Text>
        </TouchableOpacity>

        {label && !loading && !error ? (
          <View style={S.label}>
            <Text style={S.labelText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}

        {servers.length > 0 && !loading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={S.serverRow}
            contentContainerStyle={S.serverRowContent}>
            {servers.map((s) => (
              <TouchableOpacity
                key={s.name}
                style={[S.serverChip, server === s.name && S.serverChipActive]}
                onPress={() => player.selectServer(s.name)}>
                <Text style={S.serverChipText}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  back: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 18,
    width: 40,
    height: 40,
    borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backText: { fontSize: 20, color: '#fff', lineHeight: 22 },
  label: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 24,
    left: 70,
    right: 70,
    alignItems: 'center',
    zIndex: 10,
  },
  labelText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  serverRow: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 16,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  serverRowContent: { paddingHorizontal: 12, gap: 8 },
  serverChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  serverChipActive: { borderColor: colors.accent, backgroundColor: 'rgba(0,0,0,0.85)' },
  serverChipText: { fontSize: 12, color: '#fff', fontWeight: '600' },
});
