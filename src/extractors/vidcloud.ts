import { VideoExtractor, type IVideo, type ISubtitle, type Intro } from '../models';
import { USER_AGENT } from '../utils';
import CryptoJS from 'crypto-js';

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

      const regex = /\/([^\/?]+)(?=\?)/;
      const xrax = videoUrl.toString().match(regex)?.[1];
      const basePath = videoUrl.pathname.split('/').slice(0, 4).join('/');
      const url = `${videoUrl.origin}${basePath}/getSources?id=${xrax}`;

      const getKeyType = url.includes('mega') ? 'mega' : url.includes('videostr') ? 'vidstr' : 'rabbit';

      //gets the base64 encoded string from the URL and key in parallel
      const [{ data }, { data: key }] = await Promise.all([
        this.client.get(url, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': referer,
            'X-Requested-With': 'XMLHttpRequest',
          },
        }),
        this.client.get('https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json'),
      ]);

      const sources = CryptoJS.AES.decrypt(data.sources, key[getKeyType]).toString(CryptoJS.enc.Utf8);
      const resp = JSON.parse(sources);


      for (const source of resp) {
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
        url: resp[0].file,
        isM3U8: resp[0].file.includes('.m3u8') || resp[0].file.endsWith('m3u8'),
        quality: 'auto',
      });

      result.subtitles = data.tracks.map((s: any) => ({
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
