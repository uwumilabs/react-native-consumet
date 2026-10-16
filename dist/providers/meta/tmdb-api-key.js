"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTmdbApiKey = void 0;
/**
 * The TMDB API key used when the caller passes none. Every app that doesn't pass its own key shares
 * it, so TMDB can rate-limit or revoke it at any time.
 */
const SHARED_TMDB_API_KEY = '5201b54eb0968700e693a30576d7d4dc';
const warned = new Set();
/**
 * The caller's TMDB API key, or the shared key with a `console.warn` the first time each class
 * falls back to it. A missing key is a setup problem for the app's developer, not a failed request:
 * requests still work, so it is a warning (a LogBox notice in React Native dev builds), not an error.
 */
const resolveTmdbApiKey = (apiKey, className) => {
    const key = apiKey?.trim();
    if (key)
        return key;
    if (!warned.has(className)) {
        warned.add(className);
        console.warn(`[react-native-consumet] ${className} was created without a TMDB API key, so it uses a key shared by ` +
            'every app that passes none, which TMDB can rate-limit or revoke at any time. Pass your own key ' +
            '(https://www.themoviedb.org/settings/api).');
    }
    return SHARED_TMDB_API_KEY;
};
exports.resolveTmdbApiKey = resolveTmdbApiKey;
//# sourceMappingURL=tmdb-api-key.js.map