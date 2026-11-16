/**
 * The name of an episode server: the name of the extractor that reads it, then the site's label
 * for it, lower-cased with spaces as dashes (`megacloud-hd-1`). pickServer and ExtractorManager
 * match names by that prefix.
 */
export declare function serverName(extractor: string, label: string): string;
/**
 * The JSON body of a response loaded through the hidden WebView, which hands back the page's HTML:
 * the JSON arrives wrapped in the elements the WebView renders it in. Throws when there is none.
 */
export declare function webViewJson<T = any>(html: string | undefined, url: string): T;
//# sourceMappingURL=helpers.d.ts.map