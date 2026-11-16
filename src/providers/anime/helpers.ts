/**
 * The JSON body of a response loaded through the hidden WebView, which hands back the page's HTML:
 * the JSON arrives wrapped in the elements the WebView renders it in. Throws when there is none.
 */
export function webViewJson<T = any>(html: string | undefined, url: string): T {
  const text = (html ?? '').replace(/<[^>]*>/g, '').trim();
  if (!text) throw new Error(`Empty response from ${url}`);
  return JSON.parse(text) as T;
}
