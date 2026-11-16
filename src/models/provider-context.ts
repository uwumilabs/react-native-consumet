import type AnimeParser from './anime-parser';
import type MovieParser from './movie-parser';
import type MangaParser from './manga-parser';
import type { ExtractorContext } from './extractor-context';
import type {
  StreamingServers,
  MediaFormat,
  MediaStatus,
  SubOrDub,
  WatchListType,
  TvType,
  Genres,
  Topics,
} from './types';
import type * as BundledExtractors from '../extractors';

/** The fields a provider factory returns besides its methods. */
export type ProviderConfig = {
  name: string;
  languages: string[] | string;
  classPath: string;
  baseUrl: string;
  isNSFW: boolean;
  logo: string;
  isWorking?: boolean;
  isDubAvailableSeparately?: boolean;
};

/**
 * What every provider factory runs with: the extractor context, plus the base parsers, the library's
 * enums and the extractors. `extractors.X(ctx)` runs X with the context it's given (the provider's
 * own when omitted); under a ProviderManager whose registry lists X, that's X's registry version.
 */
export interface ProviderContext extends ExtractorContext {
  AnimeParser: typeof AnimeParser;
  MovieParser: typeof MovieParser;
  MangaParser: typeof MangaParser;
  extractors: typeof BundledExtractors;
  /** The site URL a provider uses: `customUrl` (with `http://` added when it has no scheme), else `defaultUrl`. */
  createCustomBaseUrl: (defaultUrl: string, customUrl?: string) => string;
  enums: {
    StreamingServers: typeof StreamingServers;
    MediaFormat: typeof MediaFormat;
    MediaStatus: typeof MediaStatus;
    SubOrDub: typeof SubOrDub;
    WatchListType: typeof WatchListType;
    TvType: typeof TvType;
    Genres: typeof Genres;
    Topics: typeof Topics;
  };
}
