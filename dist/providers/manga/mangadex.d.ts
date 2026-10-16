import { type IMangaChapterPage, type IMangaInfo, type IMangaResult, type ISearch, MangaParser, type ProviderContext } from '../../models';
export declare class MangaDex extends MangaParser {
    private readonly ctx;
    readonly name = "MangaDex";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    private readonly apiUrl;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    /**
     * @currently only supports english
     */
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
    /**
     * @param query search query
     * @param page page number (default: 1)
     * @param limit limit of results to return (default: 20) (max: 100) (min: 1)
     */
    search: (query: string, page?: number, limit?: number) => Promise<ISearch<IMangaResult>>;
    fetchRandom: () => Promise<ISearch<IMangaResult>>;
    fetchRecentlyAdded: (page?: number, limit?: number) => Promise<ISearch<IMangaResult>>;
    fetchLatestUpdates: (page?: number, limit?: number) => Promise<ISearch<IMangaResult>>;
    fetchPopular: (page?: number, limit?: number) => Promise<ISearch<IMangaResult>>;
    private fetchAllChapters;
    private fetchCoverImage;
}
//# sourceMappingURL=mangadex.d.ts.map