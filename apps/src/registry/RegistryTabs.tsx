/**
 * The Registry tab's Anime and Movies sub-tabs: the same browsers as the Anime and Movies tabs, on
 * providers loaded from the extension registry in the mode the Load from toggle picks
 * (see load-provider.ts), optionally wrapped in META.Anilist or META.TMDB.
 */

import { useState } from 'react';
import {
  META,
  type ExtensionManifest,
  type IAnimeProvider,
  type IMovieProvider,
  type ProviderManager,
} from 'react-native-consumet';
import { AnimeBrowser } from '../components/AnimeBrowser';
import { MovieBrowser } from '../components/MovieBrowser';
import { ProviderSheet } from '../components/ProviderSheet';
import { HeaderChip, ScreenHeader } from '../components/ScreenHeader';
import { LoadingView } from '../components/StateViews';
import { LoadErrorView, LoadReportBar, ModeBadge } from './LoadStatus';
import { loadingMessage, type LoadMode } from './load-provider';
import { useRegistryProvider, type MetaLayer, type RegistryProvider } from './use-registry-provider';

const STATUS_EMOJI: Record<ExtensionManifest['status'], string> = {
  stable: '🟢',
  beta: '🟡',
  alpha: '🟠',
  deprecated: '🔴',
};

const ANIME_META: MetaLayer<IAnimeProvider>[] = [
  { key: 'anilist', label: 'AniList', wrap: (provider) => new META.Anilist(provider) },
];

// No TMDB API key: the library falls back to its shared key (and warns once).
const MOVIE_META: MetaLayer<IMovieProvider>[] = [
  { key: 'tmdb', label: 'TMDB', wrap: (provider) => new META.TMDB(undefined, provider) },
];

const NO_META = { key: 'none', label: 'None', emoji: '⬜' };

type TabProps = {
  /** Shared by both sub-tabs */
  manager: ProviderManager;
  mode: LoadMode;
  onModeChange: (mode: LoadMode) => void;
};

export function RegistryAnimeTab({ manager, mode, onModeChange }: TabProps) {
  const registry = useRegistryProvider(manager, 'anime', mode, ANIME_META);
  return (
    <AnimeBrowser
      provider={registry.provider}
      label={registry.entry?.name ?? '…'}
      header={<RegistryHeader logo="◈" title="Anime" mode={mode} registry={registry} layers={ANIME_META} />}
      placeholder={<RegistryLoadState registry={registry} mode={mode} onModeChange={onModeChange} />}
    />
  );
}

export function RegistryMoviesTab({ manager, mode, onModeChange }: TabProps) {
  const registry = useRegistryProvider(manager, 'movies', mode, MOVIE_META);
  return (
    <MovieBrowser
      provider={registry.provider}
      label={registry.entry?.name ?? '…'}
      header={<RegistryHeader title="Movies & TV" mode={mode} registry={registry} layers={MOVIE_META} />}
      placeholder={<RegistryLoadState registry={registry} mode={mode} onModeChange={onModeChange} />}
    />
  );
}

type HeaderProps = {
  title: string;
  logo?: string;
  mode: LoadMode;
  registry: RegistryProvider<unknown>;
  layers: readonly { key: string; label: string }[];
};

/** Title, load mode, the META and provider pickers, and what was loaded. */
function RegistryHeader({ title, logo, mode, registry, layers }: HeaderProps) {
  const [entrySheetOpen, setEntrySheetOpen] = useState(false);
  const [metaSheetOpen, setMetaSheetOpen] = useState(false);
  const { entry, layerKey, report } = registry;
  const layer = layers.find((l) => l.key === layerKey);

  return (
    <>
      <ScreenHeader title={title} logo={logo} badge={<ModeBadge mode={mode} />}>
        <HeaderChip
          emoji="🔵"
          label={layer?.label ?? NO_META.label}
          active={layer !== undefined}
          onPress={() => setMetaSheetOpen(true)}
        />
        <HeaderChip
          emoji={entry ? STATUS_EMOJI[entry.status] : '📦'}
          label={entry?.name ?? '…'}
          loading={registry.loading}
          onPress={() => setEntrySheetOpen(true)}
        />
      </ScreenHeader>
      {report ? <LoadReportBar report={report} /> : null}

      <ProviderSheet
        visible={entrySheetOpen}
        title="Streaming Provider"
        providers={registry.entries.map((e) => ({ key: e.id, label: e.name, emoji: STATUS_EMOJI[e.status] }))}
        selectedKey={entry?.id ?? ''}
        onSelect={registry.select}
        onClose={() => setEntrySheetOpen(false)}
      />
      <ProviderSheet
        visible={metaSheetOpen}
        title="META Layer"
        providers={[NO_META, ...layers.map((l) => ({ key: l.key, label: l.label, emoji: '🔵' }))]}
        selectedKey={layerKey ?? NO_META.key}
        onSelect={(key) => registry.selectLayer(key === NO_META.key ? null : key)}
        onClose={() => setMetaSheetOpen(false)}
      />
    </>
  );
}

/** What shows instead of the search while the provider loads, or why it didn't. */
function RegistryLoadState({
  registry,
  mode,
  onModeChange,
}: {
  registry: RegistryProvider<unknown>;
  mode: LoadMode;
  onModeChange: (mode: LoadMode) => void;
}) {
  const { entry, loading, failure } = registry;
  if (loading) return <LoadingView title={`Loading ${entry?.name ?? ''}…`} text={loadingMessage(mode, entry)} />;
  if (!failure) return null;
  return (
    <LoadErrorView
      failure={failure}
      onRetry={registry.retry}
      onSkipIntegrity={registry.runUnverified}
      onSwitchMode={onModeChange}
    />
  );
}
