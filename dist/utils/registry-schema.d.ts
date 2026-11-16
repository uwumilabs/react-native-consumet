import type { ExtensionRegistryData } from '../models/extension-manifest';
/**
 * Version of the context this library gives extension code: the `ctx` helpers, the modules it can
 * `require` and the globals it runs with. Bump it when extension code may need something earlier
 * versions don't provide, and have the entries that need it declare `minContextVersion`.
 */
export declare const CONTEXT_VERSION = 1;
/**
 * Newest registry `schemaVersion` this library reads. Bump it only for changes older libraries
 * would misread (a field removed, renamed or changing meaning); new optional fields don't need it.
 */
export declare const REGISTRY_SCHEMA_VERSION = 1;
export type RegistryErrorCode = 'INVALID_REGISTRY' | 'UNSUPPORTED_SCHEMA' | 'INCOMPATIBLE_ENTRY';
/**
 * Thrown when a registry is malformed, uses a newer schema than this library reads, or an entry
 * needs a newer extension context. `updateRequired` marks the cases a newer app version fixes.
 */
export declare class RegistryError extends Error {
    readonly code: RegistryErrorCode;
    /** Extension id or extractor name, when the error is about one entry */
    readonly id?: string;
    /** Every problem found, e.g. `extensions[2] (anineko): factoryName must be a JavaScript identifier` */
    readonly issues: string[];
    /** Version the registry or entry needs: its `schemaVersion` or `minContextVersion` */
    readonly required?: number;
    /** Version this library supports: REGISTRY_SCHEMA_VERSION or CONTEXT_VERSION */
    readonly supported?: number;
    /** True when a newer version of the app would accept it, so the user should update */
    readonly updateRequired: boolean;
    constructor(code: RegistryErrorCode, message: string, details?: {
        id?: string;
        issues?: string[];
        required?: number;
        supported?: number;
    });
}
type Entry = Record<string, unknown>;
/**
 * The two lists of a registry. `key` names an entry: names are case-insensitive, so lookups,
 * duplicate checks and published paths (`registry/<list>/<key>/<version>.js`) use it lowercased.
 * `factory` names the function the entry's code defines.
 */
export declare const REGISTRY_KINDS: {
    readonly extensions: {
        readonly key: "id";
        readonly factory: "factoryName";
    };
    readonly extractors: {
        readonly key: "name";
        readonly factory: "name";
    };
};
export type RegistryKind = keyof typeof REGISTRY_KINDS;
/** Pattern of an entry key as published paths use it: its id or name, lowercased. */
export declare const REGISTRY_KEY_PATTERN = "[a-z0-9][a-z0-9-]*";
/** Pattern of an entry version: major.minor.patch, as published paths use it. */
export declare const REGISTRY_VERSION_PATTERN = "\\d+\\.\\d+\\.\\d+";
/** The lowercase key of a registry entry of `kind`, or undefined when its key field isn't a string. */
export declare function registryKey(kind: RegistryKind, entry: Entry): string | undefined;
/**
 * Whether this library can run an entry: it needs no newer context than CONTEXT_VERSION.
 * Entries without `minContextVersion` need context 1. A malformed value is never compatible.
 */
export declare function isCompatibleEntry(entry: {
    minContextVersion?: unknown;
} | undefined): boolean;
/**
 * Refuse an extension or extractor entry this library can't run. The managers call this before
 * fetching or executing code, including `execute*Code` with code the app cached itself.
 *
 * @throws RegistryError `INCOMPATIBLE_ENTRY` (with `updateRequired`) when the entry needs a newer
 *   context, or `INVALID_REGISTRY` when its `minContextVersion` isn't a positive integer
 */
export declare function assertCompatibleEntry(entry: {
    id?: string;
    name?: string;
    minContextVersion?: unknown;
} | undefined): void;
/**
 * Check a registry (bundled, or downloaded as JSON) before the managers use it.
 * A missing `schemaVersion` reads as 1; fields not in the schema are ignored.
 *
 * @throws RegistryError `UNSUPPORTED_SCHEMA` (with `updateRequired`) when `schemaVersion` is newer
 *   than REGISTRY_SCHEMA_VERSION, or `INVALID_REGISTRY` listing every problem in `issues`
 */
export declare function validateRegistry(registry: unknown): ExtensionRegistryData & {
    schemaVersion: number;
};
export {};
//# sourceMappingURL=registry-schema.d.ts.map