/** The video quality a file host's title, heading or URL names (`1080p`; `4K` is `2160p`), or undefined. */
export declare function qualityIn(text: string): string | undefined;
/**
 * The URL a request ended at after following redirects: React Native's XHR reports it as
 * `request.responseURL`, Node's adapter as `request.res.responseUrl`. `fallback` when neither does.
 */
export declare function finalUrl(response: {
    request?: any;
}, fallback: string): string;
//# sourceMappingURL=file-hosts.d.ts.map