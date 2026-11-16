import Anilist from './anilist';
import Myanimelist from './mal';
import TMDB from './tmdb';

export const META = {
  Anilist,
  /** @deprecated Use `META.Anilist`. See the Myanimelist class for why. */
  Myanimelist,
  TMDB,
};
