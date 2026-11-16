import type { PolyURL } from '../utils/url-polyfill';

/** Extractors take the embed URL as a string or as a URL object; this is it as a URL object. */
export function toUrl(URLClass: typeof PolyURL, url: string | PolyURL): PolyURL {
  return typeof url === 'string' ? new URLClass(url) : url;
}
