import { ANIME, MANGA, COMICS, LIGHT_NOVELS, MOVIES, META, NEWS } from '../providers';

/**
 * List of providers
 *
 * add new providers here (order does not matter)
 */
export const PROVIDERS_LIST = {
  ANIME: [
    new ANIME.AnimeFox(),
    new ANIME.AnimePahe(),
    new ANIME.Bilibili(),
    new ANIME.Anify(),
    new ANIME.Gogoanime(),
    new ANIME.Zoro(),
    new ANIME.Marin(),
    new ANIME.AnimeKai(),
    new ANIME.AnimeOwl(),
  ],
  MANGA: [
    new MANGA.MangaDex(),
    new MANGA.MangaHere(),
    new MANGA.MangaKakalot(),
    new MANGA.Mangapark(),
    new MANGA.MangaPill(),
    new MANGA.MangaReader(),
    new MANGA.Mangasee123(),
    new MANGA.ComicK(),
    new MANGA.FlameScans(),
    new MANGA.MangaHost(),
    new MANGA.BRMangas(),
  ],
  COMICS: [new COMICS.GetComics()],
  LIGHT_NOVELS: [new LIGHT_NOVELS.ReadLightNovels()],
  MOVIES: [
    new MOVIES.DramaCool(),
    new MOVIES.FlixHQ(),
    new MOVIES.Fmovies(),
    new MOVIES.Goku(),
    new MOVIES.KissAsian(),
    new MOVIES.MovieHdWatch(),
    new MOVIES.ViewAsian(),
    new MOVIES.SFlix(),
    new MOVIES.MultiMovies(),
    new MOVIES.NetflixMirror(),
    new MOVIES.HiMovies(),
  ],
  NEWS: [new NEWS.ANN()],
  META: [new META.Anilist(), new META.TMDB(), new META.Myanimelist()],
  OTHERS: [],
};
