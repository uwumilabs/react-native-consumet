import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ExtensionManifest, ProviderManager, ProviderOfCategory } from 'react-native-consumet';
import { useLatestCall } from '../hooks/useLatestCall';
import {
  describeLoadError,
  loadProvider,
  type BrowsedCategory,
  type LoadFailure,
  type LoadMode,
  type LoadOptions,
  type LoadReport,
} from './load-provider';

/** A META provider the tab can put in front of the loaded provider. */
export type MetaLayer<P> = { key: string; label: string; wrap: (provider: P) => P };

/** A Registry sub-tab's provider: the picked entry, loaded in the current mode, wrapped in the picked META layer. */
export interface RegistryProvider<P> {
  entries: ExtensionManifest[];
  entry: ExtensionManifest | undefined;
  select(id: string): void;
  layerKey: string | null;
  selectLayer(key: string | null): void;
  /** null while it loads or after it failed */
  provider: P | null;
  loading: boolean;
  failure: LoadFailure | null;
  report: LoadReport | null;
  retry(): void;
  /** Local mode: run the local bundle without the hash check */
  runUnverified(): void;
}

export function useRegistryProvider<C extends BrowsedCategory>(
  manager: ProviderManager,
  category: C,
  mode: LoadMode,
  layers: readonly MetaLayer<ProviderOfCategory<C>>[]
): RegistryProvider<ProviderOfCategory<C>> {
  const entries = useMemo(() => manager.getExtensionsByCategory(category), [manager, category]);
  const [entry, setEntry] = useState(() => entries.find((e) => e.status !== 'deprecated') ?? entries[0]);
  const [loaded, setLoaded] = useState<ProviderOfCategory<C> | null>(null);
  const [layerKey, setLayerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<LoadFailure | null>(null);
  const [report, setReport] = useState<LoadReport | null>(null);
  const calls = useLatestCall();

  const load = useCallback(
    async (next: ExtensionManifest, options: LoadOptions = {}) => {
      const isCurrent = calls.start();
      setLoaded(null);
      setLoading(true);
      setFailure(null);
      setReport(null);
      try {
        const result = await loadProvider(manager, category, next, mode, options);
        if (!isCurrent()) return;
        console.log('[Registry] loaded', result.report);
        setLoaded(result.provider);
        setReport(result.report);
      } catch (e) {
        if (isCurrent()) setFailure(describeLoadError(e, next, mode));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [manager, category, mode, calls]
  );

  // Load the entry when it's picked, and again when the Load from toggle changes the mode.
  useEffect(() => {
    if (entry) load(entry);
    return calls.cancel;
  }, [entry, load, calls]);

  const layer = layers.find((l) => l.key === layerKey);
  const provider = useMemo(() => (loaded && layer ? layer.wrap(loaded) : loaded), [loaded, layer]);

  return {
    entries,
    entry,
    select: (id) => setEntry((current) => entries.find((e) => e.id === id) ?? current),
    layerKey,
    selectLayer: setLayerKey,
    provider,
    loading,
    failure,
    report,
    retry: () => entry && load(entry),
    runUnverified: () => entry && load(entry, { skipIntegrity: true }),
  };
}
