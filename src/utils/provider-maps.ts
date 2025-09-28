/**
 * This file is used to map the providers to their respective keys.
 * It is a separate file to avoid circular dependencies between the providers and the utils.
 * The circular dependency is caused by the fact that the providers need to be imported in the utils
 * to be used in the ProviderManager, but the providers also need to import the utils to use the
 * createProviderContext function.
 */

import { ANIME, MOVIES, META } from '../providers';

export const animeProviders = {
  Zoro: ANIME.Zoro,
  AnimePahe: ANIME.AnimePahe,
};

export const movieProviders = {
  HiMovies: MOVIES.HiMovies,
  MultiMovies: MOVIES.MultiMovies,
  MultiStream: MOVIES.MultiStream,
};

const metaProviders = {
  Anilist: META.Anilist,
  TMDB: META.TMDB,
  MAL: META.Myanimelist,
};

export type AnimeProvider = keyof typeof animeProviders;
export type MovieProvider = keyof typeof movieProviders;
export type MetaProvider = keyof typeof metaProviders;
