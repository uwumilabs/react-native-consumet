import { MangaParser, type ISearch, type IMangaInfo, type IMangaResult, type IMangaChapterPage, type ProviderContext } from '../../models';
export declare class MangaKakalot extends MangaParser {
    private readonly ctx;
    readonly name = "MangaKakalot";
    protected baseUrl: string;
    protected logo: string;
    protected classPath: string;
    /** @param ctx provider context; requests go through its axios (default: `createProviderContext()`) */
    constructor(ctx?: ProviderContext);
    /**
     * Covers and pages are on 2xstorage.com, which answers 403 unless the Referer is the site's
     * origin (exactly `https://www.kakamanga.com/`; a page URL is refused too).
     */
    private imageHeaders;
    private absoluteUrl;
    /** The title's slug (its id) in `https://www.kakamanga.com/manga/<slug>`. */
    private slugFromUrl;
    /**
     * @param query Search query
     * @param page Page number (default: 1)
     */
    search: (query: string, page?: number) => Promise<ISearch<IMangaResult>>;
    /** The JSON form of a search page: `[{ name, url, thumb, slug, ... }]`, with no pagination. */
    private searchFromJson;
    private searchResult;
    /** @param mangaId the title's slug, e.g. `tomodachi-game` (from search results) */
    fetchMangaInfo: (mangaId: string) => Promise<IMangaInfo>;
    /** @param chapterId `<title slug>/<chapter slug>`, e.g. `tomodachi-game/chapter-127-5` */
    fetchChapterPages: (chapterId: string) => Promise<IMangaChapterPage[]>;
    /**
     * The synopsis under the `<title> summary:` heading, as plain text. Some titles store it as
     * escaped HTML (`&amp;quot;`, `&lt;br&gt;`), so its text is read as HTML once more: whitespace
     * collapses as a browser would and `<br>` breaks lines.
     */
    private description;
    /** Every chapter of a title from the chapter-list API, in reading order. */
    private fetchChapters;
    private toChapter;
}
//# sourceMappingURL=mangakakalot.d.ts.map