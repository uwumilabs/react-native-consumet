import { type IMangaChapterPage, type IMangaInfo, type IMangaResult, type ISearch, MangaParser } from '../../models';
/**
 * Not working, and not exported from `MANGA`: readmanga.app doesn't respond, which hasn't been
 * confirmed as a permanent shutdown. Kept so it can be restored if the site comes back; delete it
 * if it doesn't.
 */
declare class ReadManga extends MangaParser {
    readonly name = "ReadManga";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    readonly isWorking = false;
    protected darkLogo: string;
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
export default ReadManga;
//# sourceMappingURL=readmanga.d.ts.map