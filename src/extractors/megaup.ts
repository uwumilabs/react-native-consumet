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
      const subsUrl = videoUrl.searchParams.get('sub.list');
      let externalSubs: { kind: string; url: string; lang: string }[] = [];
      if (subsUrl) {
        externalSubs = await axios.get(subsUrl).then((res) =>
          res.data.map((sub: { kind: string; file: string; label: string }) => ({
            kind: sub.kind,
            url: sub.file,
            lang: sub.label,
          }))
        );
      }
      const { data } = await client.get(mediaUrl, {
        headers: {
          'Connection': 'keep-alive',
          'User-Agent': userAgent,
        },
      });

      const decrypted = await decodeSources(data.result);

      const defaultSource: IVideo = {
        url: decrypted.sources[0]?.file!,
        isM3U8: decrypted.sources[0]?.file.includes('.m3u8'),
        quality: 'auto',
      };

      //split sources into multiple qualities if available
      const { data: sourceRes } = await client.get(decrypted.sources[0]?.file!, {
        headers: {
          'Connection': 'keep-alive',
          'User-Agent': userAgent,
        },
      });

      if (sourceRes.includes('#EXT-X-STREAM-INF')) {
        const lines = sourceRes.split('\n');
        const qualitySources: ISource['sources'] = [];
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
            const resolutionMatch = lines[i].match(/RESOLUTION=\d+x(\d+)/);
            const quality = resolutionMatch ? `${resolutionMatch[1]}p` : `quality${qualitySources.length + 1}`;
            const url = decrypted.sources[0]?.file!.split('/list')[0] + '/' + lines[i + 1];
            qualitySources.push({
              url,
              isM3U8: true,
              quality,
            });
          }
        }
        return {
          sources: [qualitySources, defaultSource].flat(),
          subtitles: [
            ...decrypted.tracks.map((track) => ({
              kind: track.kind,
              url: track.file,
              lang: track.label || track.kind || 'English',
            })),
            ...(externalSubs.length > 0 ? externalSubs : []),
          ],
          download: decrypted.download,
        };
      }
      return {
        sources: [defaultSource],
        subtitles: [
          ...decrypted.tracks.map((track) => ({
            kind: track.kind,
            url: track.file,
            lang: track.label || track.kind,
          })),
          ...(externalSubs.length > 0 ? externalSubs : []),
        ],
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
