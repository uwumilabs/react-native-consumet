import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage, type ProviderContext } from '../../models';
export declare class AsuraScans extends MangaParser {
    private readonly ctx;
    readonly name = "AsuraScans";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
    /**
     *
     * @param query Search query
     */
    search: (query: string, page?: number) => Promise<ISearch<IMangaResult>>;
    private determineMediaState;
}
//# sourceMappingURL=asurascans.d.ts.map