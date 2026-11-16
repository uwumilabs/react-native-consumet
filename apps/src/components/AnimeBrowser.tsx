import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  META,
  SubOrDub,
  type IAnimeEpisode,
  type IAnimeInfo,
  type IAnimeProvider,
  type IAnimeResult,
} from 'react-native-consumet';
import { useDetail } from '../hooks/useDetail';
import { usePlayer } from '../hooks/usePlayer';
import { useSearch } from '../hooks/useSearch';
import { titleText } from '../media';
import { isDubSeparate } from '../providers';
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
  /** The tab's header: title and the tab's own controls */
  header: ReactNode;
  placeholder?: ReactNode;
};

/**
 * An anime's info and episodes. For META.Anilist, the info without episodes and, alongside it, the
 * episodes from fetchEpisodesListById (ani.zip titles and uniqueId), as apps do: its fetchAnimeInfo
 * would look the episodes up on the provider a second time.
 */
async function fetchInfoAndEpisodes(
  provider: IAnimeProvider,
  { id }: IAnimeResult
): Promise<[IAnimeInfo, IAnimeEpisode[]]> {
  if (provider instanceof META.Anilist) {
    return Promise.all([provider.fetchAnilistInfoById(id), provider.fetchEpisodesListById(id)]);
  }
  const info = await provider.fetchAnimeInfo(id);
  return [info, info.episodes ?? []];
}

const NO_DETAIL: [null, IAnimeEpisode[]] = [null, []];

/** Search, a detail sheet with the episodes, and the player, for one anime provider at a time. */
export function AnimeBrowser({ provider, label, header, placeholder }: Props) {
  const search = useSearch<IAnimeResult>(provider, 'Anime');
  const player = usePlayer('Anime');
  const sheet = useDetail(provider, fetchInfoAndEpisodes, 'Anime', 'Failed to load episodes');
  const [info, episodes] = sheet.detail ?? NO_DETAIL;
  const [subOrDub, setSubOrDub] = useState(SubOrDub.SUB);
  const [episode, setEpisode] = useState<IAnimeEpisode | null>(null);

  const { setQuery } = search;
  const { close: closeInfo } = sheet;
  const { close: closePlayer } = player;
  // Another provider (a switch, a reload, a META layer) starts from an empty screen.
  useEffect(() => {
    setQuery('');
    closeInfo();
    closePlayer();
    setEpisode(null);
    setSubOrDub(SubOrDub.SUB);
  }, [provider, setQuery, closeInfo, closePlayer]);

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
              onPress={() => sheet.open(item)}
            />
          )}
        />
      ) : (
        placeholder
      )}

      <DetailSheet
        visible={sheet.selected !== null}
        title={titleText(info?.title ?? sheet.selected?.title)}
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
        loading={sheet.loading}
        loadingText="Loading episodes…"
        error={sheet.error}
        onRetry={sheet.retry}
        onClose={closeInfo}
        fetchingStream={player.loading}
        descriptionTitle="Synopsis">
        {provider && isDubSeparate(provider) ? <SubDubToggle value={subOrDub} onChange={setSubOrDub} /> : null}
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
