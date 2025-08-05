import axios from "axios";
import { VideoExtractor, type ExtractorContext, type IVideo, type ISource } from '../../models';
import { getSources } from './megacloud.getsrcs';

export class MegaCloud extends VideoExtractor {
  protected override serverName = 'MegaCloud';
  protected override sources: IVideo[] = [];

  private ctx: ExtractorContext;

  constructor(ctx: ExtractorContext) {
    super();
    this.ctx = ctx;
  }

  async extract(embedIframeURL: URL, referer = 'https://hianime.to'): Promise<ISource> {
    const { axios, logger } = this.ctx;

    const extractedData: ISource = {
      subtitles: [],
      intro: { start: 0, end: 0 },
      outro: { start: 0, end: 0 },
      sources: [],
    };

    try {
      const resp = await getSources(embedIframeURL, referer);

      if (!resp) return extractedData;

      if (Array.isArray(resp.sources)) {
        extractedData.sources = resp.sources.map((s: { file: string; type: string }) => ({
          url: s.file,
          isM3U8: s.type === 'hls',
          type: s.type,
        }));
      } else {
        extractedData.sources = [
          {
            url: resp.sources,
            isM3U8: resp.sources.includes('.m3u8'),
          },
        ];
      }

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
  }
}
