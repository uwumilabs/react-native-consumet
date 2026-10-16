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
export type ExtensionFactory = (...args: any[]) => any;
/** The globals extension code runs with; each key becomes a local constant of that name. */
export type ExtensionGlobals = {
    exports: Record<string, any>;
    module: {
        exports: any;
    };
} & Record<string, unknown>;
/**
 * Run single-file extension code and return the function it provides as `name`: `exports[name]`,
 * `module.exports[name]`, a top-level `function name` (code without exports), or its default
 * export. Undefined when it provides none. `name` must be a valid identifier (assertValidIdentifier).
 */
export declare function evaluateExtensionCode(code: string, name: string, globals: ExtensionGlobals, kind: 'provider' | 'extractor'): ExtensionFactory | undefined;
/** Compiled extension code, reused only for the same code and sha256 (one entry per key). */
export type CompiledCode = {
    sha256: string;
    code: string;
    factory: ExtensionFactory;
};
/**
 * Share one load per key: concurrent callers get the same promise, later callers the result.
 * A failed load is forgotten, so the next call tries again.
 */
export declare function memoiseLoad<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T>;
/** Delete the entries of one extension or extractor: keys `${id}` and `${id}|…`. */
export declare function deleteEntriesOf(cache: Map<string, unknown>, id: string): void;
//# sourceMappingURL=extension-modules.d.ts.map