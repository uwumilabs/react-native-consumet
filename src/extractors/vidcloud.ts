import { VideoExtractor, type IVideo, type ISubtitle, type Intro } from '../models';
import { USER_AGENT } from '../utils';
import { getSources } from './megacloud/megacloud.getsrcs';

class VidCloud extends VideoExtractor {
  protected override serverName = 'VidCloud';
  protected override sources: IVideo[] = [];

  override extract = async (
    videoUrl: URL,
    _?: boolean,
    referer: string = 'https://flixhq.to/'
  ): Promise<{ sources: IVideo[] } & { subtitles: ISubtitle[] }> => {
    const result: { sources: IVideo[]; subtitles: ISubtitle[]; intro?: Intro } = {
      sources: [],
      subtitles: [],
    };
    try {
      const options = {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': videoUrl.href,
          'User-Agent': USER_AGENT,
        },
      };

      const resp = await getSources(videoUrl, referer);

      for (const source of resp.sources) {
        const { data } = await this.client.get(source.file, options);
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
        url: resp.sources.file,
        isM3U8: resp.sources.file.includes('.m3u8') || resp.sources.file.endsWith('m3u8'),
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
