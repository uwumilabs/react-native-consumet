import { StreamingServers, MediaFormat, MediaStatus, SubOrDub, WatchListType, TvType, Genres, Topics } from '../models/types';
import type { ExtractorContext, ProviderContext } from '../models';
import { type IntegrityOptions } from './extension-integrity';
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
export type ExtensionKind = 'provider' | 'extractor';
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
 * The globals and `require`-able modules registry code of `kind` runs with, built from the context it
 * gets. Extractor code also sees axios, cheerio's load, CryptoJS and the URL classes as globals;
 * provider code reaches them through `require` or its context.
 */
export declare function extensionGlobals(kind: ExtensionKind, id: string, ctx: ExtractorContext | ProviderContext): ExtensionGlobals;
/**
 * Run single-file extension code and return the function it provides as `name`: `exports[name]`,
 * `module.exports[name]`, a top-level `function name` (code without exports), or its default
 * export. Undefined when it provides none. `name` must be a valid identifier (assertValidIdentifier).
 */
export declare function evaluateExtensionCode(code: string, name: string, globals: ExtensionGlobals, kind: ExtensionKind): ExtensionFactory | undefined;
/** Thrown when a registry entry's code can't be downloaded; `status` is the HTTP status, if any. */
export declare class RegistryFetchError extends Error {
    readonly kind: ExtensionKind;
    readonly url: string;
    readonly status?: number;
    constructor(kind: ExtensionKind, url: string, message: string, status?: number);
}
/** Download the code a registry entry's `main` points at. */
export declare function fetchEntryCode(kind: ExtensionKind, main: string): Promise<string>;
export interface CompileRequest {
    kind: ExtensionKind;
    /** Registry id of the entry, for errors */
    id: string;
    /** The function the code must provide; must be a plain identifier, as it's interpolated into the code */
    name: unknown;
    code: string;
    entry: {
        id?: string;
        name?: string;
        sha256?: string;
    };
    globals: () => ExtensionGlobals;
    /** Run the code without checking it against `entry.sha256`; such code is never cached. */
    skipIntegrity?: boolean;
}
/**
 * Turns verified registry code into the function it provides. The same code verified against the
 * same hash runs from its compiled copy; unverified code is checked again on every call.
 */
export declare class CompiledCodeCache {
    private integrityOptions;
    private compiled;
    constructor(integrityOptions?: IntegrityOptions);
    compile(key: string, request: CompileRequest): ExtensionFactory;
    /** Forget the compiled code of one extension or extractor: keys `${id}` and `${id}|…`. */
    forget(id: string): void;
}
/**
 * Share one load per key: concurrent callers get the same promise, later callers the result.
 * A failed load is forgotten, so the next call tries again.
 */
export declare function memoiseLoad<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T>;
/** Delete the entries of one extension or extractor: keys `${id}` and `${id}|…`. */
export declare function deleteEntriesOf(cache: Map<string, unknown>, id: string): void;
//# sourceMappingURL=extension-modules.d.ts.map