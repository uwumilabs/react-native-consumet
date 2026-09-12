import { type ExtractorContext, type IVideoExtractor } from '../models';
/**
 * MegaPlay extractor factory that relies on the shared extractor context
 * @param ctx ExtractorContext containing axios, load, USER_AGENT, PolyURL
 * @returns Object with extract method implementing IVideoExtractor interface
 */
export declare function MegaPlay(ctx: ExtractorContext): IVideoExtractor;
export default MegaPlay;
//# sourceMappingURL=megaplay.d.ts.map