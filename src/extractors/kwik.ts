import { type ExtractorContext, type IVideo, type ISource, type IVideoExtractor } from '../models';

/**
 * Kwik extractor function
 * @param ctx ExtractorContext containing axios, load, USER_AGENT
 * @returns Object with extract method implementing IVideoExtractor interface
 */
export function Kwik(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'kwik';
  const sources: IVideo[] = [];
  const { axios, load, USER_AGENT, PolyURL } = ctx;

  const host = 'https://animepahe.ru/';
  // @ts-ignore
  const extract = async (videoUrl: PolyURL, ...args: any): Promise<ISource> => {
    const extractedData: ISource = {
      subtitles: [],
      intro: { start: 0, end: 0 },
      outro: { start: 0, end: 0 },
      sources: [],
    };

    try {
      const response = await fetch(`${videoUrl.href}`, {
        headers: { Referer: host },
      });

      const data = await response.text();

      const source = eval(
        /(eval)(\(f.*?)(\n<\/script>)/m.exec(data.replace(/\n/g, ' '))![2]!.replace('eval', '')
      ).match(/https.*?m3u8/);

      extractedData.sources.push({
        url: source[0],
        isM3U8: source[0].includes('.m3u8'),
      });

      return extractedData;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  return {
    serverName,
    sources,
    extract,
  };
}
