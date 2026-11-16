import { type AxiosAdapter } from 'axios';
import { AnimeParser, type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, Genres, MangaParser, type IMangaChapterPage, type IMangaInfo, type IMangaResult, type ProxyConfig, type IStaff, type IAnimeProvider } from '../../models';
import type { IMetaAnimeEpisode } from '../../models/types';
declare class Anilist extends AnimeParser {
    readonly name = "Anilist";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    provider: AnimeParser | IAnimeProvider;
    /**
     * Maps AniList anime to an anime provider's episodes, with ani.zip episode metadata for providers
     * that declare `capabilities.aniZipEpisodes`.
     * @param provider anime provider to find the episodes on (default: Zoro, HiAnime)
     * @param _proxyConfig ignored: requests go through the library's own client. Kept so existing calls compile.
     * @param _adapter ignored, for the same reason
     * @param customBaseURL site URL for the default Zoro provider; ignored when `provider` is given
     */
    constructor(provider?: AnimeParser | IAnimeProvider, _proxyConfig?: ProxyConfig, _adapter?: AxiosAdapter, customBaseURL?: string);
    /**
     * @param perPage results per page (default: 15, max: 50)
     */
    search: (query: string, page?: number, perPage?: number) => Promise<ISearch<IAnimeResult>>;
    /**
     * @param type `ANIME` (default) or `MANGA`
     * @param perPage results per page (default: 20, max: 50)
     * @param format `TV`, `TV_SHORT`, `MOVIE`, `SPECIAL`, `OVA`, `ONA` or `MUSIC`
     * @param sort default `[POPULARITY_DESC, SCORE_DESC]`; any of `POPULARITY_DESC`, `POPULARITY`, `TRENDING_DESC`, `TRENDING`, `UPDATED_AT_DESC`, `UPDATED_AT`, `START_DATE_DESC`, `START_DATE`, `END_DATE_DESC`, `END_DATE`, `FAVOURITES_DESC`, `FAVOURITES`, `SCORE_DESC`, `SCORE`, `TITLE_ROMAJI_DESC`, `TITLE_ROMAJI`, `TITLE_ENGLISH_DESC`, `TITLE_ENGLISH`, `TITLE_NATIVE_DESC`, `TITLE_NATIVE`, `EPISODES_DESC`, `EPISODES`, `ID`, `ID_DESC`
     * @param genres any of `Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`
     * @param id AniList id
     * @param year e.g. `2022`
     * @param status `RELEASING`, `FINISHED`, `NOT_YET_RELEASED`, `CANCELLED` or `HIATUS`
     * @param season `WINTER`, `SPRING`, `SUMMER` or `FALL`
     */
    advancedSearch: (query?: string, type?: string, page?: number, perPage?: number, format?: string, sort?: string[], genres?: Genres[] | string[], id?: string | number, year?: number, status?: string, season?: string) => Promise<ISearch<IAnimeResult>>;
    /**
     * @param id AniList id
     * @param fetchFiller set `isFiller` on the episodes, from the MAL filler list (default: `false`)
     */
    fetchAnimeInfo: (id: string, fetchFiller?: boolean) => Promise<IAnimeInfo>;
    fetchEpisodeSources: (episodeId: string, ...args: any) => Promise<ISource>;
    fetchEpisodeServers: (episodeId: string) => Promise<IEpisodeServer[]>;
    fetchTrendingAnime: (page?: number, perPage?: number) => Promise<ISearch<IAnimeResult>>;
    fetchPopularAnime: (page?: number, perPage?: number) => Promise<ISearch<IAnimeResult>>;
    /**
     * The episodes airing in a window of days.
     * @param weekStart first day of the window, its next occurrence counting today (default: today): `2` = Monday, `3` = Tuesday, `4` = Wednesday, `5` = Thursday, `6` = Friday, `0` = Saturday, `1` = Sunday, or the day's name
     * @param weekEnd last day of the window, included, on or after weekStart (default: the day before today, so a full week); like weekStart
     * @param notYetAired only episodes that haven't aired yet
     */
    fetchAiringSchedule: (page?: number, perPage?: number, weekStart?: number | string, weekEnd?: number | string, notYetAired?: boolean) => Promise<ISearch<IAnimeResult>>;
    /**
     * @param genres any of `Action`, `Adventure`, `Cars`, `Comedy`, `Drama`, `Fantasy`, `Horror`, `Mahou Shoujo`, `Mecha`, `Music`, `Mystery`, `Psychological`, `Romance`, `Sci-Fi`, `Slice of Life`, `Sports`, `Supernatural`, `Thriller`
     */
    fetchAnimeGenres: (genres: string[] | Genres[], page?: number, perPage?: number) => Promise<ISearch<IAnimeResult>>;
    fetchRandomAnime: () => Promise<IAnimeInfo>;
    /**
     * The provider's episodes for the AniList entry: the search result whose title is closest (see
     * matchScore), the sub entry before the dub. Empty when no result is close enough.
     */
    private findProviderEpisodes;
    /**
     * @param id AniList id
     * @param fetchFiller set `isFiller` on the episodes, from the MAL filler list (default: `false`)
     * @returns the episode list without the anime info, every episode with a `uniqueId`
     */
    fetchEpisodesListById: (id: string, fetchFiller?: boolean) => Promise<IMetaAnimeEpisode[]>;
    /** Whether to merge the provider's episodes with ani.zip metadata, as the provider declares. */
    private usesAniZipEpisodes;
    /**
     * Overlay ani.zip titles, descriptions, images and TVDB numbers onto the provider's episodes. Only
     * numeric ani.zip keys (AniDB regular episodes) take part, so specials (`S1`, `O1`…) never land
     * on a regular episode. The provider's `number` is kept as is.
     */
    private mergeAniZipEpisodes;
    /**
     * @param id AniList id
     * @returns the AniList info without episodes (`fetchEpisodesListById` gives them, `fetchAnimeInfo` both)
     */
    fetchAnilistInfoById: (id: string) => Promise<IAnimeInfo>;
    /** @param id AniList staff id */
    fetchStaffById: (id: number) => Promise<IStaff>;
    /** @param id AniList character id */
    fetchCharacterInfoById: (id: string) => Promise<{
        id: any;
        name: {
            first: any;
            last: any;
            full: any;
            native: any;
            userPreferred: any;
            alternative: any;
            alternativeSpoiler: any;
        };
        image: any;
        description: string;
        gender: any;
        dateOfBirth: {
            year: any;
            month: any;
            day: any;
        };
        bloodType: any;
        age: any;
        hairColor: string | undefined;
        eyeColor: string | undefined;
        height: string | undefined;
        weight: string | undefined;
        occupation: string | undefined;
        partner: {
            id: string | undefined;
            name: string | undefined;
        }[] | undefined;
        relatives: {
            id: string | undefined;
            name: string | undefined;
            relationship: string | undefined;
        }[] | undefined;
        race: string[] | undefined;
        rank: string | undefined;
        previousPosition: string | undefined;
        dislikes: string | undefined;
        sign: string | undefined;
        zodicSign: string | undefined;
        zodicAnimal: string | undefined;
        themeSong: string | undefined;
        relations: any;
    }>;
    /** Maps AniList manga to a manga provider's chapters. */
    static Manga: {
        new (provider?: MangaParser): {
            provider: MangaParser;
            /** @param perPage results per page (default: 20) */
            search: (query: string, page?: number, perPage?: number) => Promise<ISearch<IMangaResult>>;
            /** @param args passed on to the provider's fetchChapterPages */
            fetchChapterPages: (chapterId: string, ...args: any) => Promise<IMangaChapterPage[]>;
            /**
             * The AniList info with the provider's chapters, in the provider's order (reading order, as every
             * manga provider returns them), looked up by the romaji title, then by the English one.
             */
            fetchMangaInfo: (id: string) => Promise<IMangaInfo>;
        };
    };
}
export default Anilist;
//# sourceMappingURL=anilist.d.ts.map