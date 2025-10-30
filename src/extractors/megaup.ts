import axios from 'axios';

import { type ISource, type IVideo, VideoExtractor } from '../models';

export class MegaUp extends VideoExtractor {
  protected serverName: string = 'MegaUp';
  protected sources: IVideo[] = [];
  protected apiBase: string = 'https://enc-dec.app/api';

  constructor() {
    super();
  }

  GenerateToken = async (n: string): Promise<string> => {
    try {
      const res = await axios.get(`${this.apiBase}/enc-kai?text=${encodeURIComponent(n)}`);
      return res.data.result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  DecodeIframeData = async (
    n: string
  ): Promise<{
    url: string;
    skip: {
      intro: [number, number];
      outro: [number, number];
    };
  }> => {
    try {
      const res = await axios.post(`${this.apiBase}/dec-kai`, { text: n });
      return res.data.result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  Decode = async (
    n: string
  ): Promise<{ sources: { file: string }[]; tracks: { kind: string; file: string }[]; download: string }> => {
    try {
      const res = await axios.post(
        `${this.apiBase}/dec-mega`,
        {
          text: n,
          agent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return res.data.result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };

  override extract = async (videoUrl: URL): Promise<ISource> => {
    try {
      const url = videoUrl.href.replace('/e/', '/media/');
      const res = await axios.get(url, {
        headers: {
          'Connection': 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        },
      });
      const decrypted = await this.Decode(res.data.result);
      const data: ISource = {
        sources: decrypted.sources.map((s: { file: string }) => ({
          url: s.file,
          isM3U8: s.file.includes('.m3u8') || s.file.endsWith('m3u8'),
        })),
        subtitles: decrypted.tracks.map((t: { kind: any; file: any; label?: string }) => ({
          kind: t.kind,
          url: t.file,
          lang: t.label || 'English',
        })),
        download: decrypted.download,
      };
      return data;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  };
}

export default MegaUp;
