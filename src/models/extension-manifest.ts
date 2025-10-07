import type { StreamingServers } from './types';

export type ProviderType = 'anime' | 'movies' | 'manga' | 'light-novels' | 'meta';

export interface ExtractorInfo {
  /** name of the extractor like MegaCloud */
  name: StreamingServers;
  /** version of the extractor */
  version: string;
  /**github url path */
  main: string;
}
/**
 * Extension manifest interface for defining extension metadata
 */
export interface ExtensionManifest {
  /** Unique identifier for the extension */
  id: string;

  /** Human-readable name */
  name: string;

  /** Brief description of what the extension provides */
  description: string;

  /** Extension version (semver format) */
  version: string;

  /** Author information */
  author: {
    name: string;
    email?: string;
    url?: string;
  };

  /** Extension category */
  category: ProviderType;

  /** Main entry point URL or file path */
  main: string;

  /** Factory function names exported by this extension */
  factoryName: string;

  /** Homepage URL */
  baseUrl: string;

  /** Extension icon URL */
  logo: string;

  /** Supported languages/regions */
  languages?: string[];

  /** Whether this extension requires adult content warnings */
  nsfw?: boolean;

  /** Extension status */
  status: 'stable' | 'beta' | 'alpha' | 'deprecated';

  /** Last updated timestamp */
  lastUpdated: string;

  /** extractors name used in the provider */
  extractors: string[];

  /** subbed for anime's */
  subbed?: boolean;

  /** dubbed for anime's */
  dubbed?: boolean;

  /** isSourceEmbed (boolean value to represent if a provider needs extractors) */
  isSourceEmbed?: boolean;

  /** isSourceDirect (boolean value to represent if a provider has direct sources)*/
  isSourceDirect?: boolean;

  /** does the provider have multiple servers/extractors to choose from */
  haveMultiServers?: boolean;
}
