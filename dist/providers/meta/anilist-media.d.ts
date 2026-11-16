import { MediaStatus, type FuzzyDate, type IAnimeResult, type ITitle } from '../../models';
export declare const ADVANCED_SEARCH_QUERY = "query ($page: Int, $id: Int, $type: MediaType, $isAdult: Boolean = false, $search: String, $format: [MediaFormat], $status: MediaStatus, $size: Int, $countryOfOrigin: CountryCode, $source: MediaSource, $season: MediaSeason, $seasonYear: Int, $year: String, $onList: Boolean, $yearLesser: FuzzyDateInt, $yearGreater: FuzzyDateInt, $episodeLesser: Int, $episodeGreater: Int, $durationLesser: Int, $durationGreater: Int, $chapterLesser: Int, $chapterGreater: Int, $volumeLesser: Int, $volumeGreater: Int, $licensedBy: [String], $isLicensed: Boolean, $genres: [String], $excludedGenres: [String], $tags: [String], $excludedTags: [String], $minimumTagRank: Int, $sort: [MediaSort] = [POPULARITY_DESC, SCORE_DESC]) { Page(page: $page, perPage: $size) { pageInfo { total perPage currentPage lastPage hasNextPage } media(id: $id, type: $type, season: $season, format_in: $format, status: $status, countryOfOrigin: $countryOfOrigin, source: $source, search: $search, onList: $onList, seasonYear: $seasonYear, startDate_like: $year, startDate_lesser: $yearLesser, startDate_greater: $yearGreater, episodes_lesser: $episodeLesser, episodes_greater: $episodeGreater, duration_lesser: $durationLesser, duration_greater: $durationGreater, chapters_lesser: $chapterLesser, chapters_greater: $chapterGreater, volumes_lesser: $volumeLesser, volumes_greater: $volumeGreater, licensedBy_in: $licensedBy, isLicensed: $isLicensed, genre_in: $genres, genre_not_in: $excludedGenres, tag_in: $tags, tag_not_in: $excludedTags, minimumTagRank: $minimumTagRank, sort: $sort, isAdult: $isAdult) { id idMal status(version: 2) title { userPreferred romaji english native } bannerImage coverImage { extraLarge large medium color } description genres averageScore format seasonYear popularity episodes nextAiringEpisode { airingAt timeUntilAiring episode } countryOfOrigin } } }";
/** Variables: `search`, `page`, `perPage`, `type` (`ANIME` or `MANGA`). */
export declare const SEARCH_QUERY = "query ($page: Int = 1, $perPage: Int = 15, $type: MediaType = ANIME, $search: String, $isAdult: Boolean = false) { Page(page: $page, perPage: $perPage) { pageInfo { total perPage currentPage lastPage hasNextPage } media(type: $type, search: $search, isAdult: $isAdult) { id idMal status(version: 2) title { userPreferred romaji english native } bannerImage coverImage { extraLarge large medium color } description genres averageScore format seasonYear popularity episodes chapters volumes nextAiringEpisode { airingAt timeUntilAiring episode } } } }";
/** Variables: `page`, `perPage`. */
export declare const TRENDING_QUERY: string;
/** Variables: `page`, `perPage`. */
export declare const POPULAR_QUERY: string;
/** Variables: `genres`, `page`, `perPage`. */
export declare const GENRES_QUERY: string;
/** Variables: `page`, `perPage`, `notYetAired`, and `airingAtGreater` / `airingAtLesser` in Unix seconds. */
export declare const AIRING_SCHEDULE_QUERY = "query ($page: Int = 1, $perPage: Int = 20, $notYetAired: Boolean, $airingAtGreater: Int, $airingAtLesser: Int) { Page(page: $page, perPage: $perPage) { pageInfo { total perPage currentPage lastPage hasNextPage } airingSchedules(notYetAired: $notYetAired, airingAt_greater: $airingAtGreater, airingAt_lesser: $airingAtLesser) { airingAt episode media { id idMal status(version: 2) title { userPreferred romaji english native } bannerImage coverImage { extraLarge large medium color } description genres averageScore format seasonYear countryOfOrigin } } } }";
/** Variables: `id`. What mapAnimeDetail reads. */
export declare const MEDIA_DETAIL_QUERY = "query ($id: Int) { Media(id: $id) { id idMal title { userPreferred romaji english native } synonyms countryOfOrigin isLicensed isAdult coverImage { extraLarge large medium color } startDate { year month day } endDate { year month day } bannerImage season description format status(version: 2) episodes duration trailer { id site thumbnail } genres averageScore popularity nextAiringEpisode { airingAt timeUntilAiring episode } characters(sort: ROLE) { edges { role node { id name { first middle last full native userPreferred } image { large medium } } voiceActors(sort: LANGUAGE) { id languageV2 name { first middle last full native userPreferred } image { large medium } } } } recommendations { edges { node { id mediaRecommendation { id idMal title { userPreferred romaji english native } status(version: 2) episodes chapters coverImage { extraLarge large medium color } bannerImage format meanScore } } } } relations { edges { id relationType node { id idMal title { userPreferred romaji english native } status(version: 2) episodes chapters coverImage { extraLarge large medium color } bannerImage format meanScore } } } studios(isMain: true) { edges { isMain node { id name } } } } }";
/** Variables: `id`. What fetchEpisodesListById needs to find the anime on the provider. */
export declare const EPISODES_MEDIA_QUERY = "query ($id: Int) { Media(id: $id) { idMal format title { userPreferred romaji english native } coverImage { extraLarge large medium } } }";
/** Variables: `id`. */
export declare const CHARACTER_QUERY = "query character($id: Int) { Character(id: $id) { id name { first middle last full native userPreferred alternative alternativeSpoiler } image { large medium } description gender dateOfBirth { year month day } bloodType age favourites media { edges { characterRole node { id idMal title { romaji english native userPreferred } coverImage { extraLarge large medium color } averageScore startDate { year month day } episodes format status(version: 2) } } } } }";
/** Variables: `id`. */
export declare const STAFF_QUERY = "query ($id: Int) { Staff(id: $id) { id name { first last native full } image { large medium } description siteUrl staffMedia { edges { id node { id title { romaji english native } type coverImage { extraLarge large medium color } } } } } }";
/** AniList's legacy weekday numbering, which fetchAiringSchedule accepts: 0 = Saturday … 6 = Friday. */
export declare const WEEKDAYS: string[];
/** AniList's `status(version: 2)` as a MediaStatus. Every media has one, so a missing status is UNKNOWN. */
export declare const mapStatus: (status: unknown) => MediaStatus;
type CoverImage = {
    extraLarge?: string | null;
    large?: string | null;
    medium?: string | null;
} | null | undefined;
/** The largest of AniList's cover (poster) images. */
export declare const pickCover: (coverImage: CoverImage) => string | undefined;
export declare const mapTitle: (title: any) => ITitle;
/**
 * `totalEpisodes`: the episode count, or the episodes aired so far when AniList has no count yet.
 * `currentEpisode`: the episodes aired so far, or the count once nothing is left to air.
 */
export declare const episodeCounts: (media: any) => {
    totalEpisodes?: number;
    currentEpisode?: number;
};
/** The fields every list result (search, trending, the airing schedule…) shares. */
export declare const mapMediaResult: (media: any) => {
    id: string;
    malId: any;
    title: ITitle;
    status: MediaStatus;
    image: string | undefined;
    cover: string | undefined;
    color: any;
    description: any;
    genres: any;
    rating: any;
    type: any;
    releaseDate: any;
};
/** A trending, popular or by-genre result. */
export declare const mapBrowseResult: (media: any) => IAnimeResult;
/** The details fetchAnimeInfo, fetchAnilistInfoById and Manga.fetchMangaInfo share. */
export declare const mapMediaDetail: (media: any) => {
    image: string | undefined;
    popularity: any;
    color: any;
    cover: string | undefined;
    description: any;
    status: MediaStatus;
    releaseDate: any;
    startDate: FuzzyDate;
    endDate: FuzzyDate;
    rating: any;
    genres: any;
    season: any;
    studios: any;
    type: any;
    recommendations: IAnimeResult[] | undefined;
    characters: any;
    relations: IAnimeResult[] | undefined;
    trailer?: {
        id: any;
        site: any;
        thumbnail: any;
    } | undefined;
    malId: any;
    title: ITitle;
    synonyms: any;
    isLicensed: any;
    isAdult: any;
    countryOfOrigin: any;
};
/** mapMediaDetail plus the airing and episode fields of an anime. */
export declare const mapAnimeDetail: (media: any) => {
    duration: any;
    totalEpisodes?: number;
    currentEpisode?: number;
    nextAiringEpisode?: {
        airingTime: any;
        timeUntilAiring: any;
        episode: any;
    } | undefined;
    image: string | undefined;
    popularity: any;
    color: any;
    cover: string | undefined;
    description: any;
    status: MediaStatus;
    releaseDate: any;
    startDate: FuzzyDate;
    endDate: FuzzyDate;
    rating: any;
    genres: any;
    season: any;
    studios: any;
    type: any;
    recommendations: IAnimeResult[] | undefined;
    characters: any;
    relations: IAnimeResult[] | undefined;
    trailer?: {
        id: any;
        site: any;
        thumbnail: any;
    } | undefined;
    malId: any;
    title: ITitle;
    synonyms: any;
    isLicensed: any;
    isAdult: any;
    countryOfOrigin: any;
};
/** A character's media, from the character query. */
export declare const mapCharacterMedia: (edge: any) => {
    id: any;
    malId: any;
    role: any;
    title: ITitle;
    status: MediaStatus;
    episodes: any;
    image: string | undefined;
    rating: any;
    releaseDate: any;
    type: any;
    color: any;
};
export {};
//# sourceMappingURL=anilist-media.d.ts.map