import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { IMovieEpisode, IMovieInfo, IMovieProvider, IMovieResult } from 'react-native-consumet';
import { useDetail } from '../hooks/useDetail';
import { usePlayer } from '../hooks/usePlayer';
import { useSearch } from '../hooks/useSearch';
import { titleText } from '../media';
import { colors, PAD, R } from '../theme';
import { DetailSheet, EpisodeGrid } from './DetailSheet';
import { PlayerModal } from './PlayerModal';
import { PosterCard, posterWidth } from './PosterCard';
import { SearchResults } from './SearchResults';

const COLUMNS = 2;
const CARD_WIDTH = posterWidth(COLUMNS);

type Props = {
  /** null while the tab loads it; `placeholder` shows instead of the search until then */
  provider: IMovieProvider | null;
  /** The provider's name in the search box and messages */
  label: string;
  /** The tab's header: title and the tab's own controls */
  header: ReactNode;
  placeholder?: ReactNode;
};

const fetchInfo = (provider: IMovieProvider, item: IMovieResult): Promise<IMovieInfo> =>
  provider.fetchMediaInfo(item.id, item.type);

/** Search, a detail sheet with the seasons and episodes, and the player, for one movie provider at a time. */
export function MovieBrowser({ provider, label, header, placeholder }: Props) {
  const search = useSearch<IMovieResult>(provider, 'Movies');
  const player = usePlayer('Movies');
  const sheet = useDetail(provider, fetchInfo, 'Movies', 'Failed to load info');
  const { selected, detail: info } = sheet;
  const [season, setSeason] = useState(0);
  const [episode, setEpisode] = useState<IMovieEpisode | null>(null);

  const { setQuery } = search;
  const { close: closeInfo } = sheet;
  const { close: closePlayer } = player;
  // Another provider (a switch, a reload, a META layer) starts from an empty screen.
  useEffect(() => {
    setQuery('');
    closeInfo();
    closePlayer();
    setEpisode(null);
  }, [provider, setQuery, closeInfo, closePlayer]);

  const openInfo = (item: IMovieResult) => {
    setSeason(0);
    sheet.open(item);
  };

  const play = (ep: IMovieEpisode) => {
    const episodeId = ep.id;
    if (!provider || !info || !episodeId) return;
    // META.TMDB keeps the TMDB id in `id`; the provider's own media id is `providerId`.
    const mediaId = info.providerId ?? info.id;
    setEpisode(ep);
    player.play({
      servers: () => provider.fetchEpisodeServers(episodeId, mediaId),
      sources: (server) => provider.fetchEpisodeSources(episodeId, mediaId, server),
    });
  };

  const seasons = info?.seasons ?? [];
  const episodes = seasons.length > 0 ? (seasons[season]?.episodes ?? []) : (info?.episodes ?? []);

  return (
    <View style={S.root}>
      {header}
      {provider ? (
        <SearchResults
          search={search}
          label={label}
          idleEmoji="🍿"
          idleHint={`Search a movie or TV show on ${label}`}
          columns={COLUMNS}
          keyOf={(item) => item.id}
          renderItem={(item) => (
            <PosterCard
              title={titleText(item.title)}
              image={item.image}
              width={CARD_WIDTH}
              badge={item.rating ? `★ ${String(item.rating).slice(0, 3)}` : undefined}
              badgeTone="rating"
              meta={[item.type, item.releaseDate].filter(Boolean).join('  ·  ')}
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
            title: titleText(info.title) || titleText(selected?.title),
            image: info.image ?? selected?.image,
            cover: info.cover,
            releaseDate: info.releaseDate ?? selected?.releaseDate,
            type: info.type ?? selected?.type,
            rating: info.rating,
            genres: info.genres,
            description: info.description,
          }
        }
        loading={sheet.loading}
        loadingText="Loading…"
        error={sheet.error}
        onRetry={sheet.retry}
        onClose={closeInfo}
        fetchingStream={player.loading}
        descriptionTitle="Overview">
        {seasons.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={S.seasonBar}
            contentContainerStyle={S.seasonRow}>
            {seasons.map((s, i) => (
              <TouchableOpacity
                key={s.season}
                style={[S.seasonTab, season === i && S.seasonTabActive]}
                onPress={() => setSeason(i)}>
                <Text style={[S.seasonTabText, season === i && S.seasonTabTextActive]}>Season {s.season}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
        <EpisodeGrid
          title={seasons.length <= 1 && episodes.length === 1 ? 'Play' : 'Episodes'}
          episodes={episodes}
          activeId={episode?.id}
          emptyText="No episodes available"
          onPlay={play}
        />
      </DetailSheet>

      <PlayerModal player={player} label={episode ? (episode.title ?? `Episode ${episode.number}`) : undefined} />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  seasonBar: { marginTop: 8 },
  seasonRow: { paddingHorizontal: PAD, gap: 8 },
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
});
