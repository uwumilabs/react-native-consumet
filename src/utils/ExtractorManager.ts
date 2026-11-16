import type { ExtractorContext, ExtractorFactory, IVideoExtractor } from '../models';
import type { BundledRegistry, ExtensionRegistryData, ExtractorInfo } from '../models/extension-manifest';
import { createExtractorContext, type ExtractorContextConfig } from './create-extractor-context';
import { defaultExtractors } from './create-provider-context';
import type { ExecuteCodeOptions, IntegrityOptions } from './extension-integrity';
import { CompiledCodeCache, deleteEntriesOf, extensionGlobals, fetchEntryCode, memoiseLoad } from './extension-modules';
import { assertCompatibleEntry, validateRegistry } from './registry-schema';

type LoadedExtractor = { factory: ExtractorFactory; instance: IVideoExtractor };

export class ExtractorManager {
  // Loads by `${extractor name}|${sha256}` (`|bundled` for extractors the registry lacks), see load
  private loads = new Map<string, Promise<LoadedExtractor>>();
  private compiled: CompiledCodeCache;
  private registry = new Map<string, ExtractorInfo>();
  // Bundled extractors by lowercased name
  private bundled = new Map<string, ExtractorFactory>();
  private context: ExtractorContext;

  // Server name alias -> extractor name, from registry `aliases`. The defaults cover registries apps
  // stored before entries carried aliases.
  private aliases: Map<string, string> = new Map([
    ['upcloud', 'megacloud'],
    ['akcloud', 'megacloud'],
  ]);

  /**
   * @throws RegistryError if the registry is invalid or uses a newer schema than this library reads
   */
  constructor(
    registry: ExtensionRegistryData | BundledRegistry,
    extractorConfig: ExtractorContextConfig = {},
    integrityOptions: IntegrityOptions = {}
  ) {
    const { extractors } = validateRegistry(registry);
    this.context = createExtractorContext(extractorConfig);
    this.compiled = new CompiledCodeCache(integrityOptions);
    for (const [name, factory] of Object.entries(defaultExtractors)) {
      this.bundled.set(name.toLowerCase(), factory as ExtractorFactory);
    }
    for (const extractor of extractors) {
      const name = extractor.name.toLowerCase();
      this.registry.set(name, { ...extractor });
      for (const alias of extractor.aliases ?? []) this.aliases.set(alias.toLowerCase(), name);
    }
  }

  /**
   * The registry entry for a server name or extractor name, case-insensitive: 'MegaCloud',
   * 'megacloud-hd-1', or an alias like 'upcloud'.
   */
  getExtractorMetadata(extractorId: string): ExtractorInfo | undefined {
    const lower = extractorId.toLowerCase();
    const exact = this.registry.get(this.aliases.get(lower) ?? lower);
    if (exact) return exact;
    const base = this.extractBaseExtractorName(extractorId);
    return base ? this.registry.get(base) : undefined;
  }

  /**
   * Resolve a server name to its extractor name, lowercased: the longest registry extractor name or
   * alias the server name starts with (bundled extractor names are a fallback). 'megacloud-hd-1' ->
   * 'megacloud', 'upcloud' -> 'megacloud', 'newhost-hd-1' -> 'newhost' when the registry has NewHost.
   */
  public extractBaseExtractorName(serverName: string): string | null {
    const lowerName = serverName.toLowerCase();

    // Ordered so that on equal length a registry name beats an alias, and an alias beats a bundled name.
    const candidates: Array<[prefix: string, extractor: string]> = [
      ...Array.from(this.registry.keys(), (name): [string, string] => [name, name]),
      ...Array.from(this.aliases.entries()),
      ...Array.from(this.bundled.keys(), (name): [string, string] => [name, name]),
    ];

    let best: [string, string] | undefined;
    for (const candidate of candidates) {
      if (lowerName.startsWith(candidate[0]) && (!best || candidate[0].length > best[0].length)) {
        best = candidate;
      }
    }
    return best ? best[1] : null;
  }

  /**
   * An extractor for a server or extractor name, built with this manager's context: the registry
   * version, or the bundled one when the registry has none or its code can't be used. Loads are
   * shared by every name the extractor serves ('megacloud-hd-1', 'MegaCloud', 'upcloud').
   *
   * @throws RegistryError if the registry entry needs a newer extension context
   */
  async loadExtractor(extractorId: string): Promise<IVideoExtractor> {
    return (await this.load(extractorId)).instance;
  }

  /** The factory loadExtractor builds its instance with, to build an extractor with another context. */
  async loadExtractorFactory(extractorId: string): Promise<ExtractorFactory> {
    return (await this.load(extractorId)).factory;
  }

  /**
   * Forget a loaded extractor and its compiled code, so the next load fetches and runs it again.
   * Takes the same names as loadExtractor ('megacloud-hd-1', 'MegaCloud', 'upcloud').
   */
  invalidate(extractorId: string): void {
    const name = this.nameOf(extractorId);
    deleteEntriesOf(this.loads, name);
    this.compiled.forget(name);
  }

  /**
   * Run registry code for an extractor and build it with this manager's context. The code must match
   * `metadata.sha256` unless `options.skipIntegrity` is set.
   *
   * @throws RegistryError before running anything if the entry needs a newer extension context
   * @throws IntegrityError before running anything if the hash or extractor name is invalid
   */
  public async executeExtractorCode(
    code: string,
    metadata: ExtractorInfo,
    options: ExecuteCodeOptions = {}
  ): Promise<IVideoExtractor> {
    return this.compileExtractor(code, metadata, options)(this.context);
  }

  private nameOf(extractorId: string): string {
    return (
      this.getExtractorMetadata(extractorId)?.name ??
      this.extractBaseExtractorName(extractorId) ??
      extractorId
    ).toLowerCase();
  }

  private load(extractorId: string): Promise<LoadedExtractor> {
    const metadata = this.getExtractorMetadata(extractorId);
    if (!metadata) {
      const name = this.nameOf(extractorId);
      const factory = this.bundled.get(name);
      if (!factory) throw new Error(`Extractor '${extractorId}' not found in registry or static extractors`);
      return memoiseLoad(this.loads, `${name}|bundled`, async () => this.loaded(factory));
    }
    // Refuse a version that needs a newer extension context before downloading it.
    assertCompatibleEntry(metadata);
    const key = `${metadata.name.toLowerCase()}|${metadata.sha256 ?? ''}`;
    return memoiseLoad(this.loads, key, async () => this.loaded(await this.fetchFactory(metadata)));
  }

  private loaded(factory: ExtractorFactory): LoadedExtractor {
    return { factory, instance: factory(this.context) };
  }

  /** The registry version of an extractor, falling back to the bundled one when it can't be used. */
  private async fetchFactory(metadata: ExtractorInfo): Promise<ExtractorFactory> {
    try {
      return this.compileExtractor(await fetchEntryCode('extractor', metadata.main), metadata);
    } catch (error) {
      const bundled = this.bundled.get(metadata.name.toLowerCase());
      if (!bundled) throw error;
      console.warn(`Extractor '${metadata.name}' from the registry failed; using the bundled one:`, error);
      return bundled;
    }
  }

  private compileExtractor(code: string, metadata: ExtractorInfo, options: ExecuteCodeOptions = {}): ExtractorFactory {
    assertCompatibleEntry(metadata);
    const id = String(metadata?.name);
    return this.compiled.compile(id.toLowerCase(), {
      kind: 'extractor',
      id,
      name: metadata?.name,
      code,
      entry: metadata,
      globals: () => extensionGlobals('extractor', id, this.context),
      skipIntegrity: options.skipIntegrity,
    }) as ExtractorFactory;
  }
}

export default ExtractorManager;
