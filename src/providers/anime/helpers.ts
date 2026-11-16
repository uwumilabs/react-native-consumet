/**
 * The name of an episode server: the name of the extractor that reads it, then the site's label
 * for it, lower-cased with spaces as dashes (`megacloud-hd-1`). pickServer and ExtractorManager
 * match names by that prefix.
 */
export function serverName(extractor: string, label: string): string {
  return `${extractor}-${label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')}`;
}

/**
 * The JSON body of a response loaded through the hidden WebView, which hands back the page's HTML:
 * the JSON arrives wrapped in the elements the WebView renders it in. Throws when there is none.
 */
export function webViewJson<T = any>(html: string | undefined, url: string): T {
  const text = (html ?? '').replace(/<[^>]*>/g, '').trim();
  if (!text) throw new Error(`Empty response from ${url}`);
  return JSON.parse(text) as T;
}
