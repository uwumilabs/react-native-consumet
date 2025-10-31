import axios from 'axios';

import { type ExtractorContext, type ISource, type IVideo, type IVideoExtractor } from '../models';
import type { PolyURL } from '../utils/url-polyfill';

/**
 * MegaUp extractor factory that relies on the shared extractor context
 */
export function MegaUp(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'MegaUp';
  const sources: IVideo[] = [];
  const apiBase = 'https://enc-dec.app/api';
  const client = ctx.axios ?? axios;
  const userAgent =
    ctx.USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

  const decodeSources = async (
    payload: string
  ): Promise<{
    sources: { file: string }[];
    tracks: { kind: string; file: string; label?: string }[];
    download: string;
  }> => {
    try {
      const { data } = await client.post(
        `${apiBase}/dec-mega`,
        {
          text: payload,
          agent: userAgent,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return data.result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  const extract = async (videoUrl: PolyURL): Promise<ISource> => {
    try {
      const mediaUrl = videoUrl.href.replace('/e/', '/media/');
      const { data } = await client.get(mediaUrl, {
        headers: {
          'Connection': 'keep-alive',
          'User-Agent': userAgent,
        },
      });

      const decrypted = await decodeSources(data.result);

      return {
        sources: decrypted.sources.map((source) => ({
          url: source.file,
          isM3U8: source.file.includes('.m3u8') || source.file.endsWith('m3u8'),
        })),
        subtitles: decrypted.tracks.map((track) => ({
          kind: track.kind,
          url: track.file,
          lang: track.label || 'English',
        })),
        download: decrypted.download,
      };
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  return {
    serverName,
    sources,
    extract,
  };
}

export default MegaUp;
