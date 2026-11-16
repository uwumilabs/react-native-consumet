/**
 * MangaScreen — manga browser that checks every provider against the shared result shape.
 *
 * Flow:
 *   Header chip (provider name) → ProviderSheet → switch provider
 *   Search bar  → 3-col cover grid, "Load page N" while hasNextPage
 *   Tap card    → info sheet (details + chapter list, oldest or newest first)
 *   Tap chapter → full-screen reader (pages sized to their own aspect ratio, prev / next chapter)
 *
 * Each view has a contract strip: test/contracts/manga.ts, the checks the provider tests run, checks
 * every response against the shape in docs/guides/manga.md and the strip lists what breaks it, with
 * how long each call took. The screen
 * reads only that shape, with no per-provider cases, so a provider that breaks it shows up broken.
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { IMangaChapter, IMangaChapterPage, IMangaInfo, IMangaResult } from 'react-native-consumet';
import { colors, PAD, GAP, R } from '../theme';
import { errorText } from '../media';
import { MANGA_PROVIDERS, useProviderChoice } from '../providers';
import { CloseButton, SheetBar } from '../components/DetailSheet';
import { posterWidth } from '../components/PosterCard';
import { ProviderSheet } from '../components/ProviderSheet';
import { HeaderChip, ScreenHeader } from '../components/ScreenHeader';
import { SearchBox } from '../components/SearchBox';
import { ErrorView, IdleView, LoadingView, MessageView, RetryButton } from '../components/StateViews';
import { useLatestCall } from '../hooks/useLatestCall';
import { useSearchBox } from '../hooks/useSearch';
import { infoProblems, pageProblems, searchProblems } from '../../../test/contracts/manga';

const COLS = 3;
const CARD_W = posterWidth(COLS);
const CARD_H = CARD_W * 1.5;
/** Width / height of a page until its real size is known: a typical manga page. */
const DEFAULT_PAGE_RATIO = 0.7;

/** A value as it reads on screen: strings as they are, anything else as JSON. */
const show = (value: unknown): string => (typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value)));

/** Display text: strings as they are, anything else as JSON, so a field that breaks the shape shows. */
const asText = (value: unknown): string => (value === undefined || value === null ? '' : show(value));

/** A list field as text: an array's entries, or the raw value when it isn't an array. */
const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(asText) : value === undefined || value === null ? [] : [asText(value)];

/** What a call threw: an Error's message, anything else as JSON. */
const errorMessage = (e: unknown) => errorText(e, (!(e instanceof Error) && show(e)) || 'Unknown error');

/** An Image source from a provider's URL and headers, or null when there is no URL to load. */
const imageSource = (uri: unknown, headers: unknown) =>
  typeof uri === 'string' && uri.length > 0
    ? {
        uri,
        headers: headers !== null && typeof headers === 'object' ? (headers as Record<string, string>) : undefined,
      }
    : null;

/** "Vol 2 · Ch 10.5" from whichever numbers the chapter has. */
const chapterNumbers = (c: IMangaChapter | undefined) =>
  [
    c?.volumeNumber !== undefined ? `Vol ${asText(c.volumeNumber)}` : '',
    c?.chapterNumber !== undefined ? `Ch ${asText(c.chapterNumber)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

/** An ISO 8601 date-time trimmed to its date; other text as the site gave it. */
const shortDate = (value: unknown) => {
  const text = asText(value);
  return /^\d{4}-\d{2}-\d{2}T/.test(text) ? text.slice(0, 10) : text;
};

/** "Group · en · 2024-05-01" from whichever of scanlator, language and releaseDate the chapter has. */
const chapterMeta = (c: IMangaChapter | undefined) =>
  [asText(c?.scanlator), asText(c?.language), shortDate(c?.releaseDate)].filter(Boolean).join(' · ');

const chapterLabel = (c: IMangaChapter | undefined) => asText(c?.title) || '(untitled chapter)';

/** One provider call: what was asked, how long it took, and whether it threw. */
type CallLog = { label: string; ms: number; failed?: boolean };

/** The calls behind a view, and what the contract checks found in their responses. */
type Check = { calls: CallLog[]; problems: string[] };
const NO_CHECK: Check = { calls: [], problems: [] };

type Timed<T> = { ok: true; value: T; log: CallLog } | { ok: false; error: string; log: CallLog };

/** Runs a provider call and logs how long it took. */
async function timed<T>(label: string, call: () => Promise<T>): Promise<Timed<T>> {
  const start = Date.now();
  try {
    const value = await call();
    const ms = Date.now() - start;
    console.log(`[Manga] ${label} · ${ms} ms`);
    return { ok: true, value, log: { label, ms } };
  } catch (e) {
    const ms = Date.now() - start;
    const error = errorMessage(e);
    console.log(`[Manga] ${label} threw after ${ms} ms: ${error}`);
    return { ok: false, error, log: { label, ms, failed: true } };
  }
}

/** Logs the problems the contract checks found in a call's response, and returns them. */
const logged = (log: CallLog, problems: string[]) => {
  if (problems.length) console.log(`[Manga] ${log.label}: ${problems.length} contract problems`, problems);
  return problems;
};

/** A view's check with one more call and the problems found in its response. */
const withCall = (check: Check, log: CallLog, problems: string[]): Check => ({
  calls: [...check.calls, log],
  problems: [...check.problems, ...problems],
});

/** The contract strip: a one-line verdict and time; tap it for each call and every problem found. */
function ContractPanel({ check, pending, idleHint }: { check: Check; pending: boolean; idleHint: string }) {
  const [open, setOpen] = useState(false);
  const { calls, problems } = check;
  const ran = calls.length > 0;
  const done = ran && !pending;
  const last = calls[calls.length - 1];
  const bad = problems.length > 0;
  const summary = pending
    ? 'checking…'
    : !ran
      ? idleHint
      : bad
        ? `✗ ${problems.length} problem${problems.length === 1 ? '' : 's'}`
        : '✓ follows contract';

  return (
    <View style={[S.contract, done && (bad ? S.contractBad : S.contractOk)]}>
      <TouchableOpacity style={S.contractRow} onPress={() => setOpen((o) => !o)} disabled={!done} activeOpacity={0.7}>
        <Text style={S.contractTag}>CONTRACT</Text>
        <Text style={[S.contractSummary, done && (bad ? S.textBad : S.textOk)]} numberOfLines={1}>
          {summary}
        </Text>
        {done && last ? <Text style={S.contractMs}>{last.ms} ms</Text> : null}
        {done ? <Text style={S.contractCaret}>{open ? '▾' : '▸'}</Text> : null}
      </TouchableOpacity>
      {open && done ? (
        <ScrollView style={S.contractBody} nestedScrollEnabled>
          {calls.map((c, i) => (
            <Text key={`call${i}`} style={[S.contractLine, S.contractCall]} selectable>
              {c.label} · {c.ms} ms{c.failed ? ' · threw' : ''}
            </Text>
          ))}
          {bad ? (
            problems.map((p, i) => (
              <Text key={i} style={S.contractLine} selectable>
                • {p}
              </Text>
            ))
          ) : (
            <Text style={[S.contractLine, S.textOk]}>✓ follows contract</Text>
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

const CoverCard = memo(function CoverCardView({
  item,
  onOpen,
}: {
  item: IMangaResult;
  onOpen: (item: IMangaResult) => void;
}) {
  // A cover can fail once and load on the next request (MangaDex makes its thumbnails on demand),
  // so the image is mounted again once before the card shows the failure.
  const [errors, setErrors] = useState(0);
  const failed = errors > 1;
  const source = imageSource(item.image, item.headerForImage);
  return (
    <TouchableOpacity onPress={() => onOpen(item)} style={S.card} activeOpacity={0.75}>
      {source && !failed ? (
        <Image
          key={errors}
          source={source}
          style={S.cardImg}
          resizeMode="cover"
          onError={() => setErrors((n) => n + 1)}
        />
      ) : (
        <View style={[S.cardImg, S.cardPlaceholder]}>
          <Text style={S.cardPlaceholderText}>{source ? 'cover failed' : 'no cover'}</Text>
        </View>
      )}
      <View style={S.cardOverlay}>
        <Text style={S.cardTitle} numberOfLines={2}>
          {asText(item.title) || '(no title)'}
        </Text>
      </View>
      {item.status !== undefined ? (
        <View style={S.cardBadge}>
          <Text style={S.cardBadgeText}>{asText(item.status)}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

const ChapterRow = memo(function ChapterRowView({
  chapter,
  index,
  active,
  onOpen,
}: {
  chapter: IMangaChapter;
  index: number;
  active: boolean;
  onOpen: (index: number) => void;
}) {
  const numbers = chapterNumbers(chapter);
  const meta = chapterMeta(chapter);
  return (
    <TouchableOpacity style={[S.chRow, active && S.chRowActive]} onPress={() => onOpen(index)} activeOpacity={0.7}>
      <View style={S.chText}>
        <Text style={[S.chTitle, active && S.chTitleActive]} numberOfLines={2}>
          {chapterLabel(chapter)}
        </Text>
        {meta ? (
          <Text style={S.chMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {numbers ? <Text style={S.chNumbers}>{numbers}</Text> : null}
    </TouchableOpacity>
  );
});

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={S.section} onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
      <Text style={S.sectionTitle}>Description</Text>
      <Text style={S.synopsis} numberOfLines={expanded ? undefined : 6}>
        {text}
      </Text>
      <Text style={S.moreText}>{expanded ? 'Less' : 'More'}</Text>
    </TouchableOpacity>
  );
}

type InfoProps = {
  item: IMangaResult | null;
  info: IMangaInfo | null;
  chapters: IMangaChapter[];
  loading: boolean;
  error: string | null;
  check: Check;
  readingIndex: number | null;
  /** Newest first reverses the provider's order (reading order) for display only. */
  newestFirst: boolean;
  onChangeOrder: (newestFirst: boolean) => void;
  onClose: () => void;
  onRetry: () => void;
  onOpenChapter: (index: number) => void;
};

function InfoModal({
  item,
  info,
  chapters,
  loading,
  error,
  check,
  readingIndex,
  newestFirst,
  onChangeOrder,
  onClose,
  onRetry,
  onOpenChapter,
}: InfoProps) {
  // Rows keep the chapter's index in the provider's order, which the reader's prev / next follow.
  const rows = useMemo(() => {
    const list = chapters.map((chapter, index) => ({ chapter, index }));
    return newestFirst ? list.reverse() : list;
  }, [chapters, newestFirst]);
  const cover = imageSource(info?.image, info?.headerForImage);
  const altTitles = asList(info?.altTitles);
  const genres = asList(info?.genres);
  const authors = asList(info?.authors);
  const artists = asList(info?.artists);
  const description = asText(info?.description);

  const header = info ? (
    <View>
      <View style={S.infoRow}>
        {cover ? (
          <Image source={cover} style={S.infoCover} resizeMode="cover" />
        ) : (
          <View style={[S.infoCover, S.cardPlaceholder]} />
        )}
        <View style={S.infoMeta}>
          <Text style={S.infoTitle}>{asText(info.title) || '(no title)'}</Text>
          {altTitles.length ? (
            <Text style={S.infoAlt} numberOfLines={4}>
              {altTitles.join(' · ')}
            </Text>
          ) : null}
          <View style={S.badgeRow}>
            {info.status !== undefined ? (
              <View style={S.typeBadge}>
                <Text style={S.typeBadgeText}>{asText(info.status)}</Text>
              </View>
            ) : null}
            {info.releaseDate !== undefined ? <Text style={S.infoSub}>{asText(info.releaseDate)}</Text> : null}
          </View>
          {authors.length ? <Text style={S.infoSub}>Story · {authors.join(', ')}</Text> : null}
          {artists.length ? <Text style={S.infoSub}>Art · {artists.join(', ')}</Text> : null}
        </View>
      </View>

      {genres.length ? (
        <View style={S.genreWrap}>
          {genres.map((g, i) => (
            <View key={i} style={S.genreChip}>
              <Text style={S.genreText}>{g}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {description ? <Description key={asText(info.id)} text={description} /> : null}

      <View style={S.chHeader}>
        <Text style={S.sectionTitle}>Chapters · {chapters.length}</Text>
        <View style={S.toggleRow}>
          <TouchableOpacity style={[S.toggleBtn, !newestFirst && S.toggleBtnOn]} onPress={() => onChangeOrder(false)}>
            <Text style={[S.toggleText, !newestFirst && S.toggleTextOn]}>Oldest first</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.toggleBtn, newestFirst && S.toggleBtnOn]} onPress={() => onChangeOrder(true)}>
            <Text style={[S.toggleText, newestFirst && S.toggleTextOn]}>Newest first</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : undefined;

  return (
    <Modal visible={item !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={S.modalRoot}>
        <StatusBar barStyle="light-content" />

        <SheetBar title={asText(info?.title ?? item?.title)} onClose={onClose} />

        <View style={S.contractWrap}>
          <ContractPanel check={check} pending={loading} idleHint="" />
        </View>

        {loading ? (
          <LoadingView text="Loading info…" />
        ) : error ? (
          <ErrorView message={error} onRetry={onRetry} />
        ) : !info ? (
          <MessageView text="fetchMangaInfo returned nothing" />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => String(row.index)}
            renderItem={({ item: row }) => (
              <ChapterRow
                chapter={row.chapter}
                index={row.index}
                active={row.index === readingIndex}
                onOpen={onOpenChapter}
              />
            )}
            extraData={readingIndex}
            ListHeaderComponent={header}
            ListEmptyComponent={<Text style={S.emptyChapters}>No chapters</Text>}
            ListFooterComponent={<View style={S.listEnd} />}
            initialNumToRender={20}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

/** Known page shapes (width / height) by image URL, so a page keeps its height when the list re-mounts it. */
const pageRatios = new Map<string, number>();

const ReaderPage = memo(function ReaderPageView({
  page,
  index,
  total,
  pageWidth,
  onFailed,
}: {
  page: IMangaChapterPage;
  index: number;
  total: number;
  pageWidth: number;
  onFailed: (index: number, failed: boolean) => void;
}) {
  const uri = typeof page?.img === 'string' ? page.img : '';
  const headers = page?.headerForImage;
  const loadable = /^https?:\/\//.test(uri);
  const [ratio, setRatio] = useState<number | undefined>(() => pageRatios.get(uri));
  const [error, setError] = useState<string | null>(loadable ? null : 'img is not an absolute URL');
  const [attempt, setAttempt] = useState(0);

  const learnRatio = useCallback(
    (w: number, h: number) => {
      if (!(w > 0 && h > 0)) return;
      pageRatios.set(uri, w / h);
      setRatio(w / h);
    },
    [uri]
  );

  useEffect(() => {
    if (!loadable || pageRatios.has(uri)) return;
    let live = true;
    Image.getSizeWithHeaders(uri, (headers ?? {}) as Record<string, string>)
      .then((size) => {
        if (live) learnRatio(size.width, size.height);
      })
      // The Image reports a failure itself; until it loads the page keeps the default ratio.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [uri, headers, loadable, learnRatio]);

  useEffect(() => onFailed(index, error !== null), [index, error, onFailed]);

  const numbering = page?.page === index + 1 ? '' : ` (provider numbered it ${asText(page?.page) || 'nothing'})`;

  if (error) {
    return (
      <TouchableOpacity
        style={S.pageError}
        disabled={!loadable}
        activeOpacity={0.7}
        onPress={() => {
          setError(null);
          setAttempt((a) => a + 1);
        }}>
        <Text style={S.pageErrorTitle}>
          ⚠️ Page {index + 1} of {total} failed to load{numbering}
        </Text>
        <Text style={S.pageErrorUrl} selectable>
          {uri || show(page?.img)}
        </Text>
        <Text style={S.pageErrorMsg}>{error}</Text>
        {loadable ? <Text style={S.pageErrorRetry}>Tap to retry</Text> : null}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[S.page, { height: pageWidth / (ratio ?? DEFAULT_PAGE_RATIO) }]}>
      <Text style={S.pageNumber}>{index + 1}</Text>
      <Image
        key={attempt}
        source={{ uri, headers: headers as Record<string, string> | undefined }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        onLoad={(e) => learnRatio(e.nativeEvent.source.width, e.nativeEvent.source.height)}
        onError={(e) => setError(asText(e.nativeEvent.error) || 'Image failed to load')}
      />
    </View>
  );
});

type ReaderProps = {
  chapter: IMangaChapter | undefined;
  open: boolean;
  pages: IMangaChapterPage[];
  loading: boolean;
  error: string | null;
  check: Check;
  failedCount: number;
  onPageFailed: (index: number, failed: boolean) => void;
  /** The chapters before and after this one in the provider's order, when there are any. */
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  onRetry: () => void;
};

function ChapterNav({ onPrev, onNext }: { onPrev?: () => void; onNext?: () => void }) {
  return (
    <View style={S.navRow}>
      <TouchableOpacity style={[S.navBtn, !onPrev && S.navBtnOff]} onPress={onPrev} disabled={!onPrev}>
        <Text style={[S.navText, !onPrev && S.navTextOff]}>‹ Prev chapter</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[S.navBtn, !onNext && S.navBtnOff]} onPress={onNext} disabled={!onNext}>
        <Text style={[S.navText, !onNext && S.navTextOff]}>Next chapter ›</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReaderModal({
  chapter,
  open,
  pages,
  loading,
  error,
  check,
  failedCount,
  onPageFailed,
  onPrev,
  onNext,
  onClose,
  onRetry,
}: ReaderProps) {
  const { width: pageWidth } = useWindowDimensions();
  const count = loading
    ? 'loading…'
    : `${pages.length} page${pages.length === 1 ? '' : 's'}${failedCount ? ` · ${failedCount} failed` : ''}`;
  const sub = [chapterNumbers(chapter), count].filter(Boolean).join(' · ');

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={S.readerRoot}>
        <StatusBar barStyle="light-content" />

        <View style={S.readerBar}>
          <CloseButton glyph="←" onPress={onClose} />
          <View style={S.readerTitleWrap}>
            <Text style={S.readerTitle} numberOfLines={1}>
              {chapterLabel(chapter)}
            </Text>
            <Text style={[S.readerSub, failedCount > 0 && S.textBad]} numberOfLines={1}>
              {sub}
            </Text>
          </View>
        </View>

        <ChapterNav onPrev={onPrev} onNext={onNext} />

        <View style={S.contractWrap}>
          <ContractPanel check={check} pending={loading} idleHint="" />
        </View>

        {loading ? (
          <LoadingView text="Loading pages…" />
        ) : error ? (
          <ErrorView message={error} onRetry={onRetry} />
        ) : pages.length === 0 ? (
          <MessageView text="No pages" />
        ) : (
          <FlatList
            key={asText(chapter?.id)}
            data={pages}
            keyExtractor={(p, i) => `${i}-${asText(p?.img)}`}
            renderItem={({ item, index }) => (
              <ReaderPage
                page={item}
                index={index}
                total={pages.length}
                pageWidth={pageWidth}
                onFailed={onPageFailed}
              />
            )}
            initialNumToRender={2}
            maxToRenderPerBatch={3}
            windowSize={7}
            ItemSeparatorComponent={PageGap}
            ListFooterComponent={<ChapterNav onPrev={onPrev} onNext={onNext} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const PageGap = () => <View style={S.pageGap} />;

export default function MangaScreen() {
  const { def: providerDef, provider, select: selectProvider } = useProviderChoice(MANGA_PROVIDERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [searchedQuery, setSearchedQuery] = useState('');
  const [results, setResults] = useState<IMangaResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [moreErr, setMoreErr] = useState<string | null>(null);
  const [searchCheck, setSearchCheck] = useState<Check>(NO_CHECK);

  const [selected, setSelected] = useState<IMangaResult | null>(null);
  const [info, setInfo] = useState<IMangaInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [infoErr, setInfoErr] = useState<string | null>(null);
  const [infoCheck, setInfoCheck] = useState<Check>(NO_CHECK);
  const [newestFirst, setNewestFirst] = useState(false);

  const [readingIndex, setReadingIndex] = useState<number | null>(null);
  const [pages, setPages] = useState<IMangaChapterPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [pagesErr, setPagesErr] = useState<string | null>(null);
  const [pagesCheck, setPagesCheck] = useState<Check>(NO_CHECK);
  const [failedPages, setFailedPages] = useState<ReadonlySet<number>>(() => new Set());

  const searchCalls = useLatestCall();
  const infoCalls = useLatestCall();
  const pagesCalls = useLatestCall();

  const chapters = useMemo<IMangaChapter[]>(() => (info && Array.isArray(info.chapters) ? info.chapters : []), [info]);

  const clearSearch = useCallback(() => {
    searchCalls.cancel();
    setSearchedQuery('');
    setResults([]);
    setPage(1);
    setHasNextPage(false);
    setSearching(false);
    setLoadingMore(false);
    setSearchErr(null);
    setMoreErr(null);
    setSearchCheck(NO_CHECK);
  }, [searchCalls]);

  /** Fetches a page of results: page 1 starts a new search, later pages add to it. */
  const runSearch = useCallback(
    async (q: string, pageNo: number = 1, earlier: IMangaResult[] = []) => {
      const isCurrent = searchCalls.start();
      const first = pageNo === 1;
      if (first) {
        setSearchedQuery(q);
        setResults([]);
        setPage(1);
        setHasNextPage(false);
        setSearchErr(null);
        setSearchCheck(NO_CHECK);
        setSearching(true);
      } else {
        setLoadingMore(true);
      }
      setMoreErr(null);

      const r = await timed(`search("${q}", ${pageNo})`, () => provider.search(q, pageNo));
      if (!isCurrent()) return;
      setSearching(false);
      setLoadingMore(false);
      // Later pages' problems say which page they came from.
      const where = (problem: string) => (first ? problem : `page ${pageNo}: ${problem}`);

      if (!r.ok) {
        const threw = logged(r.log, [where(`threw: ${r.error}`)]);
        setSearchCheck((c) => withCall(c, r.log, threw));
        if (first) setSearchErr(r.error);
        else setMoreErr(r.error);
        return;
      }
      const earlierIds = new Set(earlier.map((item) => item?.id));
      const problems = logged(r.log, searchProblems(r.value, pageNo, earlierIds).map(where));
      setSearchCheck((c) => withCall(c, r.log, problems));
      const list = Array.isArray(r.value?.results) ? r.value.results : [];
      setResults(first ? list : [...earlier, ...list]);
      setPage(pageNo);
      setHasNextPage(r.value?.hasNextPage === true);
    },
    [provider, searchCalls]
  );

  const loadMore = useCallback(() => {
    if (!loadingMore && hasNextPage) runSearch(searchedQuery, page + 1, results);
  }, [loadingMore, hasNextPage, runSearch, searchedQuery, page, results]);

  const { query, setQuery, submit, idle } = useSearchBox(runSearch, clearSearch);

  const openInfo = useCallback(
    async (item: IMangaResult) => {
      const isCurrent = infoCalls.start();
      setSelected(item);
      setInfo(null);
      setInfoErr(null);
      setInfoCheck(NO_CHECK);
      setLoadingInfo(true);
      const r = await timed(`fetchMangaInfo("${asText(item.id)}")`, () => provider.fetchMangaInfo(item.id));
      if (!isCurrent()) return;
      setLoadingInfo(false);
      if (!r.ok) {
        setInfoErr(r.error);
        setInfoCheck(withCall(NO_CHECK, r.log, logged(r.log, [`threw: ${r.error}`])));
        return;
      }
      setInfoCheck(withCall(NO_CHECK, r.log, logged(r.log, infoProblems(r.value))));
      setInfo(r.value !== null && typeof r.value === 'object' ? r.value : null);
    },
    [provider, infoCalls]
  );

  const openChapter = useCallback(
    async (index: number) => {
      const chapter = chapters[index];
      if (!chapter) return;
      const isCurrent = pagesCalls.start();
      setReadingIndex(index);
      setPages([]);
      setPagesErr(null);
      setPagesCheck(NO_CHECK);
      setFailedPages(new Set());
      setLoadingPages(true);
      const r = await timed(`fetchChapterPages("${asText(chapter.id)}")`, () => provider.fetchChapterPages(chapter.id));
      if (!isCurrent()) return;
      setLoadingPages(false);
      if (!r.ok) {
        setPagesErr(r.error);
        setPagesCheck(withCall(NO_CHECK, r.log, logged(r.log, [`threw: ${r.error}`])));
        return;
      }
      setPagesCheck(withCall(NO_CHECK, r.log, logged(r.log, pageProblems(r.value))));
      setPages(Array.isArray(r.value) ? r.value : []);
    },
    [provider, chapters, pagesCalls]
  );

  const onPageFailed = useCallback((index: number, failed: boolean) => {
    setFailedPages((prev) => {
      if (prev.has(index) === failed) return prev;
      const next = new Set(prev);
      if (failed) next.add(index);
      else next.delete(index);
      return next;
    });
  }, []);

  const closeReader = useCallback(() => {
    pagesCalls.cancel();
    setReadingIndex(null);
    setPages([]);
    setPagesErr(null);
    setPagesCheck(NO_CHECK);
    setLoadingPages(false);
  }, [pagesCalls]);

  const closeInfo = useCallback(() => {
    infoCalls.cancel();
    closeReader();
    setSelected(null);
    setInfo(null);
    setInfoErr(null);
    setInfoCheck(NO_CHECK);
    setLoadingInfo(false);
  }, [closeReader, infoCalls]);

  // Another provider starts from an empty screen.
  useEffect(() => {
    setQuery('');
    clearSearch();
    closeInfo();
  }, [provider, setQuery, clearSearch, closeInfo]);

  const isIdle = idle || (!searchedQuery && !searching);

  return (
    <SafeAreaView style={S.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      <ScreenHeader logo="◆" title="Manga">
        <HeaderChip emoji={providerDef.emoji} label={providerDef.label} onPress={() => setSheetOpen(true)} />
      </ScreenHeader>

      <View style={S.searchWrap}>
        <SearchBox
          value={query}
          onChangeText={setQuery}
          onSubmit={submit}
          placeholder={`Search on ${providerDef.label}…`}
        />
      </View>

      <View style={S.contractWrap}>
        <ContractPanel
          check={searchCheck}
          pending={searching || loadingMore}
          idleHint="search to check this provider"
        />
      </View>

      {searching ? (
        <LoadingView text={`Searching ${providerDef.label}…`} />
      ) : isIdle ? (
        <IdleView
          emoji="📚"
          title="Find something to read"
          hint={`Search ${providerDef.label}, then check its contract strip`}
        />
      ) : searchErr ? (
        <ErrorView message={searchErr} onRetry={() => runSearch(searchedQuery)} retryLabel="Try again" />
      ) : results.length === 0 ? (
        <IdleView
          emoji="🔍"
          title={`No results for “${searchedQuery}”`}
          hint={`Try a title ${providerDef.label} has`}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${i}-${asText(item?.id)}`}
          numColumns={COLS}
          renderItem={({ item }) => <CoverCard item={item} onOpen={openInfo} />}
          ListFooterComponent={
            <View style={S.footer}>
              {loadingMore ? (
                <ActivityIndicator color={colors.accent} />
              ) : moreErr ? (
                <>
                  <Text style={S.footerError}>{moreErr}</Text>
                  <RetryButton label={`Retry page ${page + 1}`} onPress={loadMore} />
                </>
              ) : hasNextPage ? (
                <RetryButton label={`Load page ${page + 1}`} onPress={loadMore} />
              ) : (
                <Text style={S.footerText}>
                  End of results · {results.length} titles on {page} page{page === 1 ? '' : 's'}
                </Text>
              )}
            </View>
          }
          columnWrapperStyle={S.gridRow}
          contentContainerStyle={S.grid}
          showsVerticalScrollIndicator={false}
        />
      )}

      <InfoModal
        item={selected}
        info={info}
        chapters={chapters}
        loading={loadingInfo}
        error={infoErr}
        check={infoCheck}
        readingIndex={readingIndex}
        newestFirst={newestFirst}
        onChangeOrder={setNewestFirst}
        onClose={closeInfo}
        onRetry={() => selected && openInfo(selected)}
        onOpenChapter={openChapter}
      />

      <ReaderModal
        chapter={readingIndex === null ? undefined : chapters[readingIndex]}
        open={readingIndex !== null}
        pages={pages}
        loading={loadingPages}
        error={pagesErr}
        check={pagesCheck}
        failedCount={failedPages.size}
        onPageFailed={onPageFailed}
        onPrev={readingIndex !== null && readingIndex > 0 ? () => openChapter(readingIndex - 1) : undefined}
        onNext={
          readingIndex !== null && readingIndex < chapters.length - 1 ? () => openChapter(readingIndex + 1) : undefined
        }
        onClose={closeReader}
        onRetry={() => readingIndex !== null && openChapter(readingIndex)}
      />

      <ProviderSheet
        visible={sheetOpen}
        title="Manga Provider"
        providers={MANGA_PROVIDERS}
        selectedKey={providerDef.key}
        onSelect={selectProvider}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  searchWrap: { paddingHorizontal: PAD, paddingBottom: 10 },

  contractWrap: { paddingHorizontal: PAD, paddingVertical: 8 },
  contract: {
    backgroundColor: colors.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contractOk: { borderColor: colors.success, backgroundColor: 'rgba(16,185,129,0.08)' },
  contractBad: { borderColor: colors.error, backgroundColor: 'rgba(239,68,68,0.08)' },
  contractRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  contractTag: { fontSize: 10, fontWeight: '800', color: colors.dim, letterSpacing: 1 },
  contractSummary: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.muted },
  contractMs: { fontSize: 12, fontWeight: '600', color: colors.muted },
  contractCaret: { fontSize: 12, color: colors.muted },
  contractBody: { maxHeight: 220, paddingHorizontal: 12, paddingBottom: 10 },
  contractLine: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSub,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  contractCall: { color: colors.muted },
  textOk: { color: colors.success },
  textBad: { color: colors.error },

  grid: { paddingHorizontal: PAD, paddingBottom: 30, gap: GAP },
  gridRow: { gap: GAP },
  footer: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  footerText: { fontSize: 12, color: colors.dim },
  footerError: { fontSize: 14, color: colors.error, textAlign: 'center', maxWidth: 280 },

  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: R.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  cardImg: { ...StyleSheet.absoluteFill },
  cardPlaceholder: { backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  cardPlaceholderText: { fontSize: 10, color: colors.dim, fontWeight: '600' },
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

  modalRoot: { flex: 1, backgroundColor: colors.bg },
  infoRow: { flexDirection: 'row', padding: PAD, gap: 14 },
  infoCover: {
    width: 110,
    height: 160,
    borderRadius: R.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  infoMeta: { flex: 1, gap: 6 },
  infoTitle: { fontSize: 17, fontWeight: '700', color: colors.text, lineHeight: 22 },
  infoAlt: { fontSize: 12, color: colors.dim, lineHeight: 17 },
  infoSub: { fontSize: 13, color: colors.muted },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentFaded,
    borderRadius: R.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: colors.accentLight },

  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: PAD, gap: 6 },
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textSub, letterSpacing: 0.2 },
  synopsis: { fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 10 },
  moreText: { fontSize: 13, color: colors.accentLight, fontWeight: '600', marginTop: 6 },

  chHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    marginTop: 24,
    marginBottom: 8,
    gap: 10,
  },
  chRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chRowActive: { backgroundColor: colors.accentFaded },
  chText: { flex: 1, gap: 3 },
  chTitle: { fontSize: 14, fontWeight: '600', color: colors.textSub },
  chTitleActive: { color: colors.accentLight },
  chMeta: { fontSize: 12, color: colors.dim },
  chNumbers: { fontSize: 12, fontWeight: '700', color: colors.muted },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: R.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.full },
  toggleBtnOn: { backgroundColor: colors.accent },
  toggleText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  toggleTextOn: { color: '#fff' },
  emptyChapters: { fontSize: 14, color: colors.muted, paddingHorizontal: PAD, paddingVertical: 20 },
  listEnd: { height: 50 },

  readerRoot: { flex: 1, backgroundColor: '#000' },
  readerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    paddingVertical: 10,
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  readerTitleWrap: { flex: 1 },
  readerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  readerSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  navRow: { flexDirection: 'row', gap: 10, paddingHorizontal: PAD, paddingVertical: 10 },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: R.full,
    backgroundColor: colors.accentFaded,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  navBtnOff: { backgroundColor: colors.card, borderColor: colors.border },
  navText: { fontSize: 13, fontWeight: '700', color: colors.accentLight },
  navTextOff: { color: colors.dim },
  page: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  pageNumber: { fontSize: 28, fontWeight: '700', color: colors.border },
  pageGap: { height: 2 },
  pageError: {
    minHeight: 200,
    margin: PAD,
    padding: PAD,
    gap: 8,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: 'rgba(239,68,68,0.08)',
    justifyContent: 'center',
  },
  pageErrorTitle: { fontSize: 14, fontWeight: '700', color: colors.error },
  pageErrorUrl: {
    fontSize: 12,
    color: colors.textSub,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  pageErrorMsg: { fontSize: 12, color: colors.muted },
  pageErrorRetry: { fontSize: 13, fontWeight: '600', color: colors.accentLight, marginTop: 4 },
});
