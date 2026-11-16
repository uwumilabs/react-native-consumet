import type { ISource } from './types';
import type { ExtractorContext } from './extractor-context';
import type { PolyURL } from '../utils/url-polyfill';

/** What an extractor factory returns. */
export interface IVideoExtractor {
  /** Reads the video sources behind an embed URL. */
  extract(videoUrl: PolyURL | string, ...args: any[]): Promise<ISource>;
}

/** An extractor: `MegaCloud(ctx).extract(url)`. Registry extractors export one under their `name`. */
export type ExtractorFactory = (ctx: ExtractorContext) => IVideoExtractor;
