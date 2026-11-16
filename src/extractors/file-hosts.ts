/** The video quality a file host's title, heading or URL names (`1080p`; `4K` is `2160p`), or undefined. */
export function qualityIn(text: string): string | undefined {
  const label = text.match(/\b(2160p|4k|1080p|720p|480p|360p)\b/i)?.[1]?.toLowerCase();
  return label === '4k' ? '2160p' : label;
}

/**
 * The URL a request ended at after following redirects: React Native's XHR reports it as
 * `request.responseURL`, Node's adapter as `request.res.responseUrl`. `fallback` when neither does.
 */
export function finalUrl(response: { request?: any }, fallback: string): string {
  return response.request?.responseURL || response.request?.res?.responseUrl || fallback;
}

/** Whether `url` is a V-Cloud or HubCloud page, which the HubCloud extractor reads. */
export const isHubCloudPage = (url: string): boolean => /vcloud|hubcloud/i.test(url);

/** Whether `url` is on FastDL (`fastdl.*`, and its `fsl.*` servers). */
export const isFastDl = (url: string): boolean => /fastdl|fsl\./i.test(url);

/** FastDL's dl.php?link=<url> is an HTML "Download Now" page; the file is the URL it wraps. */
export function unwrapFastDlUrl(url: string): string {
  const wrapped = url.match(/\/dl\.php\?link=(.+)$/)?.[1];
  if (!wrapped) return url;
  return /^https?%3A/i.test(wrapped) ? decodeURIComponent(wrapped) : wrapped;
}

/** Whether `url` is a Gofile page (`gofile.io/d/<id>`) rather than a file on it; the Gofile extractor finds the file. */
export const isGofilePage = (url: string): boolean => /^https?:\/\/(?:www\.)?gofile\.io\//i.test(url);
