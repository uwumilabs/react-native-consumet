import { VideoExtractor, type IVideo, type ExtractorContext } from '../models';
import { defaultExtractorContext } from '../utils/extension-utils';

export class Mp4Upload extends VideoExtractor {
  protected override serverName = 'mp4upload';
  protected override sources: IVideo[] = [];

  /** @param ctx extractor context; requests go through its axios (default: the library's) */
  constructor(private readonly ctx: ExtractorContext = defaultExtractorContext) {
    super();
  }

  override extract = async (videoUrl: URL): Promise<IVideo[]> => {
    try {
      const { data } = await this.ctx.axios.get(videoUrl.href);

      const playerSrc = data
        .replace(/\n/g, ' ')
        .match(/player\.src\(\s*{\s*type:\s*"[^"]+",\s*src:\s*"([^"]+)"\s*}\s*\);/);
      const streamUrl = playerSrc[1];

      if (!streamUrl) throw new Error('Stream url not found');

      this.sources.push({
        quality: 'auto',
        url: streamUrl,
        isM3U8: streamUrl.includes('.m3u8'),
      });

      return this.sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}
