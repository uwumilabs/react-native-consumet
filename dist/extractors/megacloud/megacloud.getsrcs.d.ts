import type { ExtractorContext } from '../../models';
/**
 * Thanks to https://github.com/yogesh-hacker for the original implementation.
 */
export declare function getSources(embed_url: URL, site: string, ctx?: ExtractorContext): Promise<void | {
    sources: any;
    tracks: any;
    intro: any;
    outro: any;
}>;
//# sourceMappingURL=megacloud.getsrcs.d.ts.map