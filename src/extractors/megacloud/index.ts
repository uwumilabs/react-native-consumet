import { type ISource, type IVideo, VideoExtractor } from '../../models';
import CryptoJS from 'crypto-js';
import { USER_AGENT } from '../../utils';

class MegaCloud extends VideoExtractor {
  protected override serverName = 'MegaCloud';
  protected override sources: IVideo[] = [];

  async extract(embedIframeURL: URL, referer: string = 'https://hianime.to') {
    try {
      const extractedData: ISource = {
        subtitles: [],
        intro: {
          start: 0,
          end: 0,
        },
        outro: {
          start: 0,
          end: 0,
        },
        sources: [],
      };
      const regex = /\/([^\/?]+)(?=\?)/;
      const xrax = embedIframeURL.toString().match(regex)?.[1];
      const basePath = embedIframeURL.pathname.split('/').slice(0, 4).join('/');
      const url = `${embedIframeURL.origin}${basePath}/getSources?id=${xrax}`;

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

      if (!resp) return extractedData;

      if (Array.isArray(resp)) {
        extractedData.sources = resp.map((s: { file: any; type: string }) => ({
          url: s.file,
          isM3U8: s.type === 'hls',
          type: s.type,
        }));
      }

      extractedData.intro = data.intro ? data.intro : extractedData.intro;
      extractedData.outro = data.outro ? data.outro : extractedData.outro;

      extractedData.subtitles = data.tracks.map((track: { file: any; label: any; kind: any }) => ({
        url: track.file,
        lang: track.label ? track.label : track.kind,
      }));

      return {
        intro: extractedData.intro,
        outro: extractedData.outro,
        sources: extractedData.sources,
        subtitles: extractedData.subtitles,
      } satisfies ISource;
    } catch (err) {
      throw err;
    }
  }
}

export default MegaCloud;
