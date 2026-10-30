import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage, type ProviderContext } from '../../models';
export declare class MangaPill extends MangaParser {
    private readonly ctx;
    readonly name = "MangaPill";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /**
     * @param query Search query
     * @param page Page number (default: `1`); the site lists 50 titles a page
     */
    search: (query: string, page?: number) => Promise<ISearch<IMangaResult>>;
    /**
     * @param mangaId Manga id from the search results (e.g. `2/one-piece`)
     */
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    /**
     * @param chapterId Chapter id from the manga info (e.g. `2-11069000/one-piece-chapter-1069`)
     */
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
    /** The site lists chapters newest first; they are returned first chapter first. */
    private parseChapters;
    /** The image CDN answers 403 to requests without a MangaPill Referer, covers and pages alike. */
    private imageHeaders;
    /** `/manga/2/one-piece` → `2/one-piece`. */
    private mangaId;
    /** Image URLs are absolute today; resolve site-relative ones anyway (Hermes' global URL is incomplete). */
    private absoluteUrl;
}
//# sourceMappingURL=mangapill.d.ts.map