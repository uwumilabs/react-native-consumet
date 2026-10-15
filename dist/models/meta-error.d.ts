/** Where a meta provider failure came from. */
export type MetaErrorSource = 'anilist' | 'mal' | 'tmdb' | 'anizip' | 'filler' | 'provider';
/**
 * Error thrown by meta providers (Anilist, MAL, TMDB). Keeps the failing service, its HTTP status
 * when there was one, and the original error as `cause`, so apps can tell a rate limit or an
 * outage from a missing title.
 */
export declare class MetaError extends Error {
    readonly source: MetaErrorSource;
    readonly status?: number;
    readonly cause?: unknown;
    constructor(message: string, options: {
        source: MetaErrorSource;
        status?: number;
        cause?: unknown;
    });
    /** Wraps any thrown value, reading the HTTP status from axios errors. A MetaError passes through. */
    static from(source: MetaErrorSource, error: unknown, message?: string): MetaError;
}
//# sourceMappingURL=meta-error.d.ts.map