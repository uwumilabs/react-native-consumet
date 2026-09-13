/**
 * AnimeScreen — interactive anime browser with live provider switching.
 *
 * Flow:
 *   Header chip (provider name) → ProviderSheet → switch provider
 *   Search bar → 3-col poster grid
 *   Tap card   → detail sheet  (episodes + synopsis)
 *   Tap episode → full-screen video player
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { SubOrDub, type IAnimeResult, type IAnimeInfo, type IAnimeEpisode } from 'react-native-consumet';
import Video from 'react-native-video';
import { colors, PAD, GAP, R } from '../theme';
import { ANIME_PROVIDERS, type AnimeProviderDef } from '../providers';
import { ProviderSheet } from '../components/ProviderSheet';

// ── Constants ─────────────────────────────────────────────────────────────────

const { width } = Dimensions.get('window');
const COLS = 3;
const CARD_W = (width - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CARD_H = CARD_W * 1.5;

// ── Helpers ───────────────────────────────────────────────────────────────────

const resolveTitle = (title: unknown): string => {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object') {
    const t = title as Record<string, string | undefined>;
    return t.english ?? t.romaji ?? t.native ?? '';
  }
  return String(title ?? '');
};

const parseQuality = (q?: string) => {
  const n = parseInt(q ?? '0');
  return isNaN(n) ? 0 : n;
};

// ── Types ─────────────────────────────────────────────────────────────────────

type VideoState = {
  url: string;
  headers?: Record<string, string>;
  isM3U8: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnimeScreen() {
  // Provider
  const [providerDef, setProviderDef] = useState<AnimeProviderDef>(ANIME_PROVIDERS[0]!);
  const providerRef = useRef<ReturnType<AnimeProviderDef['make']>>(ANIME_PROVIDERS[0]!.make());
  const [sheetOpen, setSheetOpen] = useState(false);

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IAnimeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  // Detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailInfo, setDetailInfo] = useState<IAnimeInfo | null>(null);
  const [episodes, setEpisodes] = useState<IAnimeEpisode[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [subOrDub, setSubOrDub] = useState<SubOrDub>(SubOrDub.SUB);

  // Player
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentEp, setCurrentEp] = useState<IAnimeEpisode | null>(null);
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoErr, setVideoErr] = useState<string | null>(null);

  // ── Provider switch ─────────────────────────────────────────────────────────

  const switchProvider = useCallback(
    (key: string) => {
      const def = ANIME_PROVIDERS.find((p) => p.key === key);
      if (!def || def.key === providerDef.key) return;
      providerRef.current = def.make();
      setProviderDef(def);
      // Reset all state
      setQuery('');
      setResults([]);
      setSearchErr(null);
      setDetailOpen(false);
      setDetailInfo(null);
      setEpisodes([]);
      setPlayerOpen(false);
      setVideoState(null);
    },
    [providerDef.key]
  );

  // ── Search ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchErr(null);
      return;
    }
    const t = setTimeout(() => runSearch(q), 650);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    setSearchErr(null);
    try {
      const res = await providerRef.current.search(q);
      setResults((res as any).results ?? []);
      if (!(res as any).results?.length) setSearchErr(`No results for "${q}"`);
    } catch (e: any) {
      setSearchErr(e?.message ?? 'Search failed');
    } finally {
      setSearching(false);
    }
  }, []);

  // ── Detail ──────────────────────────────────────────────────────────────────

  const openDetail = useCallback(async (item: IAnimeResult) => {
    setDetailInfo(null);
    setEpisodes([]);
    setDetailErr(null);
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const info: IAnimeInfo = await (providerRef.current as any).fetchAnimeInfo(item.id);
      setDetailInfo(info);
      setEpisodes(info.episodes ?? []);
    } catch (e: any) {
      setDetailErr(e?.message ?? 'Failed to load episodes');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ── Player ──────────────────────────────────────────────────────────────────

  const playEpisode = useCallback(
    async (ep: IAnimeEpisode) => {
      setCurrentEp(ep);
      setVideoState(null);
      setVideoErr(null);
      setLoadingVideo(true);
      setPlayerOpen(true);
      try {
        const src: any = await (providerRef.current as any).fetchEpisodeSources(ep.id, undefined, subOrDub);
        if (!src.sources?.length) throw new Error('No video sources returned');
        const best = src.sources.reduce((a: any, b: any) =>
          parseQuality(b.quality) > parseQuality(a.quality) ? b : a
        );
        setVideoState({ url: best.url, headers: src.headers, isM3U8: best.isM3U8 ?? false });
      } catch (e: any) {
        setVideoErr(e?.message ?? 'Failed to load video');
      } finally {
        setLoadingVideo(false);
      }
    },
    [subOrDub]
  );

  const closePlayer = () => {
    setPlayerOpen(false);
    setVideoState(null);
    setVideoErr(null);
  };

  // ── Sub-components ──────────────────────────────────────────────────────────

  const PosterCard = ({ item }: { item: IAnimeResult }) => (
    <TouchableOpacity onPress={() => openDetail(item)} style={S.card} activeOpacity={0.75}>
      {item.image ? (
        <Image source={{ uri: item.image as string }} style={S.cardImg} resizeMode="cover" />
      ) : (
        <View style={[S.cardImg, S.cardImgPlaceholder]} />
      )}
      <View style={S.cardOverlay}>
        <Text style={S.cardTitle} numberOfLines={2}>
          {resolveTitle(item.title)}
        </Text>
      </View>
      {item.type ? (
        <View style={S.cardBadge}>
          <Text style={S.cardBadgeText}>{item.type}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const DetailModal = () => (
    <Modal
      visible={detailOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setDetailOpen(false)}>
      <SafeAreaView style={S.modalRoot}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

        {/* Bar */}
        <View style={S.modalBar}>
          <TouchableOpacity onPress={() => setDetailOpen(false)} style={S.modalClose}>
            <Text style={S.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <Text style={S.modalBarTitle} numberOfLines={1}>
            {detailInfo ? resolveTitle(detailInfo.title) : '…'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {loadingDetail ? (
          <View style={S.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={S.mutedText}>Loading episodes…</Text>
          </View>
        ) : detailErr ? (
          <View style={S.center}>
            <Text style={S.errEmoji}>⚠️</Text>
            <Text style={S.errText}>{detailErr}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Cover banner */}
            {(detailInfo?.cover ?? detailInfo?.image) ? (
              <Image
                source={{ uri: (detailInfo?.cover ?? detailInfo?.image) as string }}
                style={S.coverBanner}
                resizeMode="cover"
              />
            ) : (
              <View style={S.coverBanner} />
            )}

            {/* Poster + meta row */}
            <View style={S.infoRow}>
              {detailInfo?.image ? (
                <Image source={{ uri: detailInfo.image as string }} style={S.posterThumb} resizeMode="cover" />
              ) : (
                <View style={[S.posterThumb, S.cardImgPlaceholder]} />
              )}

              <View style={S.infoMeta}>
                <Text style={S.infoTitle} numberOfLines={3}>
                  {resolveTitle(detailInfo?.title)}
                </Text>
                {detailInfo?.releaseDate ? <Text style={S.infoSubText}>{detailInfo.releaseDate}</Text> : null}
                {detailInfo?.type ? (
                  <View style={S.typeBadge}>
                    <Text style={S.typeBadgeText}>{detailInfo.type}</Text>
                  </View>
                ) : null}
                {detailInfo?.rating ? (
                  <Text style={S.ratingText}>★ {String(detailInfo.rating).slice(0, 3)}</Text>
                ) : null}
                {episodes.length > 0 ? <Text style={S.epCountText}>{episodes.length} Episodes</Text> : null}
              </View>
            </View>

            {/* Genres */}
            {detailInfo?.genres?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.genreRow}>
                {detailInfo.genres.map((g) => (
                  <View key={g} style={S.genreChip}>
                    <Text style={S.genreText}>{g}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {/* Sub / Dub toggle (only if provider supports separate dub) */}
            {providerDef.isDubSeparate ? (
              <View style={S.toggleRow}>
                <TouchableOpacity
                  style={[S.toggleBtn, subOrDub === SubOrDub.SUB && S.toggleBtnSub]}
                  onPress={() => setSubOrDub(SubOrDub.SUB)}>
                  <Text style={[S.toggleText, subOrDub === SubOrDub.SUB && S.toggleTextOn]}>SUB</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.toggleBtn, subOrDub === SubOrDub.DUB && S.toggleBtnDub]}
                  onPress={() => setSubOrDub(SubOrDub.DUB)}>
                  <Text style={[S.toggleText, subOrDub === SubOrDub.DUB && S.toggleTextOn]}>DUB</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Episode grid */}
            {episodes.length > 0 ? (
              <View style={S.section}>
                <Text style={S.sectionTitle}>Episodes</Text>
                <View style={S.epGrid}>
                  {episodes.map((ep) => (
                    <TouchableOpacity
                      key={ep.id}
                      style={[S.epPill, currentEp?.id === ep.id && S.epPillActive]}
                      onPress={() => playEpisode(ep)}
                      activeOpacity={0.7}>
                      <Text style={[S.epPillNum, currentEp?.id === ep.id && S.epPillNumActive]}>{ep.number}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Synopsis */}
            {detailInfo?.description ? (
              <View style={S.section}>
                <Text style={S.sectionTitle}>Synopsis</Text>
                <Text style={S.synopsis}>{detailInfo.description}</Text>
              </View>
            ) : null}

            <View style={{ height: 50 }} />
          </ScrollView>
        )}

        {/* Loading overlay while fetching stream */}
        {loadingVideo ? (
          <View style={S.videoLoadOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={S.mutedText}>Fetching stream…</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );

  const PlayerModal = () => (
    <Modal visible={playerOpen} animationType="fade" onRequestClose={closePlayer} statusBarTranslucent>
      <View style={S.playerRoot}>
        <StatusBar hidden />
        {loadingVideo ? (
          <View style={S.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={S.mutedText}>Fetching stream…</Text>
          </View>
        ) : videoErr ? (
          <View style={S.center}>
            <Text style={S.errEmoji}>⚠️</Text>
            <Text style={S.errText}>{videoErr}</Text>
            <TouchableOpacity style={S.retryBtn} onPress={() => currentEp && playEpisode(currentEp)}>
              <Text style={S.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : videoState ? (
          <Video
            source={{
              uri: videoState.url,
              headers: videoState.headers,
              ...(videoState.isM3U8 ? { type: 'hls' } : {}),
            }}
            style={StyleSheet.absoluteFill}
            controls
            resizeMode="contain"
            onError={(e) => {
              console.log('[Anime] video error:', JSON.stringify(e));
              setVideoErr(JSON.stringify((e as any)?.error ?? e));
            }}
            onLoad={(e) => console.log('[Anime] video loaded', e)}
          />
        ) : null}

        <TouchableOpacity style={S.playerBack} onPress={closePlayer}>
          <Text style={S.playerBackText}>←</Text>
        </TouchableOpacity>

        {currentEp && !loadingVideo && !videoErr ? (
          <View style={S.playerLabel}>
            <Text style={S.playerLabelText} numberOfLines={1}>
              Ep {currentEp.number}
              {currentEp.title ? `  ·  ${currentEp.title}` : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );

  // ── Browse view ───────────────────────────────────────────────────────────────

  const isIdle = query.trim().length < 2;

  return (
    <SafeAreaView style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          <Text style={S.headerLogo}>◈</Text>
          <Text style={S.headerTitle}>Anime</Text>
        </View>
        {/* Provider chip */}
        <TouchableOpacity style={S.providerChip} onPress={() => setSheetOpen(true)} activeOpacity={0.75}>
          <Text style={S.providerEmoji}>{providerDef.emoji}</Text>
          <Text style={S.providerLabel}>{providerDef.label}</Text>
          <Text style={S.providerCaret}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <View style={S.searchWrap}>
        <View style={S.searchBar}>
          <Text style={S.searchIcon}>⊙</Text>
          <TextInput
            style={S.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={`Search on ${providerDef.label}…`}
            placeholderTextColor={colors.dim}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={() => {
              const q = query.trim();
              if (q.length >= 2) runSearch(q);
            }}
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setResults([]);
                setSearchErr(null);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={S.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      {searching ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={S.mutedText}>Searching {providerDef.label}…</Text>
        </View>
      ) : isIdle ? (
        <View style={S.center}>
          <Text style={S.idleEmoji}>🎌</Text>
          <Text style={S.idleTitle}>Find something to watch</Text>
          <Text style={S.idleHint}>Type a title to search {providerDef.label}</Text>
        </View>
      ) : searchErr ? (
        <View style={S.center}>
          <Text style={S.errEmoji}>⚠️</Text>
          <Text style={S.errText}>{searchErr}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={() => query.trim().length >= 2 && runSearch(query.trim())}>
            <Text style={S.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={COLS}
          renderItem={({ item }) => <PosterCard item={item} />}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={S.grid}
          showsVerticalScrollIndicator={false}
        />
      )}

      <DetailModal />
      <PlayerModal />

      {/* Provider picker sheet */}
      <ProviderSheet
        visible={sheetOpen}
        providers={ANIME_PROVIDERS}
        selectedKey={providerDef.key}
        onSelect={switchProvider}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { fontSize: 22, color: colors.accent },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: 0.3 },

  // Provider chip
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: R.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerEmoji: { fontSize: 14 },
  providerLabel: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  providerCaret: { fontSize: 11, color: colors.muted },

  // Search
  searchWrap: { paddingHorizontal: PAD, paddingBottom: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: R.full,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchIcon: { fontSize: 16, color: colors.muted },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  clearIcon: { fontSize: 13, color: colors.muted, padding: 4 },

  // Grid
  grid: { paddingHorizontal: PAD, paddingBottom: 30, gap: GAP },

  // Poster card
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: R.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  cardImg: { ...StyleSheet.absoluteFillObject },
  cardImgPlaceholder: { backgroundColor: colors.cardAlt },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  cardTitle: { fontSize: 11, fontWeight: '600', color: colors.text, lineHeight: 15 },
  cardBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.accentFaded,
    borderRadius: R.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  cardBadgeText: { fontSize: 9, fontWeight: '700', color: colors.accentLight, letterSpacing: 0.4 },

  // Detail modal
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: R.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  modalBarTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  coverBanner: { width: '100%', height: 190, backgroundColor: colors.card },
  infoRow: { flexDirection: 'row', padding: PAD, gap: 14, marginTop: -40 },
  posterThumb: {
    width: 90,
    height: 130,
    borderRadius: R.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  infoMeta: { flex: 1, paddingTop: 44, gap: 5 },
  infoTitle: { fontSize: 17, fontWeight: '700', color: colors.text, lineHeight: 22 },
  infoSubText: { fontSize: 13, color: colors.muted },
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
  ratingText: { fontSize: 13, color: colors.warn, fontWeight: '600' },
  epCountText: { fontSize: 13, color: colors.muted, marginTop: 4 },

  // Genres
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

  // Sub/Dub toggle
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: PAD,
    marginVertical: 12,
    backgroundColor: colors.card,
    borderRadius: R.full,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    gap: 4,
  },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 7, borderRadius: R.full },
  toggleBtnSub: { backgroundColor: colors.sub },
  toggleBtnDub: { backgroundColor: colors.dub },
  toggleText: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 0.6 },
  toggleTextOn: { color: '#fff' },

  // Section
  section: { paddingHorizontal: PAD, marginTop: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSub,
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  // Episode grid
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
  epPillNum: { fontSize: 13, fontWeight: '600', color: colors.muted },
  epPillNumActive: { color: '#fff' },

  // Synopsis
  synopsis: { fontSize: 14, color: colors.muted, lineHeight: 22 },

  // Video loading overlay
  videoLoadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },

  // Player
  playerRoot: { flex: 1, backgroundColor: '#000' },
  playerBack: {
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
  playerBackText: { fontSize: 20, color: '#fff', lineHeight: 22 },
  playerLabel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 24,
    left: 70,
    right: 70,
    alignItems: 'center',
    zIndex: 10,
  },
  playerLabelText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Shared
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: PAD },
  mutedText: { fontSize: 14, color: colors.muted },
  idleEmoji: { fontSize: 52, marginBottom: 4 },
  idleTitle: { fontSize: 18, fontWeight: '700', color: colors.textSub },
  idleHint: { fontSize: 14, color: colors.dim },
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
