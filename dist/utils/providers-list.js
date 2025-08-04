import { ANIME, MANGA, COMICS, LIGHT_NOVELS, MOVIES, META } from '../providers';
/**
 * List of providers
 *
 * add new providers here (order does not matter)
 */
export const PROVIDERS_LIST = {
    ANIME: [new ANIME.AnimePahe(), new ANIME.Anify(), new ANIME.Zoro(), new ANIME.Marin(), new ANIME.AnimeKai()],
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
    MOVIES: [new MOVIES.DramaCool(), new MOVIES.MultiMovies(), new MOVIES.NetflixMirror(), new MOVIES.HiMovies()],
    META: [new META.Anilist(), new META.TMDB(), new META.Myanimelist()],
    OTHERS: [],
};
//# sourceMappingURL=providers-list.js.map