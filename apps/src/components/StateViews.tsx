import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, PAD, R } from '../theme';

export function LoadingView({ title, text }: { title?: string; text: string }) {
  return (
    <View style={S.center}>
      <ActivityIndicator size="large" color={colors.accent} />
      {title ? <Text style={S.loadingTitle}>{title}</Text> : null}
      <Text style={S.mutedText}>{text}</Text>
    </View>
  );
}

export function IdleView({ emoji, title, hint }: { emoji: string; title: string; hint: string }) {
  return (
    <View style={S.center}>
      <Text style={S.idleEmoji}>{emoji}</Text>
      <Text style={S.idleTitle}>{title}</Text>
      <Text style={S.idleHint}>{hint}</Text>
    </View>
  );
}

/** One line of muted text in the middle, e.g. a call that returned nothing. */
export function MessageView({ text }: { text: string }) {
  return (
    <View style={S.center}>
      <Text style={S.mutedText}>{text}</Text>
    </View>
  );
}

export function ErrorView({
  message,
  onRetry,
  retryLabel = 'Retry',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={S.center}>
      <Text style={S.errEmoji}>⚠️</Text>
      <Text style={S.errText}>{message}</Text>
      {onRetry ? <RetryButton label={retryLabel} onPress={onRetry} /> : null}
    </View>
  );
}

/** The accent pill under an error, or anywhere a list offers to load more. */
export function RetryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={S.retryBtn} onPress={onPress}>
      <Text style={S.retryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: PAD },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: colors.textSub },
  mutedText: { fontSize: 14, color: colors.muted },
  idleEmoji: { fontSize: 52, marginBottom: 4 },
  idleTitle: { fontSize: 18, fontWeight: '700', color: colors.textSub, textAlign: 'center' },
  idleHint: { fontSize: 14, color: colors.dim, textAlign: 'center' },
  errEmoji: { fontSize: 36 },
  errText: { fontSize: 14, color: colors.error, textAlign: 'center', maxWidth: 280 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: colors.accentFaded,
    borderRadius: R.full,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: colors.accentLight },
});
