import axios from 'axios';
import { type ExtractorContext, type IVideo, type ISubtitle, type Intro, type IVideoExtractor } from '../models';
import { USER_AGENT } from '../utils';
import { getSources } from './megacloud/megacloud.getsrcs';

function VidCloud(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'VidCloud';
  let sources: IVideo[] = [];

  const extract = async (
    videoUrl: URL,
    referer: string = 'https://flixhq.to/'
  ): Promise<{ sources: IVideo[] } & { subtitles: ISubtitle[] }> => {
    const result: { sources: IVideo[]; subtitles: ISubtitle[]; intro?: Intro } = {
      sources: [],
      subtitles: [],
    };
    try {
      // Use context axios if available, otherwise fall back to direct import
      const axiosInstance = ctx?.axios || axios;
      const USER_AGENT_VAL = ctx?.USER_AGENT || USER_AGENT;

      const options = {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': videoUrl.href,
          'User-Agent': USER_AGENT_VAL,
        },
      };

      const resp = await getSources(videoUrl, referer, ctx);

      if (!resp) {
        throw new Error('Failed to get sources from getSources function');
      }

      const resSources = resp.sources;

      sources = resSources.map((s: any) => ({
        url: s.file,
        isM3U8: s.file.includes('.m3u8') || s.file.endsWith('m3u8'),
      }));

      result.sources.push(...sources);

      result.sources = [];
      sources = [];

      for (const source of resSources) {
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
          sources.push({
            url: f2!,
            quality: f1,
            isM3U8: f2!.includes('.m3u8') || f2!.endsWith('m3u8'),
          });
        }
        result.sources.push(...sources);
      }

      result.sources.push({
        url: resSources[0].file,
        isM3U8: resSources[0].file.includes('.m3u8') || resSources[0].file.endsWith('m3u8'),
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
  return {
    serverName,
    sources,
    extract,
  };
}

export default VidCloud;
