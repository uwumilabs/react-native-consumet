import { LightNovelParser, type ISearch, type ILightNovelInfo, type ILightNovelChapterContent, type ILightNovelResult, type ProviderContext } from '../../models';
export declare class ReadLightNovels extends LightNovelParser {
    private readonly ctx;
    readonly name = "Read Light Novels";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /**
     *
     * @param lightNovelUrl light novel link or id
     * @param chapterPage chapter page number (optional) if not provided, will fetch all chapter pages.
     */
    fetchLightNovelInfo: (lightNovelUrl: string, chapterPage?: number) => Promise<ILightNovelInfo>;
    private fetchChapters;
    private fetchAllChapters;
    /**
     *
     * @param chapterId chapter id or url
     */
    fetchChapterContent: (chapterId: string) => Promise<ILightNovelChapterContent>;
    /**
     *
     * @param query search query string
     */
    search: (query: string) => Promise<ISearch<ILightNovelResult>>;
}
//# sourceMappingURL=readlightnovels.d.ts.map