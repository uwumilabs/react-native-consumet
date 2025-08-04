import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage } from '../../models';
declare class MangaReader extends MangaParser {
    readonly name = "MangaReader";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /**
     *
     * @param query Search query
     */
    search: (query: string) => Promise<ISearch<IMangaResult>>;
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
}
export default MangaReader;
//# sourceMappingURL=mangareader.d.ts.map