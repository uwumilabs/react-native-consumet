import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage, type ProviderContext } from '../../models';
export declare class Mangapark extends MangaParser {
    private readonly ctx;
    readonly name = "Mangapark";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    fetchMangaInfo: (mangaId: string, ...args: any) => Promise<IMangaInfo>;
    fetchChapterPages: (chapterId: string, ...args: any) => Promise<IMangaChapterPage[]>;
    search: (query: string, page?: number, ...args: any[]) => Promise<ISearch<IMangaResult>>;
}
//# sourceMappingURL=mangapark.d.ts.map