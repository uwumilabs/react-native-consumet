/**
 * MoviesScreen — interactive movie/TV browser with live provider switching.
 *
 * Flow:
 *   Header chip (provider name) → ProviderSheet → switch provider (TMDB-wrapped)
 *   Search bar → 2-col poster grid
 *   Tap card   → detail sheet  (seasons + episode list)
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
import { type IMovieResult, type IMovieEpisode } from 'react-native-consumet';
import Video from 'react-native-video';
import { colors, PAD, GAP, R } from '../theme';
import { MOVIE_PROVIDERS, makeTmdb, type MovieProviderDef } from '../providers';
import { ProviderSheet } from '../components/ProviderSheet';

// ── Constants ─────────────────────────────────────────────────────────────────

const { width } = Dimensions.get('window');
const COLS = 2;
const CARD_W = (width - PAD * 2 - GAP) / COLS;
const CARD_H = CARD_W * 1.5;

// ── Helpers ───────────────────────────────────────────────────────────────────

const resolveTitle = (title: unknown): string => (typeof title === 'string' ? title : String(title ?? ''));

const parseQuality = (q?: string) => {
  const n = parseInt(q ?? '0');
  return isNaN(n) ? 0 : n;
};

// ── Types ─────────────────────────────────────────────────────────────────────

type VideoState = { url: string; headers?: Record<string, string>; isM3U8: boolean };

// ── Component ─────────────────────────────────────────────────────────────────

export default function MoviesScreen() {
  // Provider
  const [providerDef, setProviderDef] = useState<MovieProviderDef>(MOVIE_PROVIDERS[0]!);
  const providerRef = useRef<any>(makeTmdb(MOVIE_PROVIDERS[0]!));
  const [sheetOpen, setSheetOpen] = useState(false);

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IMovieResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  // Detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<IMovieResult | null>(null);
  const [mediaInfo, setMediaInfo] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState(0);

  // Player
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentEp, setCurrentEp] = useState<IMovieEpisode | null>(null);
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoErr, setVideoErr] = useState<string | null>(null);

  // ── Provider switch ─────────────────────────────────────────────────────────

  const switchProvider = useCallback(
    (key: string) => {
      const def = MOVIE_PROVIDERS.find((p) => p.key === key);
      if (!def || def.key === providerDef.key) return;
      providerRef.current = makeTmdb(def);
      setProviderDef(def);
      setQuery('');
      setResults([]);
      setSearchErr(null);
      setDetailOpen(false);
      setMediaInfo(null);
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
      setResults((res.results ?? []) as IMovieResult[]);
      if (!res.results?.length) setSearchErr(`No results for "${q}"`);
    } catch (e: any) {
      setSearchErr(e?.message ?? 'Search failed');
    } finally {
      setSearching(false);
    }
  }, []);

  // ── Detail ──────────────────────────────────────────────────────────────────

  const openDetail = useCallback(async (item: IMovieResult) => {
    setDetailItem(item);
    setMediaInfo(null);
    setDetailErr(null);
    setLoadingDetail(true);
    setDetailOpen(true);
    setActiveSeason(0);
    try {
      const info = await providerRef.current.fetchMediaInfo(item.id!, item.type as string);
      setMediaInfo(info);
    } catch (e: any) {
      setDetailErr(e?.message ?? 'Failed to load info');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ── Player ──────────────────────────────────────────────────────────────────

  const playEpisode = useCallback(
    async (ep: IMovieEpisode) => {
      if (!mediaInfo) return;
      setCurrentEp(ep);
      setVideoState(null);
      setVideoErr(null);
      setLoadingVideo(true);
      setPlayerOpen(true);
      try {
        const src = await providerRef.current.fetchEpisodeSources(ep.id!, mediaInfo.id);
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
    [mediaInfo]
  );

  const closePlayer = () => {
    setPlayerOpen(false);
    setVideoState(null);
    setVideoErr(null);
  };

  // Derive episode list for the active season
  const seasons: any[] = mediaInfo?.seasons ?? [];
  const seasonEps: IMovieEpisode[] =
    seasons.length > 0 ? (seasons[activeSeason]?.episodes ?? []) : (mediaInfo?.episodes ?? []);

  // ── Sub-components ──────────────────────────────────────────────────────────

  const PosterCard = ({ item }: { item: IMovieResult }) => (
    <TouchableOpacity onPress={() => openDetail(item)} style={S.card} activeOpacity={0.75}>
      {item.image ? (
        <Image source={{ uri: item.image as string }} style={S.cardImg} resizeMode="cover" />
      ) : (
        <View style={[S.cardImg, S.cardPlaceholder]} />
      )}
      <View style={S.cardOverlay}>
        <Text style={S.cardTitle} numberOfLines={2}>
          {resolveTitle(item.title)}
        </Text>
        {item.type || item.releaseDate ? (
          <Text style={S.cardMeta}>{[item.type, item.releaseDate].filter(Boolean).join('  ·  ')}</Text>
        ) : null}
      </View>
      {item.rating ? (
        <View style={S.ratingBadge}>
          <Text style={S.ratingBadgeText}>★ {String(item.rating).slice(0, 3)}</Text>
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

        <View style={S.modalBar}>
          <TouchableOpacity onPress={() => setDetailOpen(false)} style={S.modalClose}>
            <Text style={S.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <Text style={S.modalBarTitle} numberOfLines={1}>
            {detailItem ? resolveTitle(detailItem.title) : '…'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {loadingDetail ? (
          <View style={S.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={S.mutedText}>Loading…</Text>
          </View>
        ) : detailErr ? (
          <View style={S.center}>
            <Text style={S.errEmoji}>⚠️</Text>
            <Text style={S.errText}>{detailErr}</Text>
            <TouchableOpacity style={S.retryBtn} onPress={() => detailItem && openDetail(detailItem)}>
              <Text style={S.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Cover banner */}
            <Image
              source={{ uri: (detailItem?.cover ?? detailItem?.image) as string | undefined }}
              style={S.coverBanner}
              resizeMode="cover"
            />

            {/* Poster + meta */}
            <View style={S.infoRow}>
              {detailItem?.image ? (
                <Image source={{ uri: detailItem.image as string }} style={S.posterThumb} resizeMode="cover" />
              ) : (
                <View style={[S.posterThumb, S.cardPlaceholder]} />
              )}
              <View style={S.infoMeta}>
                <Text style={S.infoTitle} numberOfLines={3}>
                  {resolveTitle(detailItem?.title)}
                </Text>
                {detailItem?.releaseDate ? <Text style={S.infoSub}>{detailItem.releaseDate}</Text> : null}
                {detailItem?.type ? (
                  <View style={S.typeBadge}>
                    <Text style={S.typeBadgeText}>{detailItem.type}</Text>
                  </View>
                ) : null}
                {detailItem?.rating ? (
                  <Text style={S.ratingText}>★ {String(detailItem.rating).slice(0, 3)}</Text>
                ) : null}
              </View>
            </View>

            {/* Season tabs */}
            {seasons.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={S.seasonBar}
                contentContainerStyle={{ paddingHorizontal: PAD, gap: 8 }}>
                {seasons.map((s: any, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={[S.seasonTab, activeSeason === i && S.seasonTabActive]}
                    onPress={() => setActiveSeason(i)}>
                    <Text style={[S.seasonTabText, activeSeason === i && S.seasonTabTextActive]}>
                      {s.title ?? `Season ${i + 1}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            {/* Episodes */}
            {seasonEps.length > 0 ? (
              <View style={S.section}>
                <Text style={S.sectionTitle}>
                  {seasons.length > 1 ? 'Episodes' : seasonEps.length === 1 ? 'Play' : 'Episodes'}
                </Text>
                <View style={S.epGrid}>
                  {seasonEps.map((ep: IMovieEpisode) => (
                    <TouchableOpacity
                      key={ep.id}
                      style={[S.epPill, currentEp?.id === ep.id && S.epPillActive]}
                      onPress={() => playEpisode(ep)}
                      activeOpacity={0.7}>
                      <Text style={[S.epPillNum, currentEp?.id === ep.id && S.epPillNumActive]}>
                        {ep.number ?? '▶'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : !loadingDetail ? (
              <View style={[S.center, { minHeight: 80 }]}>
                <Text style={S.mutedText}>No episodes available</Text>
              </View>
            ) : null}

            {/* Overview */}
            {(detailItem as any)?.description ? (
              <View style={S.section}>
                <Text style={S.sectionTitle}>Overview</Text>
                <Text style={S.synopsis}>{(detailItem as any).description}</Text>
              </View>
            ) : null}

            <View style={{ height: 50 }} />
          </ScrollView>
        )}

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
              console.log('[Movies] video error:', JSON.stringify(e));
              setVideoErr(JSON.stringify((e as any)?.error ?? e));
            }}
            onLoad={(e) => console.log('[Movies] video loaded', e)}
          />
        ) : null}

        <TouchableOpacity style={S.playerBack} onPress={closePlayer}>
          <Text style={S.playerBackText}>←</Text>
        </TouchableOpacity>

        {currentEp && !loadingVideo && !videoErr ? (
          <View style={S.playerLabel}>
            <Text style={S.playerLabelText} numberOfLines={1}>
              {currentEp.title ?? `Episode ${currentEp.number}`}
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

      {/* Header */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          <Text style={S.headerTitle}>Movies & TV</Text>
        </View>
        <TouchableOpacity style={S.providerChip} onPress={() => setSheetOpen(true)} activeOpacity={0.75}>
          <Text style={S.providerEmoji}>{providerDef.emoji}</Text>
          <Text style={S.providerLabel}>{providerDef.label}</Text>
          <Text style={S.providerCaret}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
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

      {/* Body */}
      {searching ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={S.mutedText}>Searching {providerDef.label}…</Text>
        </View>
      ) : isIdle ? (
        <View style={S.center}>
          <Text style={S.idleEmoji}>🍿</Text>
          <Text style={S.idleTitle}>Find something to watch</Text>
          <Text style={S.idleHint}>Search a movie or TV show on {providerDef.label}</Text>
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
          keyExtractor={(item) => item.id ?? String(Math.random())}
          numColumns={COLS}
          renderItem={({ item }) => <PosterCard item={item} />}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={S.grid}
          showsVerticalScrollIndicator={false}
        />
      )}

      <DetailModal />
      <PlayerModal />

      <ProviderSheet
        visible={sheetOpen}
        title="Movie Provider"
        providers={MOVIE_PROVIDERS}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: 0.3 },
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
  grid: { paddingHorizontal: PAD, paddingBottom: 30, gap: GAP },
  card: { width: CARD_W, height: CARD_H, borderRadius: R.md, overflow: 'hidden', backgroundColor: colors.card },
  cardImg: { ...StyleSheet.absoluteFillObject },
  cardPlaceholder: { backgroundColor: colors.cardAlt },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 17 },
  cardMeta: { fontSize: 11, color: colors.muted, marginTop: 3 },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: R.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.warn,
  },
  ratingBadgeText: { fontSize: 10, fontWeight: '700', color: colors.warn },
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
  coverBanner: { width: '100%', height: 200, backgroundColor: colors.card },
  infoRow: { flexDirection: 'row', padding: PAD, gap: 14, marginTop: -45 },
  posterThumb: {
    width: 95,
    height: 138,
    borderRadius: R.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  infoMeta: { flex: 1, paddingTop: 50, gap: 5 },
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
  ratingText: { fontSize: 13, color: colors.warn, fontWeight: '600' },
  seasonBar: { marginTop: 8 },
  seasonTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonTabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  seasonTabText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  seasonTabTextActive: { color: '#fff' },
  section: { paddingHorizontal: PAD, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textSub, marginBottom: 12, letterSpacing: 0.2 },
  epGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  epPill: {
    width: 48,
    height: 48,
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
  synopsis: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  videoLoadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
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
