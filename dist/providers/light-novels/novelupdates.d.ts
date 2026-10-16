import { LightNovelParser, type ISearch, type ILightNovelInfo, type ILightNovelChapterContent, type ILightNovelResult, type ProviderContext } from '../../models';
export declare class NovelUpdates extends LightNovelParser {
    private readonly ctx;
    readonly name = "NovelUpdates";
    protected baseUrl: string;
    private proxyURL;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /** Requests a page as text through the context axios. Like fetch, any status returns the body. */
    private requestText;
    /**
     *
     * @param lightNovelUrl light novel link or id
     * @param chapterPage chapter page number (optional) if not provided, will fetch all chapter pages.
     */
    fetchLightNovelInfo: (lightNovelUrl: string, chapterPage?: number) => Promise<ILightNovelInfo>;
    private fetchChapters;
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
//# sourceMappingURL=novelupdates.d.ts.map