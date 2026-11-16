import axios, { type AxiosError } from 'axios';

/** Default timeout for metadata APIs (AniList, TMDB, MAL). */
const META_TIMEOUT_MS = 15000;
/** Timeout for optional enrichment (ani.zip, filler lists, MALSync); the call still succeeds without it. */
export const ENRICHMENT_TIMEOUT_MS = 5000;

const RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

/** Shared client for meta providers: bounded by a timeout, with one retry on 429/5xx. */
export const metaHttp = axios.create({ timeout: META_TIMEOUT_MS });

// A 429 or 5xx is retried once, after the server's `Retry-After` (capped) or a short delay.
metaHttp.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (typeof error.config & { __retried?: boolean }) | undefined;
  const status = error.response?.status;
  if (!config || config.__retried || status === undefined || (status !== 429 && status < 500)) throw error;

  config.__retried = true;
  const retryAfterSeconds = Number(error.response?.headers?.['retry-after']);
  const delay =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS)
      : RETRY_DELAY_MS;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return metaHttp.request(config);
});
