// Polyfills (must be first for global APIs like URL, URLSearchParams, etc.)
import 'react-native-url-polyfill/auto';

// Providers (namespaced provider groups)
import { ANIME, LIGHT_NOVELS, MANGA, MOVIES, META } from './providers';

// Provider metadata (catalog of built-in providers)
import { PROVIDERS_LIST } from './utils/providers-list';

import ProviderManager from './ProviderManager';

// Utils (execution, dynamic loading, validation, contexts, and extension registry)
import {
  createProviderContext,
  ExtensionRegistryManager,
  createExtensionManager,
  DEFAULT_REGISTRY,
  createProviderFromURL,
  ExtensionUtils,
} from './utils';

// Extractors (video/file hosters and scrapers)
import {
  AsianLoad,
  Filemoon,
  GogoCDN,
  Kwik,
  MixDrop,
  Mp4Upload,
  RapidCloud,
  StreamHub,
  StreamLare,
  StreamSB,
  StreamTape,
  StreamWish,
  VidCloud,
  VidMoly,
  VizCloud,
  Mp4Player,
  MegaCloud,
  VidHide,
  Voe,
  MegaUp,
} from './extractors';

// Models (domain types, enums, and constants)
import {
  type IProviderStats,
  type ISearch,
  type IAnimeEpisode,
  type IAnimeInfo,
  type IAnimeResult,
  type IEpisodeServer,
  type IVideo,
  StreamingServers,
  MediaStatus,
  SubOrSub,
  type IMangaResult,
  type IMangaChapter,
  type IMangaInfo,
  type ILightNovelResult,
  type ILightNovelInfo,
  type ILightNovelChapter,
  type ILightNovelChapterContent,
  type IMangaChapterPage,
  TvType,
  type IMovieEpisode,
  type IMovieInfo,
  type ISource,
  type ISubtitle,
  type IMovieResult,
  type Intro,
  Genres,
  type INewsFeed,
  Topics,
  type INewsInfo,
  type FuzzyDate,
  type ITitle,
  MediaFormat,
  type ProxyConfig,
  type AniZipEpisode,
  type IMovieSeason,
} from './models';

// Extension types
import type {
  ExtensionManifest,
  ExtensionRegistry,
  ExtensionInstallResult,
  ExtensionSearchFilters,
} from './models/extension-manifest';

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

// Providers (namespaced)
export { ANIME, MANGA, LIGHT_NOVELS, MOVIES, META };

// Provider metadata
export { PROVIDERS_LIST };

export { ProviderManager };

// Models: runtime enums/constants
export { Topics, Genres, SubOrSub, StreamingServers, MediaStatus, TvType, MediaFormat };

// Extractors (runtime values)
export {
  GogoCDN,
  StreamSB,
  VidCloud,
  MixDrop,
  Kwik,
  RapidCloud,
  StreamTape,
  StreamLare,
  StreamHub,
  VizCloud,
  AsianLoad,
  Filemoon,
  Mp4Upload,
  StreamWish,
  VidMoly,
  MegaUp,
  Mp4Player,
  MegaCloud,
  VidHide,
  Voe,
};

// Models: TypeScript types (compile-time only)
export type {
  IProviderStats,
  IAnimeEpisode,
  IAnimeInfo,
  IAnimeResult,
  IEpisodeServer,
  IVideo,
  IMangaResult,
  IMangaChapter,
  IMangaInfo,
  ILightNovelResult,
  ILightNovelInfo,
  ILightNovelChapter,
  ILightNovelChapterContent,
  ISearch,
  IMangaChapterPage,
  IMovieEpisode,
  IMovieInfo,
  ISource,
  ISubtitle,
  IMovieResult,
  Intro,
  INewsFeed,
  INewsInfo,
  FuzzyDate,
  ITitle,
  ProxyConfig,
  AniZipEpisode,
  IMovieSeason,
  ExtensionManifest,
  ExtensionRegistry,
  ExtensionInstallResult,
  ExtensionSearchFilters,
};

// Utils: functions, contexts, and extension registry (runtime values)
export {
  createProviderContext,
  ExtensionRegistryManager,
  createExtensionManager,
  DEFAULT_REGISTRY,
  createProviderFromURL,
  ExtensionUtils,
};

