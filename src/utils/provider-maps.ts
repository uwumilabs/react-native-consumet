/**
 * This file maps provider keys to their classes for ProviderManager.
 *
 * We use lazy getters to break circular dependencies:
 * - Meta providers (like Anilist) import anime providers (like AnimeKai)
 * - AnimeKai imports extractors directly from extractors/
 * - Utils no longer re-exports extractors (breaking one part of the circle)
 * - Lazy loading breaks the other part at runtime
 */

// Use lazy getters to avoid circular dependency issues
// Providers are loaded only when accessed, after all modules are initialized
export const animeProviders = {
  get Zoro() {
    return require('../providers/anime/zoro/zoro').default;
  },
  get AnimePahe() {
    return require('../providers/anime/animepahe/animepahe').default;
  },
  get AnimeKai() {
    return require('../providers/anime/animekai/animekai').default;
  },
};

export const movieProviders = {
  get HiMovies() {
    return require('../providers/movies/himovies/himovies').default;
  },
  get MultiMovies() {
    return require('../providers/movies/multimovies/multimovies').default;
  },
  get MultiStream() {
    return require('../providers/movies/multistream').default;
  },
  get YFlix() {
    return require('../providers/movies/yflix/yflix').default;
  },
};

const metaProviders = {
  get Anilist() {
    return require('../providers/meta/anilist').default;
  },
  get TMDB() {
    return require('../providers/meta/tmdb').default;
  },
  get MAL() {
    return require('../providers/meta/mal').default;
  },
};

export type AnimeProvider = keyof typeof animeProviders;
export type MovieProvider = keyof typeof movieProviders;
export type MetaProvider = keyof typeof metaProviders;
