/**
 * This file maps provider keys to their classes for ProviderManager.
 *
 * We use lazy getters to break circular dependencies:
 * - Meta providers (like Anilist) import anime providers (like AnimeKai)
 * - AnimeKai imports extractors directly from extractors/
 * - Utils no longer re-exports extractors (breaking one part of the circle)
 * - Lazy loading breaks the other part at runtime
 */
import type { IAnimeProvider, IMovieProvider } from '../models/types';

// Use lazy getters to avoid circular dependency issues
// Providers are loaded only when accessed, after all modules are initialized
export const animeProviders = {
  get Zoro() {
    return require('../providers/anime/zoro/zoro').Zoro;
  },
  get AnimePahe() {
    return require('../providers/anime/animepahe/animepahe').AnimePahe;
  },
  get AnimeKai() {
    return require('../providers/anime/animekai/animekai').AnimeKai;
  },
  get AniKoto() {
    return require('../providers/anime/anikoto/anikoto').AniKoto;
  },
};

export const movieProviders = {
  get HiMovies() {
    return require('../providers/movies/himovies/himovies').HiMovies;
  },
  get MultiMovies() {
    return require('../providers/movies/multimovies/multimovies').MultiMovies;
  },
  get MultiStream() {
    return require('../providers/movies/multistream').MultiStream;
  },
  get YFlix() {
    return require('../providers/movies/yflix/yflix').YFlix;
  },
  get VegaMovies() {
    return require('../providers/movies/vegamovies/vegamovies').VegaMovies;
  },
  get NetflixMirror() {
    return require('../providers/movies/netflixmirror/netflixmirror').NetflixMirror;
  },
  get PrimeMirror() {
    return require('../providers/movies/netflixmirror/primemirror').PrimeMirror;
  },
  get DisneyMirror() {
    return require('../providers/movies/netflixmirror/disneymirror').DisneyMirror;
  },
};

/** @deprecated Class keys of the bundled providers; registry ids are lowercase, use `AnimeProviderId`. */
export type AnimeProvider = keyof typeof animeProviders;
/** @deprecated Class keys of the bundled providers; registry ids are lowercase, use `MovieProviderId`. */
export type MovieProvider = keyof typeof movieProviders;

/** Registry ids of the providers in the bundled registry. */
export type KnownAnimeProviderId = 'animepahe' | 'animekai' | 'anikoto' | 'anineko';
export type KnownMovieProviderId =
  | 'multimovies'
  | 'yflix'
  | 'vegamovies'
  | 'netflixmirror'
  | 'primemirror'
  | 'disneymirror';

/** Any registry id; known ids autocomplete, and providers added to a registry later still type-check. */
export type AnimeProviderId = KnownAnimeProviderId | (string & {});
export type MovieProviderId = KnownMovieProviderId | (string & {});

/** The provider type for an id: anime or movie when the id says so, otherwise either. */
export type ProviderInstanceOf<T> = T extends AnimeProvider | KnownAnimeProviderId
  ? IAnimeProvider
  : T extends MovieProvider | KnownMovieProviderId
    ? IMovieProvider
    : IAnimeProvider | IMovieProvider;
