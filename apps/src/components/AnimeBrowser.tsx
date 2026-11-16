import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  META,
  SubOrDub,
  type IAnimeEpisode,
  type IAnimeInfo,
  type IAnimeProvider,
  type IAnimeResult,
} from 'react-native-consumet';
import { useLatestCall } from '../hooks/useLatestCall';
import { usePlayer } from '../hooks/usePlayer';
import { useSearch } from '../hooks/useSearch';
import { errorText, titleText } from '../media';
import { colors, PAD, R } from '../theme';
import { DetailSheet, EpisodeGrid } from './DetailSheet';
import { PlayerModal } from './PlayerModal';
import { PosterCard, posterWidth } from './PosterCard';
import { SearchResults } from './SearchResults';

const COLUMNS = 3;
const CARD_WIDTH = posterWidth(COLUMNS);

type Props = {
  /** null while the tab loads it; `placeholder` shows instead of the search until then */
  provider: IAnimeProvider | null;
  /** The provider's name in the search box and messages */
  label: string;
  /** Show the SUB / DUB toggle: the site lists sub and dub as separate entries */
  subDubSeparate: boolean;
  /** The tab's header: title and the tab's own controls */
  header: ReactNode;
  placeholder?: ReactNode;
};

/** Search, a detail sheet with the episodes, and the player, for one anime provider at a time. */
export function AnimeBrowser({ provider, label, subDubSeparate, header, placeholder }: Props) {
  const search = useSearch<IAnimeResult>(provider, 'Anime');
  const player = usePlayer('Anime');
  const infoCalls = useLatestCall();
  const [selected, setSelected] = useState<IAnimeResult | null>(null);
  const [info, setInfo] = useState<IAnimeInfo | null>(null);
  const [episodes, setEpisodes] = useState<IAnimeEpisode[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [subOrDub, setSubOrDub] = useState(SubOrDub.SUB);
  const [episode, setEpisode] = useState<IAnimeEpisode | null>(null);

  const closeInfo = useCallback(() => {
    infoCalls.cancel();
    setSelected(null);
  }, [infoCalls]);

  const { setQuery } = search;
  const { close: closePlayer } = player;
  // Another provider (a switch, a reload, a META layer) starts from an empty screen.
  useEffect(() => {
    setQuery('');
    closeInfo();
    closePlayer();
    setEpisode(null);
    setSubOrDub(SubOrDub.SUB);
  }, [provider, setQuery, closeInfo, closePlayer]);

  const openInfo = useCallback(
    async (item: IAnimeResult) => {
      if (!provider) return;
      const isCurrent = infoCalls.start();
      setSelected(item);
      setInfo(null);
      setEpisodes([]);
      setInfoError(null);
      setLoadingInfo(true);
      try {
        const found = await provider.fetchAnimeInfo(item.id);
        // META.Anilist lists episodes with fetchEpisodesListById (ani.zip titles and uniqueId), as apps do.
        const list =
          provider instanceof META.Anilist ? await provider.fetchEpisodesListById(item.id) : (found.episodes ?? []);
        if (!isCurrent()) return;
        console.log('[Anime] detail info', found);
        console.log('[Anime] episodes', list);
        setInfo(found);
        setEpisodes(list);
      } catch (e) {
        if (isCurrent()) setInfoError(errorText(e, 'Failed to load episodes'));
      } finally {
        if (isCurrent()) setLoadingInfo(false);
      }
    },
    [provider, infoCalls]
  );

  const play = (ep: IAnimeEpisode) => {
    if (!provider) return;
    setEpisode(ep);
    player.play({
      servers: () => provider.fetchEpisodeServers(ep.id, subOrDub),
      sources: (server) => provider.fetchEpisodeSources(ep.id, server, subOrDub),
    });
  };

  return (
    <View style={S.root}>
      {header}
      {provider ? (
        <SearchResults
          search={search}
          label={label}
          idleEmoji="🎌"
          idleHint={`Type a title to search ${label}`}
          columns={COLUMNS}
          keyOf={(item) => item.id}
          renderItem={(item) => (
            <PosterCard
              title={titleText(item.title)}
              image={item.image}
              width={CARD_WIDTH}
              badge={item.type}
              onPress={() => openInfo(item)}
            />
          )}
        />
      ) : (
        placeholder
      )}

      <DetailSheet
        visible={selected !== null}
        title={titleText(info?.title ?? selected?.title)}
        media={
          info && {
            title: titleText(info.title),
            image: info.image,
            cover: info.cover,
            releaseDate: info.releaseDate,
            type: info.type,
            rating: info.rating,
            genres: info.genres,
            description: info.description,
            note: episodes.length > 0 ? `${episodes.length} Episodes` : undefined,
          }
        }
        loading={loadingInfo}
        loadingText="Loading episodes…"
        error={infoError}
        onRetry={() => selected && openInfo(selected)}
        onClose={closeInfo}
        fetchingStream={player.loading}
        descriptionTitle="Synopsis">
        {subDubSeparate ? <SubDubToggle value={subOrDub} onChange={setSubOrDub} /> : null}
        <EpisodeGrid title="Episodes" episodes={episodes} activeId={episode?.id} onPlay={play} />
      </DetailSheet>

      <PlayerModal
        player={player}
        label={episode ? `Ep ${episode.number}${episode.title ? `  ·  ${episode.title}` : ''}` : undefined}
      />
    </View>
  );
}

function SubDubToggle({ value, onChange }: { value: SubOrDub; onChange: (value: SubOrDub) => void }) {
  const sub = value === SubOrDub.SUB;
  const dub = value === SubOrDub.DUB;
  return (
    <View style={S.toggleRow}>
      <TouchableOpacity style={[S.toggleBtn, sub && S.toggleBtnSub]} onPress={() => onChange(SubOrDub.SUB)}>
        <Text style={[S.toggleText, sub && S.toggleTextOn]}>SUB</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[S.toggleBtn, dub && S.toggleBtnDub]} onPress={() => onChange(SubOrDub.DUB)}>
        <Text style={[S.toggleText, dub && S.toggleTextOn]}>DUB</Text>
      </TouchableOpacity>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
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
});
