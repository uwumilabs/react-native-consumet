import { VideoExtractor, type IVideo, type ExtractorContext } from '../models';
import { defaultExtractorContext } from '../utils/extension-utils';

export class MixDrop extends VideoExtractor {
  protected override serverName = 'MixDrop';
  protected override sources: IVideo[] = [];

  /** @param ctx extractor context; requests go through its axios (default: the library's) */
  constructor(private readonly ctx: ExtractorContext = defaultExtractorContext) {
    super();
  }

  override extract = async (videoUrl: URL): Promise<IVideo[]> => {
    try {
      const { data } = await this.ctx.axios.get(videoUrl.href);

      const formated = eval(/(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))![2]!.replace('eval', ''));

      const [poster, source] = formated
        .match(/poster="([^"]+)"|wurl="([^"]+)"/g)
        .map((x: string) => x.split(`="`)[1]!.replace(/"/g, ''))
        .map((x: string) => (x.startsWith('http') ? x : `https:${x}`));

      this.sources.push({
        url: source,
        isM3U8: source.includes('.m3u8'),
        poster: poster,
      });

      return this.sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}
