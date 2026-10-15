import axios, { type AxiosError, type AxiosInstance } from 'axios';

/** Default timeout for metadata APIs (AniList, TMDB, MAL). */
export const META_TIMEOUT_MS = 15000;
/** Timeout for optional enrichment (ani.zip, filler lists); the call still succeeds without it. */
export const ENRICHMENT_TIMEOUT_MS = 5000;

const MAX_RETRY_DELAY_MS = 5000;

const isRetryable = (status?: number) => status === 429 || (status !== undefined && status >= 500);

/**
 * Retry a request once (by default) when the server answers 429 or 5xx, waiting for
 * `Retry-After` when present (capped) or a short linear backoff.
 */
export function withRetry(instance: AxiosInstance, { retries = 1, baseDelayMs = 500 } = {}): AxiosInstance {
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as (typeof error.config & { __retryCount?: number }) | undefined;
    const attempt = config?.__retryCount ?? 0;
    if (!config || attempt >= retries || !isRetryable(error.response?.status)) throw error;

    config.__retryCount = attempt + 1;
    const retryAfterSeconds = Number(error.response?.headers?.['retry-after']);
    const delay =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS)
        : baseDelayMs * config.__retryCount;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return instance.request(config);
  });
  return instance;
}

/** Shared client for meta providers: bounded by a timeout, with one retry on 429/5xx. */
export const metaHttp = withRetry(axios.create({ timeout: META_TIMEOUT_MS }));
