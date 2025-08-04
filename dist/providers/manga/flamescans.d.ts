import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage } from '../../models';
declare class FlameScans extends MangaParser {
    readonly name = "FlameScans";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /**
     *
     * @param query Search query
     *
     */
    search: (query: string) => Promise<ISearch<IMangaResult>>;
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
}
export default FlameScans;
//# sourceMappingURL=flamescans.d.ts.map