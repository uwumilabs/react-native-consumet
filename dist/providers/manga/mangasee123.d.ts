import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage } from '../../models';
declare class Mangasee123 extends MangaParser {
    readonly name = "MangaSee";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    fetchMangaInfo: (mangaId: string, ...args: any) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string, ...args: any) => Promise<IMangaChapterPage[]>;
    search: (query: string, ...args: any[]) => Promise<ISearch<IMangaResult>>;
    private processScriptTagVariable;
    private processChapterNumber;
    private processChapterForImageUrl;
}
export default Mangasee123;
//# sourceMappingURL=mangasee123.d.ts.map