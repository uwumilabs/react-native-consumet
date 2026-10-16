/**
 * The caller's TMDB API key, or the shared key with a `console.warn` the first time each class
 * falls back to it. A missing key is a setup problem for the app's developer, not a failed request:
 * requests still work, so it is a warning (a LogBox notice in React Native dev builds), not an error.
 */
export declare const resolveTmdbApiKey: (apiKey: string | undefined, className: string) => string;
//# sourceMappingURL=tmdb-api-key.d.ts.map