import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage } from '../../models';
declare class MangaKakalot extends MangaParser {
    readonly name = "MangaKakalot";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string, mangaId: string) => Promise<IMangaChapterPage[]>;
    /**
     *
     * @param query Search query
     */
    search: (query: string) => Promise<ISearch<IMangaResult>>;
}
export default MangaKakalot;
//# sourceMappingURL=mangakakalot.d.ts.map