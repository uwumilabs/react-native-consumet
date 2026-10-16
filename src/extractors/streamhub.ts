import { VideoExtractor, type IVideo, type ISubtitle, type ExtractorContext } from '../models';
import { defaultExtractorContext } from '../utils/extension-utils';

export class StreamHub extends VideoExtractor {
  protected override serverName = 'StreamHub';
  protected override sources: IVideo[] = [];

  /** @param ctx extractor context; requests go through its axios (default: the library's) */
  constructor(private readonly ctx: ExtractorContext = defaultExtractorContext) {
    super();
  }

  override extract = async (videoUrl: URL): Promise<{ sources: IVideo[] } & { subtitles: ISubtitle[] }> => {
    try {
      const result: { sources: IVideo[]; subtitles: ISubtitle[] } = {
        sources: [],
        subtitles: [],
      };

      const { data } = await this.ctx.axios.get(videoUrl.href).catch(() => {
        throw new Error('Video not found');
      });

      const unpackedData = eval(
        /(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))![2]!.replace('eval', '')
      );

      const links = unpackedData.match(new RegExp('sources:\\[\\{src:"(.*?)"')) ?? [];
      const m3u8Content = await this.ctx.axios.get(links[1], {
        headers: {
          Referer: links[1],
        },
      });

      result.sources.push({
        quality: 'auto',
        url: links[1],
        isM3U8: links[1].includes('.m3u8'),
      });

      if (m3u8Content.data.includes('EXTM3U')) {
        const videoList = m3u8Content.data.split('#EXT-X-STREAM-INF:');
        for (const video of videoList ?? []) {
          if (!video.includes('m3u8')) continue;

          const url = video.split('\n')[1];
          const quality = video.split('RESOLUTION=')[1].split(',')[0].split('x')[1];

          result.sources.push({
            url: url,
            quality: `${quality}p`,
            isM3U8: url.includes('.m3u8'),
          });
        }
      }

      return result;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}
