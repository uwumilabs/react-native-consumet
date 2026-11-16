import { MediaStatus, type FuzzyDate, type IAnimeResult, type ITitle } from '../../models';
import { toMediaStatus } from '../common/media-status';

// AniList's GraphQL queries and the mappers for what they return. Each fragment selects what its
// mapper reads, so a field is added to both or neither. Every value goes in the request's
// `variables`, never into the query text, so a search such as `"Fate\stay night"` can't break it.

const PAGE_INFO = 'pageInfo { total perPage currentPage lastPage hasNextPage }';
const TITLE = 'title { userPreferred romaji english native }';
const COVER = 'coverImage { extraLarge large medium color }';
const NEXT_AIRING = 'nextAiringEpisode { airingAt timeUntilAiring episode }';
const TRAILER = 'trailer { id site thumbnail }';
const NAME = 'name { first middle last full native userPreferred }';

/** What mapMediaResult reads. */
const RESULT_FIELDS = `id idMal status(version: 2) ${TITLE} bannerImage ${COVER} description genres averageScore format seasonYear`;
/** What mapBrowseResult reads. */
const BROWSE_FIELDS = `${RESULT_FIELDS} ${TRAILER} episodes ${NEXT_AIRING} duration`;
/** What mapMediaNode reads. */
const NODE_FIELDS = `id idMal ${TITLE} status(version: 2) episodes chapters ${COVER} bannerImage format meanScore`;

export const ADVANCED_SEARCH_QUERY = `query ($page: Int, $id: Int, $type: MediaType, $isAdult: Boolean = false, $search: String, $format: [MediaFormat], $status: MediaStatus, $size: Int, $countryOfOrigin: CountryCode, $source: MediaSource, $season: MediaSeason, $seasonYear: Int, $year: String, $onList: Boolean, $yearLesser: FuzzyDateInt, $yearGreater: FuzzyDateInt, $episodeLesser: Int, $episodeGreater: Int, $durationLesser: Int, $durationGreater: Int, $chapterLesser: Int, $chapterGreater: Int, $volumeLesser: Int, $volumeGreater: Int, $licensedBy: [String], $isLicensed: Boolean, $genres: [String], $excludedGenres: [String], $tags: [String], $excludedTags: [String], $minimumTagRank: Int, $sort: [MediaSort] = [POPULARITY_DESC, SCORE_DESC]) { Page(page: $page, perPage: $size) { ${PAGE_INFO} media(id: $id, type: $type, season: $season, format_in: $format, status: $status, countryOfOrigin: $countryOfOrigin, source: $source, search: $search, onList: $onList, seasonYear: $seasonYear, startDate_like: $year, startDate_lesser: $yearLesser, startDate_greater: $yearGreater, episodes_lesser: $episodeLesser, episodes_greater: $episodeGreater, duration_lesser: $durationLesser, duration_greater: $durationGreater, chapters_lesser: $chapterLesser, chapters_greater: $chapterGreater, volumes_lesser: $volumeLesser, volumes_greater: $volumeGreater, licensedBy_in: $licensedBy, isLicensed: $isLicensed, genre_in: $genres, genre_not_in: $excludedGenres, tag_in: $tags, tag_not_in: $excludedTags, minimumTagRank: $minimumTagRank, sort: $sort, isAdult: $isAdult) { ${RESULT_FIELDS} popularity episodes ${NEXT_AIRING} countryOfOrigin } } }`;

/** Variables: `search`, `page`, `perPage`, `type` (`ANIME` or `MANGA`). */
export const SEARCH_QUERY = `query ($page: Int = 1, $perPage: Int = 15, $type: MediaType = ANIME, $search: String, $isAdult: Boolean = false) { Page(page: $page, perPage: $perPage) { ${PAGE_INFO} media(type: $type, search: $search, isAdult: $isAdult) { ${RESULT_FIELDS} popularity episodes chapters volumes ${NEXT_AIRING} } } }`;

/** One page of anime with `filter` applied; the arguments it declares beyond paging are its variables. */
const browseQuery = (variables: string, filter: string) =>
  `query ($page: Int = 1, $perPage: Int = 20, $type: MediaType = ANIME, $isAdult: Boolean = false, ${variables}) { Page(page: $page, perPage: $perPage) { ${PAGE_INFO} media(type: $type, isAdult: $isAdult, ${filter}) { ${BROWSE_FIELDS} } } }`;

/** Variables: `page`, `perPage`. */
export const TRENDING_QUERY = browseQuery('$sort: [MediaSort] = [TRENDING_DESC, POPULARITY_DESC]', 'sort: $sort');
/** Variables: `page`, `perPage`. */
export const POPULAR_QUERY = browseQuery('$sort: [MediaSort] = [POPULARITY_DESC]', 'sort: $sort');
/** Variables: `genres`, `page`, `perPage`. */
export const GENRES_QUERY = browseQuery('$genres: [String]', 'genre_in: $genres');

/** Variables: `page`, `perPage`, `notYetAired`, and `airingAtGreater` / `airingAtLesser` in Unix seconds. */
export const AIRING_SCHEDULE_QUERY = `query ($page: Int = 1, $perPage: Int = 20, $notYetAired: Boolean, $airingAtGreater: Int, $airingAtLesser: Int) { Page(page: $page, perPage: $perPage) { ${PAGE_INFO} airingSchedules(notYetAired: $notYetAired, airingAt_greater: $airingAtGreater, airingAt_lesser: $airingAtLesser) { airingAt episode media { ${RESULT_FIELDS} countryOfOrigin } } } }`;

/** Variables: `id`. What mapAnimeDetail reads. */
export const MEDIA_DETAIL_QUERY = `query ($id: Int) { Media(id: $id) { id idMal ${TITLE} synonyms countryOfOrigin isLicensed isAdult ${COVER} startDate { year month day } endDate { year month day } bannerImage season description format status(version: 2) episodes duration ${TRAILER} genres averageScore popularity ${NEXT_AIRING} characters(sort: ROLE) { edges { role node { id ${NAME} image { large medium } } voiceActors(sort: LANGUAGE) { id languageV2 ${NAME} image { large medium } } } } recommendations { edges { node { id mediaRecommendation { ${NODE_FIELDS} } } } } relations { edges { id relationType node { ${NODE_FIELDS} } } } studios(isMain: true) { edges { isMain node { id name } } } } }`;

/** Variables: `id`. What fetchEpisodesListById needs to find the anime on the provider. */
export const EPISODES_MEDIA_QUERY = `query ($id: Int) { Media(id: $id) { idMal format ${TITLE} coverImage { extraLarge large medium } } }`;

/** Variables: `id`. */
export const CHARACTER_QUERY = `query character($id: Int) { Character(id: $id) { id name { first middle last full native userPreferred alternative alternativeSpoiler } image { large medium } description gender dateOfBirth { year month day } bloodType age favourites media { edges { characterRole node { id idMal title { romaji english native userPreferred } coverImage { extraLarge large medium color } averageScore startDate { year month day } episodes format status(version: 2) } } } } }`;

/** Variables: `id`. */
export const STAFF_QUERY = `query ($id: Int) { Staff(id: $id) { id name { first last native full } image { large medium } description siteUrl staffMedia { edges { id node { id title { romaji english native } type coverImage { extraLarge large medium color } } } } } }`;

/** AniList's legacy weekday numbering, which fetchAiringSchedule accepts: 0 = Saturday … 6 = Friday. */
export const WEEKDAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** AniList's `status(version: 2)` as a MediaStatus. Every media has one, so a missing status is UNKNOWN. */
export const mapStatus = (status: unknown): MediaStatus =>
  toMediaStatus(typeof status === 'string' ? status : undefined, MediaStatus) ?? MediaStatus.UNKNOWN;

type CoverImage = { extraLarge?: string | null; large?: string | null; medium?: string | null } | null | undefined;

/** The largest of AniList's cover (poster) images. */
export const pickCover = (coverImage: CoverImage): string | undefined =>
  coverImage?.extraLarge ?? coverImage?.large ?? coverImage?.medium ?? undefined;

/** The value of `cover`: the banner, or the cover image for media without one. */
const bannerOrCover = (media: { bannerImage?: string | null; coverImage?: CoverImage }): string | undefined =>
  media.bannerImage ?? pickCover(media.coverImage);

export const mapTitle = (title: any): ITitle => ({
  romaji: title?.romaji,
  english: title?.english,
  native: title?.native,
  userPreferred: title?.userPreferred,
});

const mapName = (name: any) => ({
  first: name?.first,
  last: name?.last,
  full: name?.full,
  native: name?.native,
  userPreferred: name?.userPreferred,
});

const mapFuzzyDate = (date: any): FuzzyDate => ({ year: date?.year, month: date?.month, day: date?.day });

/**
 * `totalEpisodes`: the episode count, or the episodes aired so far when AniList has no count yet.
 * `currentEpisode`: the episodes aired so far, or the count once nothing is left to air.
 */
export const episodeCounts = (media: any): { totalEpisodes?: number; currentEpisode?: number } => {
  const aired = media.nextAiringEpisode?.episode ? media.nextAiringEpisode.episode - 1 : undefined;
  return { totalEpisodes: media.episodes ?? aired, currentEpisode: aired ?? media.episodes ?? undefined };
};

/** The fields every list result (search, trending, the airing schedule…) shares. */
export const mapMediaResult = (media: any) => ({
  id: String(media.id),
  malId: media.idMal,
  title: mapTitle(media.title),
  status: mapStatus(media.status),
  image: pickCover(media.coverImage),
  cover: bannerOrCover(media),
  color: media.coverImage?.color,
  description: media.description,
  genres: media.genres,
  rating: media.averageScore,
  type: media.format,
  releaseDate: media.seasonYear,
});

/** A trending, popular or by-genre result. */
export const mapBrowseResult = (media: any): IAnimeResult => ({
  ...mapMediaResult(media),
  trailer: { id: media.trailer?.id, site: media.trailer?.site, thumbnail: media.trailer?.thumbnail },
  totalEpisodes: episodeCounts(media).totalEpisodes,
  duration: media.duration,
});

/**
 * Media inside another media's details (a recommendation or a relation), in one shape for anime
 * and manga. AniList sends `null` for media it hides, which maps to `undefined`.
 */
const mapMediaNode = (node: any): IAnimeResult | undefined =>
  node
    ? {
        id: node.id,
        malId: node.idMal,
        title: mapTitle(node.title),
        status: mapStatus(node.status),
        episodes: node.episodes,
        chapters: node.chapters,
        image: pickCover(node.coverImage),
        cover: bannerOrCover(node),
        color: node.coverImage?.color,
        rating: node.meanScore,
        type: node.format,
      }
    : undefined;

const mapRecommendations = (media: any): IAnimeResult[] | undefined =>
  media.recommendations?.edges?.flatMap((edge: any) => mapMediaNode(edge?.node?.mediaRecommendation) ?? []);

const mapRelations = (media: any): IAnimeResult[] | undefined =>
  media.relations?.edges?.flatMap((edge: any) => {
    const node = mapMediaNode(edge?.node);
    return node ? [{ ...node, relationType: edge.relationType }] : [];
  });

const mapCharacters = (media: any) =>
  media.characters?.edges?.map((edge: any) => ({
    id: edge.node?.id,
    role: edge.role,
    name: mapName(edge.node?.name),
    image: edge.node?.image?.large ?? edge.node?.image?.medium,
    voiceActors: (edge.voiceActors ?? []).map((voiceActor: any) => ({
      id: voiceActor.id,
      language: voiceActor.languageV2,
      name: mapName(voiceActor.name),
      image: voiceActor.image?.large ?? voiceActor.image?.medium,
    })),
  }));

/** The details fetchAnimeInfo, fetchAnilistInfoById and Manga.fetchMangaInfo share. */
export const mapMediaDetail = (media: any) => ({
  malId: media.idMal,
  title: mapTitle(media.title),
  synonyms: media.synonyms,
  isLicensed: media.isLicensed ?? undefined,
  isAdult: media.isAdult ?? undefined,
  countryOfOrigin: media.countryOfOrigin ?? undefined,
  ...(media.trailer?.id
    ? { trailer: { id: media.trailer.id, site: media.trailer.site, thumbnail: media.trailer.thumbnail } }
    : {}),
  image: pickCover(media.coverImage),
  popularity: media.popularity,
  color: media.coverImage?.color,
  cover: bannerOrCover(media),
  description: media.description,
  status: mapStatus(media.status),
  releaseDate: media.startDate?.year,
  startDate: mapFuzzyDate(media.startDate),
  endDate: mapFuzzyDate(media.endDate),
  rating: media.averageScore,
  genres: media.genres,
  season: media.season,
  studios: media.studios?.edges?.map((edge: any) => edge.node.name),
  type: media.format,
  recommendations: mapRecommendations(media),
  characters: mapCharacters(media),
  relations: mapRelations(media),
});

/** mapMediaDetail plus the airing and episode fields of an anime. */
export const mapAnimeDetail = (media: any) => ({
  ...mapMediaDetail(media),
  ...(media.nextAiringEpisode?.airingAt
    ? {
        nextAiringEpisode: {
          airingTime: media.nextAiringEpisode.airingAt,
          timeUntilAiring: media.nextAiringEpisode.timeUntilAiring,
          episode: media.nextAiringEpisode.episode,
        },
      }
    : {}),
  ...episodeCounts(media),
  duration: media.duration,
});

/** A character's media, from the character query. */
export const mapCharacterMedia = (edge: any) => ({
  id: edge.node.id,
  malId: edge.node.idMal,
  role: edge.characterRole,
  title: mapTitle(edge.node.title),
  status: mapStatus(edge.node.status),
  episodes: edge.node.episodes,
  image: pickCover(edge.node.coverImage),
  rating: edge.node.averageScore,
  releaseDate: edge.node.startDate?.year,
  type: edge.node.format,
  color: edge.node.coverImage?.color,
});
