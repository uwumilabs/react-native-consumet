import {
  GogoCDN,
  StreamSB,
  VidCloud,
  MixDrop,
  Kwik,
  RapidCloud,
  MegaCloud,
  StreamTape,
  VizCloud,
  Filemoon,
  AsianLoad,
  StreamHub,
  VidMoly,
  MegaUp,
} from '../extractors';
import {
  USER_AGENT,
  splitAuthor,
  floorID,
  formatTitle,
  genElement,
  capitalizeFirstLetter,
  range,
  getDays,
  days,
  isJson,
  convertDuration,
  substringAfter,
  substringBefore,
  calculateStringSimilarity,
} from './utils';
import {
  anilistSearchQuery,
  anilistMediaDetailQuery,
  kitsuSearchQuery,
  anilistTrendingQuery,
  anilistPopularQuery,
  anilistAiringScheduleQuery,
  anilistGenresQuery,
  anilistAdvancedQuery,
  anilistSiteStatisticsQuery,
  anilistCharacterQuery,
  anilistStaffInfoQuery,
} from './queries';
import { parsePostInfo } from './getComics';
import getKKey from '../extractors/kisskh/kkey';

export {
  USER_AGENT,
  GogoCDN,
  StreamSB,
  StreamHub,
  splitAuthor,
  floorID,
  formatTitle,
  parsePostInfo,
  genElement,
  capitalizeFirstLetter,
  VidCloud,
  MixDrop,
  Kwik,
  anilistSearchQuery,
  anilistMediaDetailQuery,
  kitsuSearchQuery,
  range,
  RapidCloud,
  MegaCloud,
  StreamTape,
  VizCloud,
  anilistTrendingQuery,
  anilistPopularQuery,
  anilistAiringScheduleQuery,
  anilistGenresQuery,
  anilistAdvancedQuery,
  anilistSiteStatisticsQuery,
  anilistStaffInfoQuery,
  Filemoon,
  anilistCharacterQuery,
  getDays,
  days,
  isJson,
  convertDuration,
  AsianLoad,
  substringAfter,
  substringBefore,
  calculateStringSimilarity,
  VidMoly,
  // getKKey,
  MegaUp,
};

// Export provider context utilities
export {
  createProviderContext,
  createProviderContextWithAxios,
  createReactNativeProviderContext,
} from './create-provider-context';

// Export extension utilities
export {
  evaluateProviderCode,
  loadProviderFromURL,
  createProviderFromURL,
  loadMultipleProviders,
  validateProviderModule,
  clearExtensionCache,
  getCachedExtensions,
  testProviderURL,
  type ProviderModule,
  type ExtensionConfig,
} from './extension-utils';

// Export extension registry system
export {
  ExtensionRegistryManager,
  createExtensionManager,
  setupDefaultExtensionManager,
  DEFAULT_REGISTRIES,
} from './extension-registry';

// Export extension manifest types
export type {
  ExtensionManifest,
  ExtensionRegistry,
  ExtensionInstallResult,
  ExtensionSearchFilters,
} from '../models/extension-manifest';

// Export Node.js runtime testing utilities
export { NodeProviderModule } from './node-provider-module';
