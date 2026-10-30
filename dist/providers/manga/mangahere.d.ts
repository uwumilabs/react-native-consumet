import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage, type ProviderContext } from '../../models';
export declare class MangaHere extends MangaParser {
    private readonly ctx;
    readonly name = "MangaHere";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /** Covers and page images are refused (403) without a MangaHere Referer. */
    private get imageHeaders();
    /**
     * GET with the cookie that opens titles marked adult. withCredentials: false keeps React Native's
     * native cookie jar from replacing that Cookie header on Android.
     */
    private request;
    private absoluteUrl;
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
    /**
     * The page-by-page reader loads each image from chapterfun.ashx, whose packed answer names the
     * image of the page asked for and of the page after it; so every other page is asked for, then any
     * page still missing on its own.
     */
    private fetchReaderImages;
    /** The image URLs one chapterfun.ashx answer names, retried (with an empty key) when it is empty. */
    private fetchChapterFun;
    search: (query: string, page?: number) => Promise<ISearch<IMangaResult>>;
}
//# sourceMappingURL=mangahere.d.ts.map