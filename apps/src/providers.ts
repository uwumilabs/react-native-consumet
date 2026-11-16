/**
 * The providers the Anime, Movies and Manga tabs offer: every provider class in the library's
 * ANIME, MOVIES and MANGA objects, so a provider the library adds shows up here on its own.
 */

import {
  ANIME,
  AnimeParser,
  MANGA,
  MOVIES,
  MovieParser,
  type IAnimeProvider,
  type IMangaChapterPage,
  type IMangaInfo,
  type IMangaResult,
  type IMovieProvider,
  type ISearch,
} from 'react-native-consumet';

type ProviderDef<P> = {
  /** The provider's key in the library object, e.g. 'AnimePahe' */
  key: string;
  label: string;
  emoji: string;
  make: () => P;
};

type ProviderClass<P> = new () => P;

/** A picked provider: its entry and a new instance. */
export const pickProvider = <P>(def: ProviderDef<P>) => ({ def, provider: def.make() });

/**
 * Picker entries for the provider classes in one of the library's provider objects (ANIME and
 * MOVIES also hold the factories). Those in `emoji` come first, in its order, which makes the first
 * one the tab's default; the rest follow with 📦.
 */
function providerDefs<P>(
  library: Record<string, unknown>,
  isProvider: (value: unknown) => value is ProviderClass<P>,
  emoji: Record<string, string>
): ProviderDef<P>[] {
  const order = Object.keys(emoji);
  const rank = (key: string) => {
    const index = order.indexOf(key);
    return index === -1 ? order.length : index;
  };
  return Object.entries(library)
    .filter((entry): entry is [string, ProviderClass<P>] => isProvider(entry[1]))
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([key, Provider]) => ({ key, label: key, emoji: emoji[key] ?? '📦', make: () => new Provider() }));
}

const subclassOf =
  <P>(Base: abstract new () => object) =>
  (value: unknown): value is ProviderClass<P> =>
    typeof value === 'function' && value.prototype instanceof Base;

export const ANIME_PROVIDERS = providerDefs(ANIME, subclassOf<IAnimeProvider>(AnimeParser), {
  AniNeko: '🐱',
  AniKoto: '🌸',
  Zoro: '⚔️',
  AnimePahe: '🦋',
  ReAnime: '🔁',
});

export const MOVIE_PROVIDERS = providerDefs(MOVIES, subclassOf<IMovieProvider>(MovieParser), {
  VegaMovies: '🎬',
  HiMovies: '🍿',
  NetflixMirror: '🎭',
  PrimeMirror: '📦',
  DisneyMirror: '🏰',
});

/** Whether the provider lists sub and dub as separate entries (a provider factory's `isDubAvailableSeparately`). */
export const isDubSeparate = (provider: IAnimeProvider): boolean =>
  'isDubAvailableSeparately' in provider && provider.isDubAvailableSeparately === true;

/** The calls the Manga tab makes: the shape every manga provider shares (docs/guides/manga.md). */
export type MangaProvider = {
  search(query: string, page?: number): Promise<ISearch<IMangaResult>>;
  fetchMangaInfo(mangaId: string): Promise<IMangaInfo>;
  fetchChapterPages(chapterId: string): Promise<IMangaChapterPage[]>;
};

/**
 * MANGA holds only classes. They are typed by the shared shape rather than by their own class, so
 * one that drifts from the shape (say, a `fetchChapterPages` that wants a second argument) still
 * loads and the tab's contract panel shows what it breaks, instead of the app failing to compile.
 */
const isMangaProvider = (value: unknown): value is ProviderClass<MangaProvider> => typeof value === 'function';

export const MANGA_PROVIDERS = providerDefs(MANGA, isMangaProvider, {
  MangaDex: '📚',
  MangaHere: '📖',
  MangaKakalot: '🐉',
  MangaPill: '💊',
  AsuraScans: '🗡️',
  FlameScans: '🔥',
});
