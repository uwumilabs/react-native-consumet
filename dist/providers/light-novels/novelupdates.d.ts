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
    /** Requests a page as text through the context axios. */
    private requestText;
    /**
     * @param lightNovelUrl light novel URL or id
     * @param _chapterPage ignored: NovelUpdates lists every chapter in one request. Kept so existing calls compile.
     */
    fetchLightNovelInfo: (lightNovelUrl: string, _chapterPage?: number) => Promise<ILightNovelInfo>;
    private fetchChapters;
    /** @param chapterId chapter id or URL */
    fetchChapterContent: (chapterId: string) => Promise<ILightNovelChapterContent>;
    search: (query: string) => Promise<ISearch<ILightNovelResult>>;
}
//# sourceMappingURL=novelupdates.d.ts.map