import { load } from 'cheerio';

import { VideoExtractor, type IVideo, type ExtractorContext } from '../models';
import { defaultExtractorContext } from '../utils/extension-utils';

export class StreamTape extends VideoExtractor {
  protected override serverName = 'StreamTape';
  protected override sources: IVideo[] = [];

  /** @param ctx extractor context; requests go through its axios (default: the library's) */
  constructor(private readonly ctx: ExtractorContext = defaultExtractorContext) {
    super();
  }

  override extract = async (videoUrl: URL): Promise<IVideo[]> => {
    try {
      const { data } = await this.ctx.axios.get(videoUrl.href).catch(() => {
        throw new Error('Video not found');
      });

      const $ = load(data);

      let [fh, sh] = $.html()
        ?.match(/robotlink'\).innerHTML = (.*)'/)![1]!
        .split("+ ('");

      sh = sh?.substring(3);
      fh = fh?.replace(/\'/g, '');

      const url = `https:${fh}${sh}`;

      this.sources.push({
        url: url,
        isM3U8: url.includes('.m3u8'),
      });

      return this.sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}
