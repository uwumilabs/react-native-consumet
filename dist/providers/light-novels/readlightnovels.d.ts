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
     * @param lightNovelUrl light novel URL or id
     * @param chapterPage one page of the chapter list, counting from 1 (default: every page)
     */
    fetchLightNovelInfo: (lightNovelUrl: string, chapterPage?: number) => Promise<ILightNovelInfo>;
    private fetchChapters;
    private fetchAllChapters;
    /** @param chapterId chapter id or URL */
    fetchChapterContent: (chapterId: string) => Promise<ILightNovelChapterContent>;
    search: (query: string) => Promise<ISearch<ILightNovelResult>>;
}
//# sourceMappingURL=readlightnovels.d.ts.map