/**
 * LoadStatus — the load-mode toggle, and what the Registry tab shows about each load:
 * where the code came from, whether it was verified, and why a load failed.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { colors, PAD, R } from '../theme';
import { LOAD_MODES, type LoadFailure, type LoadMode, type LoadReport } from './load-provider';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const modeLabel = (mode: LoadMode) => LOAD_MODES.find((m) => m.id === mode)?.label ?? mode;

// ── Mode toggle ───────────────────────────────────────────────────────────────

export function ModeToggle({ mode, onChange }: { mode: LoadMode; onChange: (mode: LoadMode) => void }) {
  const active = LOAD_MODES.find((m) => m.id === mode);
  return (
    <View style={S.toggleWrap}>
      <View style={S.toggleRow}>
        <Text style={S.toggleLabel}>Load from</Text>
        <View style={S.segment}>
          {LOAD_MODES.map((m) => {
            const on = m.id === mode;
            return (
              <TouchableOpacity
                key={m.id}
                style={[S.segmentBtn, on && (m.id === 'local' ? S.segmentBtnLocal : S.segmentBtnOn)]}
                onPress={() => onChange(m.id)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}>
                <Text style={[S.segmentText, on && S.segmentTextOn]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {active ? <Text style={S.toggleHint}>{active.description}</Text> : null}
    </View>
  );
}

// ── Header badge ──────────────────────────────────────────────────────────────

export function ModeBadge({ mode }: { mode: LoadMode }) {
  const local = mode === 'local';
  return (
    <View style={[S.badge, local && S.badgeLocal]}>
      <Text style={[S.badgeText, local && S.badgeTextLocal]}>{local ? 'LOCAL' : 'REGISTRY'}</Text>
    </View>
  );
}

// ── Loaded: source + integrity ────────────────────────────────────────────────

export function LoadReportBar({ report }: { report: LoadReport }) {
  const verified = report.integrity === 'verified';
  const hash = report.sha256 ? `${report.sha256.slice(0, 12)}…` : '';
  return (
    <View style={[S.report, !verified && S.reportWarn]}>
      <Text style={[S.reportTitle, !verified && S.reportTitleWarn]} numberOfLines={1}>
        {verified ? '✓' : '⚠'} {report.name} {report.version} · {modeLabel(report.mode)} ·{' '}
        {verified ? `sha256 verified ${hash}` : 'integrity check SKIPPED'}
      </Text>
      <Text style={S.reportSource} numberOfLines={1} ellipsizeMode="middle">
        {verified ? report.source : 'Unverified local code: it does not match the registry entry'}
      </Text>
    </View>
  );
}

// ── Failed ────────────────────────────────────────────────────────────────────

type ErrorProps = {
  failure: LoadFailure;
  onRetry?: () => void;
  onSkipIntegrity?: () => void;
  onSwitchMode?: (mode: LoadMode) => void;
};

export function LoadErrorView({ failure, onRetry, onSkipIntegrity, onSwitchMode }: ErrorProps) {
  const integrity = failure.kind === 'integrity';
  return (
    <ScrollView contentContainerStyle={S.errRoot} showsVerticalScrollIndicator={false}>
      <Text style={S.errEmoji}>{integrity ? '🛡️' : failure.kind === 'not-published' ? '📭' : '⚠️'}</Text>
      <Text style={S.errKind}>{KIND_LABEL[failure.kind]}</Text>
      <Text style={S.errTitle}>{failure.title}</Text>
      {failure.hint ? <Text style={S.errHint}>{failure.hint}</Text> : null}

      <View style={S.errBox}>
        <Text style={S.errMessage} selectable>
          {failure.message}
        </Text>
        {failure.details.map((line) => (
          <Text key={line} style={S.errDetail} selectable>
            {line}
          </Text>
        ))}
      </View>

      <View style={S.errActions}>
        {onRetry ? (
          <TouchableOpacity style={S.btn} onPress={onRetry}>
            <Text style={S.btnText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
        {failure.suggestMode && onSwitchMode ? (
          <TouchableOpacity style={S.btn} onPress={() => onSwitchMode(failure.suggestMode!)}>
            <Text style={S.btnText}>Use {modeLabel(failure.suggestMode)}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {failure.canSkipIntegrity && onSkipIntegrity ? (
        <TouchableOpacity style={[S.btn, S.btnWarn]} onPress={onSkipIntegrity}>
          <Text style={[S.btnText, S.btnTextWarn]}>Run unverified (skip integrity check)</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const KIND_LABEL: Record<LoadFailure['kind'], string> = {
  'integrity': 'INTEGRITY ERROR',
  'update-required': 'REGISTRY ERROR · UPDATE REQUIRED',
  'invalid-registry': 'REGISTRY ERROR',
  'not-published': 'NOT FOUND (404)',
  'network': 'NETWORK ERROR',
  'local-missing': 'LOCAL DIST',
  'other': 'LOAD ERROR',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  toggleWrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: PAD,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontSize: 12, fontWeight: '700', color: colors.dim, letterSpacing: 0.4 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: R.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  segmentBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: R.full },
  segmentBtnOn: { backgroundColor: colors.accent },
  segmentBtnLocal: { backgroundColor: colors.warn },
  segmentText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  segmentTextOn: { color: '#fff' },
  toggleHint: { fontSize: 11, color: colors.dim },

  badge: {
    backgroundColor: colors.accentFaded,
    borderRadius: R.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  badgeLocal: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: colors.warn },
  badgeText: { fontSize: 9, fontWeight: '800', color: colors.accentLight, letterSpacing: 0.8 },
  badgeTextLocal: { color: colors.warn },

  report: {
    marginHorizontal: PAD,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.md,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.45)',
    gap: 2,
  },
  reportWarn: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: colors.warn },
  reportTitle: { fontSize: 12, fontWeight: '700', color: colors.success },
  reportTitleWarn: { color: colors.warn },
  reportSource: { fontSize: 10, color: colors.dim, fontFamily: MONO },

  errRoot: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: PAD },
  errEmoji: { fontSize: 36 },
  errKind: { fontSize: 10, fontWeight: '800', color: colors.error, letterSpacing: 1 },
  errTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  errHint: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19, maxWidth: 340 },
  errBox: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 4,
  },
  errMessage: { fontSize: 12, color: colors.error },
  errDetail: { fontSize: 10, color: colors.textSub, fontFamily: MONO },
  errActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: {
    backgroundColor: colors.accentFaded,
    borderRadius: R.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  btnText: { fontSize: 14, fontWeight: '600', color: colors.accentLight },
  btnWarn: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: colors.warn },
  btnTextWarn: { color: colors.warn },
});
