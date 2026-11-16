import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, PAD, R } from '../theme';
import { ErrorView, LoadingView } from './StateViews';

/** What the sheet shows about a title. */
type DetailMedia = {
  title: string;
  image?: string;
  cover?: string;
  releaseDate?: string;
  type?: string;
  rating?: number | string;
  genres?: string[];
  description?: string;
  /** Under the type and rating, e.g. "12 Episodes" */
  note?: string;
};

type Props = {
  visible: boolean;
  title: string;
  media: DetailMedia | null;
  loading: boolean;
  loadingText: string;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  /** Covers the sheet while an episode's stream loads */
  fetchingStream: boolean;
  descriptionTitle: string;
  /** Between the genres and the description: sub/dub toggle, seasons, episodes */
  children?: ReactNode;
};

export function DetailSheet({
  visible,
  title,
  media,
  loading,
  loadingText,
  error,
  onRetry,
  onClose,
  fetchingStream,
  descriptionTitle,
  children,
}: Props) {
  const banner = media?.cover ?? media?.image;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={S.root}>
        <StatusBar barStyle="light-content" />
        <View style={S.bar}>
          <TouchableOpacity onPress={onClose} style={S.close}>
            <Text style={S.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={S.barTitle} numberOfLines={1}>
            {title || '…'}
          </Text>
          <View style={S.barSpacer} />
        </View>

        {loading ? (
          <LoadingView text={loadingText} />
        ) : error ? (
          <ErrorView message={error} onRetry={onRetry} />
        ) : media ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {banner ? (
              <Image source={{ uri: banner }} style={S.banner} resizeMode="cover" />
            ) : (
              <View style={S.banner} />
            )}

            <View style={S.infoRow}>
              {media.image ? (
                <Image source={{ uri: media.image }} style={S.poster} resizeMode="cover" />
              ) : (
                <View style={[S.poster, S.placeholder]} />
              )}
              <View style={S.infoMeta}>
                <Text style={S.infoTitle} numberOfLines={3}>
                  {media.title}
                </Text>
                {media.releaseDate ? <Text style={S.infoSub}>{media.releaseDate}</Text> : null}
                {media.type ? (
                  <View style={S.typeBadge}>
                    <Text style={S.typeBadgeText}>{media.type}</Text>
                  </View>
                ) : null}
                {media.rating ? <Text style={S.rating}>★ {String(media.rating).slice(0, 3)}</Text> : null}
                {media.note ? <Text style={S.note}>{media.note}</Text> : null}
              </View>
            </View>

            {media.genres?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.genreRow}>
                {media.genres.map((genre) => (
                  <View key={genre} style={S.genreChip}>
                    <Text style={S.genreText}>{genre}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {children}

            {media.description ? (
              <View style={S.section}>
                <Text style={S.sectionTitle}>{descriptionTitle}</Text>
                <Text style={S.description}>{media.description}</Text>
              </View>
            ) : null}
            <View style={S.end} />
          </ScrollView>
        ) : null}

        {fetchingStream ? (
          <View style={S.streamOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={S.mutedText}>Fetching stream…</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

type EpisodeLike = { id?: string; number?: number };

/** Episode buttons by number; an episode without an id (nothing to play) is disabled. */
export function EpisodeGrid<E extends EpisodeLike>({
  title,
  episodes,
  activeId,
  emptyText,
  onPlay,
}: {
  title: string;
  episodes: E[];
  activeId?: string;
  /** Shown when there are no episodes; without it the grid shows nothing */
  emptyText?: string;
  onPlay: (episode: E) => void;
}) {
  if (!episodes.length) return emptyText ? <Text style={S.empty}>{emptyText}</Text> : null;
  return (
    <View style={S.section}>
      <Text style={S.sectionTitle}>{title}</Text>
      <View style={S.epGrid}>
        {episodes.map((episode, index) => {
          const active = episode.id !== undefined && episode.id === activeId;
          return (
            <TouchableOpacity
              key={episode.id ?? `#${index}`}
              style={[S.epPill, active && S.epPillActive, !episode.id && S.epPillOff]}
              onPress={() => onPlay(episode)}
              disabled={!episode.id}
              activeOpacity={0.7}>
              <Text style={[S.epPillNum, active && S.epPillNumActive]}>{episode.number ?? '▶'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: R.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  barTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  barSpacer: { width: 36 },
  banner: { width: '100%', height: 190, backgroundColor: colors.card },
  infoRow: { flexDirection: 'row', padding: PAD, gap: 14, marginTop: -40 },
  poster: {
    width: 90,
    height: 130,
    borderRadius: R.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  placeholder: { backgroundColor: colors.cardAlt },
  infoMeta: { flex: 1, paddingTop: 44, gap: 5 },
  infoTitle: { fontSize: 17, fontWeight: '700', color: colors.text, lineHeight: 22 },
  infoSub: { fontSize: 13, color: colors.muted },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentFaded,
    borderRadius: R.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: 2,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: colors.accentLight },
  rating: { fontSize: 13, color: colors.warn, fontWeight: '600' },
  note: { fontSize: 13, color: colors.muted, marginTop: 4 },
  genreRow: { paddingHorizontal: PAD, paddingBottom: 4, gap: 6 },
  genreChip: {
    backgroundColor: colors.card,
    borderRadius: R.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genreText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  section: { paddingHorizontal: PAD, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textSub, marginBottom: 12, letterSpacing: 0.2 },
  description: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  end: { height: 50 },
  epGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  epPill: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  epPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  epPillOff: { opacity: 0.4 },
  epPillNum: { fontSize: 13, fontWeight: '600', color: colors.muted },
  epPillNumActive: { color: '#fff' },
  empty: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 30 },
  streamOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  mutedText: { fontSize: 14, color: colors.muted },
});
