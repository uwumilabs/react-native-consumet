// @ts-nocheck
import { load } from 'cheerio';
import type { IVideo, ISource } from '../models';
import VideoExtractor from '../models/video-extractor';
import { USER_AGENT } from '../utils';

class StreamP2P extends VideoExtractor {
  protected serverName: string = 'StreamP2P';
  protected sources: IVideo[] = [];

  private readonly host = 'https://multimovies.p2pplay.pro';

  async extract(videoUrl: URL): Promise<IVideo[] | ISource> {
    const headers = {
      'Referer': this.host,
      'User-Agent': USER_AGENT,
    };

    // Extract video ID from URL fragment
    const videoId = videoUrl.href.split('#')[1];

    // API to fetch encrypted data
    const api = `${this.host}/api/v1/video?id=${videoId}`;

    // AES keys
    const password = 'kiemtienmua911ca';
    const iv = '1234567890oiuytr';
    try {
      const { data: encryptedHex } = await this.client.get(api, { headers });

      // Convert hex to WordArray
      const encryptedData = CryptoJS.enc.Hex.parse(encryptedHex);

      // Key and IV as WordArrays
      const key = CryptoJS.enc.Utf8.parse(password);
      const ivWordArray = CryptoJS.enc.Utf8.parse(iv);

      // Decrypt using AES-CBC and PKCS7 padding
      const decrypted = CryptoJS.AES.decrypt({ ciphertext: encryptedData } as any, key, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
      const json = JSON.parse(decryptedStr);

      console.log('Captured URL:', json.source);
      console.log('\nUse these headers to access the URL:\n');

      for (const [key, value] of Object.entries(headers)) {
        console.log(`${key}: ${value}`);
      }
    } catch (error) {
      console.error('Error occurred:', error);
    }
  }
}

export default StreamP2P;
