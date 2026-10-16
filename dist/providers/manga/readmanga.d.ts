import { type IMangaChapterPage, type IMangaInfo, type IMangaResult, type ISearch, MangaParser, type ProviderContext } from '../../models';
/**
 * Not working, and not exported from `MANGA`: readmanga.app doesn't respond, which hasn't been
 * confirmed as a permanent shutdown. Kept so it can be restored if the site comes back; delete it
 * if it doesn't.
 */
export declare class ReadManga extends MangaParser {
    private readonly ctx;
    readonly name = "ReadManga";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    readonly isWorking = false;
    protected darkLogo: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /**
     *
     * @param query Search query
     */
    search: (query: string) => Promise<ISearch<IMangaResult>>;
    fetchNewManga: (page?: number) => Promise<ISearch<IMangaResult>>;
    fetchTopRatedManga: (page?: number) => Promise<ISearch<IMangaResult>>;
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
    private getRankingTitleCardData;
    private getTotalPages;
    private formatSearchResultData;
    private getStatus;
}
//# sourceMappingURL=readmanga.d.ts.map