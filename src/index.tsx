import 'react-native-get-random-values';
import { PolyURL, PolyURLSearchParams } from './utils/url-polyfill';

// React Native's URL and URLSearchParams are incomplete or missing; fill in only what's absent.
const scope = globalThis as any;
if (scope && !scope.URL) scope.URL = PolyURL;
if (scope && !scope.URLSearchParams) scope.URLSearchParams = PolyURLSearchParams;

export { default as ExtensionRegistry } from './extension-registry.json';
export { ANIME, LIGHT_NOVELS, MANGA, MOVIES, META } from './providers';
export * from './extractors';
export { PolyURL, PolyURLSearchParams };

export {
  Topics,
  Genres,
  SubOrDub,
  StreamingServers,
  MediaStatus,
  TvType,
  MediaFormat,
  WatchListType,
  AnimeParser,
  MovieParser,
  MetaError,
} from './models';
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
  IMetaAnimeEpisode,
  IMovieSeason,
  ProviderCapabilities,
  IAnimeProvider,
  IMovieProvider,
  ExtensionManifest,
  ExtractorInfo,
  ExtensionRegistryData,
  ProviderType,
  ProviderConfig,
  ProviderContext,
  ExtractorContext,
  IVideoExtractor,
  ExtractorFactory,
  MetaErrorSource,
} from './models';

export {
  createExtractorContext,
  defaultAxios,
  defaultExtractorContext,
  type ExtractorContextConfig,
} from './utils/create-extractor-context';
export { createProviderContext, defaultExtractors, type ProviderContextConfig } from './utils/create-provider-context';
export {
  ProviderManager,
  REQUIRED_PROVIDER_METHODS,
  type ProviderLoadOptions,
  type ProviderOfCategory,
  type ProviderInstanceOf,
  type AnimeProviderId,
  type MovieProviderId,
  type KnownAnimeProviderId,
  type KnownMovieProviderId,
} from './utils/ProviderManager';
export { ExtractorManager } from './utils/ExtractorManager';
export { RegistryFetchError } from './utils/extension-modules';
export {
  verifyExtensionCode,
  IntegrityError,
  type IntegrityErrorCode,
  type IntegrityOptions,
  type ExecuteCodeOptions,
} from './utils/extension-integrity';
export {
  CONTEXT_VERSION,
  REGISTRY_SCHEMA_VERSION,
  RegistryError,
  validateRegistry,
  isCompatibleEntry,
  assertCompatibleEntry,
  type RegistryErrorCode,
} from './utils/registry-schema';
export {
  REGISTRY_SIGNING_KEYS,
  RegistrySignatureError,
  verifyRegistrySignature,
  parseSignedRegistry,
  type RegistrySignatureErrorCode,
  type RegistrySignatureOptions,
} from './utils/registry-signature';
export { parseChapterNumber, parseVolumeNumber, sortChaptersForReading } from './utils/manga';
