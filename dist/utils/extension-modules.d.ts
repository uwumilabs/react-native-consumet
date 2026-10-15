import { StreamingServers, MediaFormat, MediaStatus, SubOrDub, WatchListType, TvType, Genres, Topics } from '../models/types';
/** Module names registry bundles import from the runtime (see scripts/build-extensions.js). */
export declare const MODELS_MODULE = "react-native-consumet/models";
export declare const UTILS_MODULE = "react-native-consumet/utils";
/** The library's enums, handed to extensions as-is so their values always match. */
export declare const extensionEnums: {
    StreamingServers: typeof StreamingServers;
    MediaFormat: typeof MediaFormat;
    MediaStatus: typeof MediaStatus;
    SubOrDub: typeof SubOrDub;
    WatchListType: typeof WatchListType;
    TvType: typeof TvType;
    Genres: typeof Genres;
    Topics: typeof Topics;
};
/**
 * Builds the `require` extension code runs with. Only the modules passed in resolve; anything
 * else throws, so a bundle that depends on a file the runtime can't provide fails at load
 * instead of getting `{}` and losing features silently.
 */
export declare function createExtensionRequire(extensionId: string, modules: Record<string, unknown>): (specifier: string) => any;
//# sourceMappingURL=extension-modules.d.ts.map