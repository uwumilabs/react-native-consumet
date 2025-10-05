export { USER_AGENT, days, ANIFY_URL } from './constants';
export declare const splitAuthor: (authors: string) => string[];
export declare const floorID: (id: string) => number;
export declare const formatTitle: (title: string) => string;
export declare const genElement: (s: string, e: string) => import("cheerio").Cheerio<import("cheerio").AnyNode> | undefined;
export declare const range: ({ from, to, step, length }: {
    from?: number | undefined;
    to?: number | undefined;
    step?: number | undefined;
    length?: number | undefined;
}) => number[];
export declare const capitalizeFirstLetter: (s: string) => string;
export declare const getDays: (day1: string, day2: string) => number[];
export declare const isJson: (str: string) => boolean;
export declare function convertDuration(milliseconds: number): string;
export declare const calculateStringSimilarity: (first: string, second: string) => number;
export declare const substringAfter: (str: string, toFind: string) => string;
export declare const substringBefore: (str: string, toFind: string) => string;
export declare const substringAfterLast: (str: string, toFind: string) => string;
export declare const substringBeforeLast: (str: string, toFind: string) => string;
export declare const getHashFromImage: (url: string) => "" | "hash";
export declare function findSimilarTitles(inputTitle: string, titles: any[]): any[];
export declare function cleanTitle(title: string | undefined | null): string;
export declare function removeSpecialChars(title: string | undefined | null): string;
export declare function transformSpecificVariations(title: string | undefined | null): string;
export declare function sanitizeTitle(title: string): string;
export declare function stringSearch(string: string, pattern: string): number;
interface FilterOptions {
    timeout?: number;
    headers?: Record<string, string>;
    indicators?: string[];
    concurrency?: number;
}
export declare const filterValidM3U8: (m3u8Links: string[], options?: FilterOptions) => Promise<string[]>;
//# sourceMappingURL=utils.d.ts.map