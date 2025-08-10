import { type ExtractorContext, type IVideo, type ISource, type IVideoExtractor } from '../../models';
import { getSources } from './megacloud.getsrcs';

/**
 * MegaCloud extractor function
 * @param ctx ExtractorContext containing axios, load, USER_AGENT, and logger
 * @returns Object with extract method implementing IVideoExtractor interface
 */
export function MegaCloud(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'MegaCloud';
  const sources: IVideo[] = [];

  const extract = async (embedIframeURL: URL, referer = 'https://hianime.to'): Promise<ISource> => {
    const { logger } = ctx;

    const extractedData: ISource = {
      subtitles: [],
      intro: { start: 0, end: 0 },
      outro: { start: 0, end: 0 },
      sources: [],
    };

    try {
      const resp = await getSources(embedIframeURL, referer, ctx);

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

      extractedData.intro = resp.intro ?? extractedData.intro;
      extractedData.outro = resp.outro ?? extractedData.outro;

      extractedData.subtitles =
        resp.tracks?.map((track: { file: string; label?: string; kind: string }) => ({
          url: track.file,
          lang: track.label || track.kind,
        })) ?? [];

      logger?.log(`[MegaCloud] Extracted ${extractedData.sources.length} source(s)`);

      return extractedData;
    } catch (err) {
      logger?.error('[MegaCloud] Extraction error', err);
      throw err;
    }
  };

  return {
    serverName,
    sources,
    extract,
  };
}
