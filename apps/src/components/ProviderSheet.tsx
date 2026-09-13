/**
 * ProviderSheet — reusable bottom-sheet for picking a provider.
 *
 * Usage:
 *   <ProviderSheet
 *     visible={sheetOpen}
 *     providers={ANIME_PROVIDERS}
 *     selectedKey={activeDef.key}
 *     onSelect={key => setActiveDef(ANIME_PROVIDERS.find(p => p.key === key)!)}
 *     onClose={() => setSheetOpen(false)}
 *   />
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { colors, PAD, R } from '../theme';

export type ProviderItem = {
  key: string;
  label: string;
  emoji: string;
};

type Props = {
  visible: boolean;
  title?: string;
  providers: ProviderItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
};

export function ProviderSheet({
  visible,
  title = 'Select Provider',
  providers,
  selectedKey,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Dim backdrop — tap to dismiss */}
      <TouchableOpacity style={S.backdrop} onPress={onClose} activeOpacity={1} />

      {/* Sheet */}
      <View style={S.sheet}>
        {/* Drag handle */}
        <View style={S.handle} />

        <Text style={S.title}>{title}</Text>

        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {providers.map((p) => {
            const active = p.key === selectedKey;
            return (
              <TouchableOpacity
                key={p.key}
                style={[S.row, active && S.rowActive]}
                onPress={() => {
                  onSelect(p.key);
                  onClose();
                }}
                activeOpacity={0.7}>
                <Text style={S.emoji}>{p.emoji}</Text>
                <Text style={[S.label, active && S.labelActive]}>{p.label}</Text>
                {active ? (
                  <View style={S.checkWrap}>
                    <Text style={S.check}>✓</Text>
                  </View>
                ) : (
                  <View style={S.checkWrap} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ height: Platform.OS === 'ios' ? 30 : 14 }} />
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: 10,
    paddingHorizontal: PAD,
    borderTopWidth: 1,
    borderColor: colors.border,
    // Max height so very long lists still scroll
    maxHeight: '60%',
  },
  handle: {
    width: 38,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: R.full,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dim,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: R.md,
    gap: 12,
    marginBottom: 2,
  },
  rowActive: {
    backgroundColor: colors.accentFaded,
  },
  emoji: {
    fontSize: 20,
    width: 30,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSub,
  },
  labelActive: {
    color: colors.accentLight,
  },
  checkWrap: {
    width: 24,
    alignItems: 'center',
  },
  check: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '700',
  },
});
