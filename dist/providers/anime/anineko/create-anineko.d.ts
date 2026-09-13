import { type ISearch, type IAnimeInfo, type IAnimeResult, type ISource, type IEpisodeServer, type StreamingServers, type SubOrDub, type ProviderContext } from '../../../models';
declare function createAniNeko(ctx: ProviderContext, customBaseURL?: string): {
    GENRES: readonly ["Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", "Ecchi", "Fantasy", "Game", "Harem", "Historical", "Horror", "Isekai", "Josei", "Kids", "Magic", "Mahou Shoujo", "Martial Arts", "Mecha", "Military", "Music", "Mystery", "Parody", "Police", "Psychological", "Romance", "Samurai", "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai", "Slice of Life", "Space", "Sports", "Super Power", "Supernatural", "Thriller", "Vampire"];
    TYPES: {
        readonly TV: "1";
        readonly Movie: "2";
        readonly OVA: "3";
        readonly ONA: "4";
        readonly Special: "5";
        readonly Music: "6";
        readonly TV_SHORT: "7";
    };
    STATUS: {
        readonly Ongoing: "Ongoing";
        readonly Completed: "Completed";
        readonly Upcoming: "Upcoming";
    };
    LANGUAGE: {
        readonly Subbed: "Subbed";
        readonly Dubbed: "Dubbed";
    };
    SORT: {
        readonly LatestUpdate: "recently_updated";
        readonly ReleaseDate: "release_date";
        readonly RecentlyAdded: "recently_added";
        readonly TitleAZ: "title_az";
    };
    search: (query: string, page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchRecentlyUpdated: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchNewReleases: (page?: number) => Promise<ISearch<IAnimeResult>>;
    fetchRecentlyAdded: (page?: number) => Promise<ISearch<IAnimeResult>>;
    genreSearch: (genre: string, page?: number, extra?: {
        type?: string;
        status?: string;
        language?: string;
        year?: string | number;
    }) => Promise<ISearch<IAnimeResult>>;
    fetchAnimeInfo: (id: string) => Promise<IAnimeInfo>;
    fetchEpisodeServers: (episodeId: string, subOrDub?: SubOrDub) => Promise<IEpisodeServer[]>;
    fetchEpisodeSources: (episodeId: string, server: StreamingServers, subOrDub?: SubOrDub) => Promise<ISource>;
    name: string;
    languages: string[] | string;
    classPath: string;
    baseUrl: string;
    isNSFW: boolean;
    logo: string;
    isWorking?: boolean;
    isDubAvailableSeparately?: boolean;
};
export type AniNekoProviderInstance = ReturnType<typeof createAniNeko>;
export default createAniNeko;
//# sourceMappingURL=create-anineko.d.ts.map