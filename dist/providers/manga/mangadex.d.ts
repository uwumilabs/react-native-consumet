import { type IMangaChapterPage, type IMangaInfo, type IMangaResult, type ISearch, MangaParser, type ProviderContext } from '../../models';
export declare class MangaDex extends MangaParser {
    private readonly ctx;
    readonly name = "MangaDex";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    private readonly apiUrl;
    private readonly uploadsUrl;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /**
     * @param mangaId manga id (a UUID, from a search result)
     * @param lang language of the chapters to list, as MangaDex codes it (default: `en`; e.g. `pt-br`, `es-la`)
     */
    fetchMangaInfo: (mangaId: string, lang?: string) => Promise<IMangaInfo>;
    /**
     * The chapter's pages, from the MangaDex@Home server MangaDex assigns to it.
     * @param chapterId chapter id (from `fetchMangaInfo`)
     * @param dataSaver smaller, compressed images (default: `false`)
     */
    fetchChapterPages: (chapterId: string, dataSaver?: boolean) => Promise<IMangaChapterPage[]>;
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
    /** One page of `/manga` with the given filters, covers included. */
    private fetchList;
    /** Every readable chapter in `lang`, in the feed's order (volume, then chapter). */
    private fetchChapters;
    /** A title from `/manga`; `thumbnail` picks the 512 px cover instead of the full-size one. */
    private toResult;
    private toChapter;
    /** Names of the title's authors or artists (included with the request), without repeats. */
    private relatedNames;
    private tagNames;
    /** The API's own error message when it sent one (e.g. `Manga ... not found.`). */
    private error;
}
//# sourceMappingURL=mangadex.d.ts.map