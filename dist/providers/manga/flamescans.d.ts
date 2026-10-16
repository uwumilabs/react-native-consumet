import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage, type ProviderContext } from '../../models';
export declare class FlameScans extends MangaParser {
    private readonly ctx;
    readonly name = "FlameScans";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /**
     *
     * @param query Search query
     *
     */
    search: (query: string) => Promise<ISearch<IMangaResult>>;
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
}
//# sourceMappingURL=flamescans.d.ts.map