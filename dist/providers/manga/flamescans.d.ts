import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage, type ProviderContext } from '../../models';
/**
 * Flame Comics (https://flamecomics.xyz), the scanlation group formerly at flamescans.org. The site
 * is a Next.js app: every page's data comes as JSON from `/_next/data/<buildId>/<page>.json`.
 */
export declare class FlameScans extends MangaParser {
    private readonly ctx;
    readonly name = "FlameComics";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    private buildIdRequest?;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /**
     * The site has no search endpoint: its browse page lists every series, and this keeps the ones
     * whose title has every word of the query. All matches come on page 1.
     *
     * @param query Search query
     * @param page Page number (default 1)
     */
    search: (query: string, page?: number) => Promise<ISearch<IMangaResult>>;
    /** @param mangaId series id from `search` (`"101"`) */
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    /** @param chapterId chapter id from `fetchMangaInfo` (`"101/327c2f17ef9cacd3"`: series id / chapter token) */
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
    private toResult;
    private toChapter;
    /** `pageProps` of a site page (`browse`, `series/101`), from its Next.js data route. */
    private nextData;
    /** The site's current Next.js build id, from the home page (looked up once, then reused). */
    private buildId;
}
//# sourceMappingURL=flamescans.d.ts.map