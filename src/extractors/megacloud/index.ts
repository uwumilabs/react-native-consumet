import { type ISource, type IVideo, VideoExtractor } from '../../models';
import Consumet from '../../NativeConsumet';

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
      const jsonResponse = await Consumet.getSources(xrax!);
      const resp = JSON.parse(jsonResponse);

      if (!resp) return extractedData;

      if (Array.isArray(resp.sources)) {
        extractedData.sources = resp.sources.map((s: { file: any; type: string }) => ({
          url: s.file,
          isM3U8: s.type === 'hls',
          type: s.type,
        }));
      }

      extractedData.intro = resp.intro ? resp.intro : extractedData.intro;
      extractedData.outro = resp.outro ? resp.outro : extractedData.outro;

      extractedData.subtitles = resp.tracks.map((track: { file: any; label: any; kind: any }) => ({
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
