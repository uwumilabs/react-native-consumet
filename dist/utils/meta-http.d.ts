import axios, { type AxiosInstance } from 'axios';
/** Default timeout for metadata APIs (AniList, TMDB, MAL). */
export declare const META_TIMEOUT_MS = 15000;
/** Timeout for optional enrichment (ani.zip, filler lists); the call still succeeds without it. */
export declare const ENRICHMENT_TIMEOUT_MS = 5000;
/**
 * Retry a request once (by default) when the server answers 429 or 5xx, waiting for
 * `Retry-After` when present (capped) or a short linear backoff.
 */
export declare function withRetry(instance: AxiosInstance, { retries, baseDelayMs }?: {
    retries?: number | undefined;
    baseDelayMs?: number | undefined;
}): AxiosInstance;
/** Shared client for meta providers: bounded by a timeout, with one retry on 429/5xx. */
export declare const metaHttp: axios.AxiosInstance;
//# sourceMappingURL=meta-http.d.ts.map