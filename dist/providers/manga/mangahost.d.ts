import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage, type ProviderContext } from '../../models';
export declare class MangaHost extends MangaParser {
    private readonly ctx;
    readonly name = "MangaHost";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    fetchChapterPages: (mangaId: string, chapterId: string) => Promise<IMangaChapterPage[]>;
    /**
     *
     * @param query Search query
     */
    search: (query: string) => Promise<ISearch<IMangaResult>>;
}
//# sourceMappingURL=mangahost.d.ts.map