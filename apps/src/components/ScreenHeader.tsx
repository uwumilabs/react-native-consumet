import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, PAD, R } from '../theme';

type HeaderProps = {
  title: string;
  logo?: string;
  /** Next to the title, e.g. the Registry tab's load mode */
  badge?: ReactNode;
  /** The tab's controls, on the right */
  children?: ReactNode;
};

export function ScreenHeader({ title, logo, badge, children }: HeaderProps) {
  return (
    <View style={S.header}>
      <View style={S.left}>
        {logo ? <Text style={S.logo}>{logo}</Text> : null}
        <Text style={S.title}>{title}</Text>
        {badge}
      </View>
      <View style={S.right}>{children}</View>
    </View>
  );
}

type ChipProps = {
  emoji: string;
  /** With a label, the chip opens a picker and shows ▾ */
  label?: string;
  onPress: () => void;
  /** Highlighted, e.g. while a META layer is on */
  active?: boolean;
  /** A spinner instead of the emoji, and the chip disabled */
  loading?: boolean;
};

export function HeaderChip({ emoji, label, onPress, active, loading }: ChipProps) {
  return (
    <TouchableOpacity
      style={[S.chip, active && S.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} style={S.spinner} />
      ) : (
        <Text style={S.emoji}>{emoji}</Text>
      )}
      {label !== undefined ? (
        <>
          <Text style={S.label} numberOfLines={1}>
            {label}
          </Text>
          <Text style={S.caret}>▾</Text>
        </>
      ) : null}
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  logo: { fontSize: 22, color: colors.accent },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: 0.3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    backgroundColor: colors.card,
    borderRadius: R.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentFaded },
  spinner: { width: 18 },
  emoji: { fontSize: 14 },
  label: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.textSub },
  caret: { fontSize: 11, color: colors.muted },
});
