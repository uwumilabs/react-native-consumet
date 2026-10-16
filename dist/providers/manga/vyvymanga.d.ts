import { type IMangaChapterPage, type IMangaInfo, type IMangaResult, type ISearch, MangaParser, type ProviderContext } from '../../models';
export declare class VyvyManga extends MangaParser {
    private readonly ctx;
    readonly name: string;
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    protected baseWebsiteUrl: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    search: (query: string, page?: number) => Promise<ISearch<IMangaResult>>;
    searchApi: (query: string) => Promise<ISearch<IMangaResult>>;
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
    private formatSearchResultData;
}
//# sourceMappingURL=vyvymanga.d.ts.map