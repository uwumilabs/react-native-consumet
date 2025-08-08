import axios from 'axios';
// @ts-nocheck
import { VideoExtractor, type ExtractorContext, type IVideo, type ISubtitle, type Intro } from '../models';
import { USER_AGENT } from '../utils';
import { getSources } from './megacloud/megacloud.getsrcs';

class VidCloud extends VideoExtractor {
  protected override serverName = 'VidCloud';
  protected override sources: IVideo[] = [];

  private ctx?: ExtractorContext;

  constructor(ctx?: ExtractorContext) {
    super();
    this.ctx = ctx;
  }

  override extract = async (
    videoUrl: URL,
    referer: string = 'https://flixhq.to/'
  ): Promise<{ sources: IVideo[] } & { subtitles: ISubtitle[] }> => {
    const result: { sources: IVideo[]; subtitles: ISubtitle[]; intro?: Intro } = {
      sources: [],
      subtitles: [],
    };
    try {
      // Use context axios if available, otherwise fall back to direct import
      const axiosInstance = this.ctx?.axios || axios;
      const USER_AGENT_VAL = this.ctx?.USER_AGENT || USER_AGENT;

      const options = {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': videoUrl.href,
          'User-Agent': USER_AGENT_VAL,
        },
      };

      const resp = await getSources(videoUrl, referer, this.ctx);

      if (!resp) {
        throw new Error('Failed to get sources from getSources function');
      }

      const sources = resp.sources;

      this.sources = sources.map((s: any) => ({
        url: s.file,
        isM3U8: s.file.includes('.m3u8') || s.file.endsWith('m3u8'),
      }));

      result.sources.push(...this.sources);

      result.sources = [];
      this.sources = [];

      for (const source of sources) {
        const { data } = await axiosInstance.get(source.file, options);
        const urls = data
          .split('\n')
          .filter((line: string) => line.includes('.m3u8') || line.endsWith('m3u8')) as string[];
        const qualities = data.split('\n').filter((line: string) => line.includes('RESOLUTION=')) as string[];

        const TdArray = qualities.map((s, i) => {
          const f1 = s.split('x')[1];
          const f2 = urls[i];

          return [f1, f2];
        });

        for (const [f1, f2] of TdArray) {
          this.sources.push({
            url: f2!,
            quality: f1,
            isM3U8: f2!.includes('.m3u8') || f2!.endsWith('m3u8'),
          });
        }
        result.sources.push(...this.sources);
      }

      result.sources.push({
        url: sources[0].file,
        isM3U8: sources[0].file.includes('.m3u8') || sources[0].file.endsWith('m3u8'),
        quality: 'auto',
      });

      result.subtitles = resp.tracks.map((s: any) => ({
        url: s.file,
        lang: s.label ? s.label : 'Default (maybe)',
      }));

      return result;
    } catch (err) {
      throw err;
    }
  };
}

export default VidCloud;
