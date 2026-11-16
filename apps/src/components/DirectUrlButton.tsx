import { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { usePlayer } from '../hooks/usePlayer';
import { colors, PAD, R } from '../theme';
import { PlayerModal } from './PlayerModal';
import { HeaderChip } from './ScreenHeader';

/** A header button that plays a pasted video URL, sent with an optional Referer and User-Agent. */
export function DirectUrlButton() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [referer, setReferer] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const player = usePlayer('Direct');

  const play = () => {
    const uri = url.trim();
    if (!uri) return;
    setOpen(false);
    const headers: Record<string, string> = {};
    if (referer.trim()) headers.Referer = referer.trim();
    if (userAgent.trim()) headers['User-Agent'] = userAgent.trim();
    player.show({
      url: uri,
      isM3U8: uri.includes('.m3u8'),
      headers: Object.keys(headers).length ? headers : undefined,
    });
  };

  return (
    <>
      <HeaderChip emoji="🔗" onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={S.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={S.card}>
            <Text style={S.title}>Play direct URL</Text>
            <TextInput
              style={[S.input, S.urlInput]}
              value={url}
              onChangeText={setUrl}
              placeholder="Paste video URL…"
              placeholderTextColor={colors.dim}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            <TextInput
              style={S.input}
              value={referer}
              onChangeText={setReferer}
              placeholder="Referer (optional)…"
              placeholderTextColor={colors.dim}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={S.input}
              value={userAgent}
              onChangeText={setUserAgent}
              placeholder="User-Agent (optional)…"
              placeholderTextColor={colors.dim}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={S.playBtn} onPress={play}>
              <Text style={S.playText}>▶ Play</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <PlayerModal player={player} />
    </>
  );
}

const S = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: PAD },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  urlInput: { minHeight: 60 },
  playBtn: { backgroundColor: colors.accent, borderRadius: R.full, paddingVertical: 12, alignItems: 'center' },
  playText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
