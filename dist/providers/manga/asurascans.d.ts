import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage, type ProviderContext } from '../../models';
/**
 * AsuraScans (asurascans.com, formerly asuracomic.net). Ids are the site's series slug
 * (`omniscient-readers-viewpoint`) and `<slug>/chapter/<number>` for chapters.
 */
export declare class AsuraScans extends MangaParser {
    private readonly ctx;
    readonly name = "AsuraScans";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /**
     * @param query Search query
     * @param page Page number (default: 1), 20 results per page
     */
    search: (query: string, page?: number) => Promise<ISearch<IMangaResult>>;
    /** @param mangaId series slug from `search` (`series/<slug>-<hash>` ids from asuracomic.net work too) */
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    /** @param chapterId chapter id from `fetchMangaInfo` (`<slug>/chapter/<number>`) */
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
    /** GET a path of the JSON API; failures carry the API's own error message. */
    private api;
    /** The fields search, info and recommendations share. */
    private toResult;
    private absolute;
}
//# sourceMappingURL=asurascans.d.ts.map