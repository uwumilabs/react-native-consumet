"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.metaHttp = exports.ENRICHMENT_TIMEOUT_MS = exports.META_TIMEOUT_MS = void 0;
exports.withRetry = withRetry;
const axios_1 = __importDefault(require("axios"));
/** Default timeout for metadata APIs (AniList, TMDB, MAL). */
exports.META_TIMEOUT_MS = 15000;
/** Timeout for optional enrichment (ani.zip, filler lists); the call still succeeds without it. */
exports.ENRICHMENT_TIMEOUT_MS = 5000;
const MAX_RETRY_DELAY_MS = 5000;
const isRetryable = status => status === 429 || status !== undefined && status >= 500;
/**
 * Retry a request once (by default) when the server answers 429 or 5xx, waiting for
 * `Retry-After` when present (capped) or a short linear backoff.
 */
function withRetry(instance) {
  let {
    retries = 1,
    baseDelayMs = 500
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  instance.interceptors.response.use(undefined, async error => {
    const config = error.config;
    const attempt = config?.__retryCount ?? 0;
    if (!config || attempt >= retries || !isRetryable(error.response?.status)) throw error;
    config.__retryCount = attempt + 1;
    const retryAfterSeconds = Number(error.response?.headers?.['retry-after']);
    const delay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS) : baseDelayMs * config.__retryCount;
    await new Promise(resolve => setTimeout(resolve, delay));
    return instance.request(config);
  });
  return instance;
}
/** Shared client for meta providers: bounded by a timeout, with one retry on 429/5xx. */
exports.metaHttp = withRetry(axios_1.default.create({
  timeout: exports.META_TIMEOUT_MS
}));
//# sourceMappingURL=meta-http.js.map