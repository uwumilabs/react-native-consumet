import { type ExtractorContext, type ISource, type IVideo, type IVideoExtractor } from '../models';
import type { PolyURL } from '../utils/url-polyfill';

const GOFILE_API = 'https://api.gofile.io';
const GOFILE_LANGUAGE = 'en-US';
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

type GofileContent = {
  id?: string;
  type?: string;
  link?: string;
  children?: Record<string, GofileContent>;
};

let cachedAccountToken: string | null = null;
let cachedGenerateWT: ((token: string) => string) | null = null;
let cachedWTTime = 0;

async function getOrFetchGenerateWT(axiosClient: any, userAgent: string): Promise<(token: string) => string> {
  const now = Date.now();
  if (cachedGenerateWT && now - cachedWTTime < 3 * 60 * 60 * 1000) {
    return cachedGenerateWT;
  }

  try {
    const res = await axiosClient.get('https://gofile.io/js/wt.obf.js', {
      headers: {
        'User-Agent': userAgent,
        'Referer': 'https://gofile.io/',
      },
    });

    const code = res.data;
    const runner = new Function(
      'navigator',
      'window',
      'document',
      'location',
      `${code}\nreturn typeof generateWT !== 'undefined' ? generateWT : (window && window.generateWT);`
    );
    const fakeNav = {
      userAgent,
      language: GOFILE_LANGUAGE,
    };
    const fakeWin: any = {
      navigator: fakeNav,
      location: {
        href: 'https://gofile.io/',
        protocol: 'https:',
        host: 'gofile.io',
      },
    };

    const generateWT = runner(fakeNav, fakeWin, {}, fakeWin.location);
    if (typeof generateWT === 'function') {
      cachedGenerateWT = generateWT;
      cachedWTTime = now;
      return generateWT;
    }
  } catch (err: any) {
    console.warn('[Gofile] Failed to fetch or execute wt.obf.js:', err?.message || err);
  }

  // Fallback if wt.obf.js is unreachable
  return (accountToken: string) => accountToken;
}

async function getOrFetchToken(axiosClient: any, userAgent: string): Promise<string> {
  if (cachedAccountToken) return cachedAccountToken;

  const accountResponse = await axiosClient.post(
    `${GOFILE_API}/accounts`,
    {},
    {
      headers: {
        'User-Agent': userAgent,
        'Origin': 'https://gofile.io',
        'Referer': 'https://gofile.io/',
      },
    }
  );
  const token = accountResponse.data?.data?.token;

  if (!token) throw new Error('[Gofile] Did not return an account token');

  cachedAccountToken = token;
  return token;
}

function findFirstFile(content: GofileContent): GofileContent | undefined {
  if (content?.type === 'file' && content?.link) return content;

  for (const child of Object.values(content?.children ?? {})) {
    const file = findFirstFile(child);
    if (file) return file;
  }

  return undefined;
}

/**
 * Gofile extractor function / factory relying on ExtractorContext
 * Follows react-native-consumet conventions (Kwik, MegaUp, MegaPlay)
 */
export function Gofile(ctx: ExtractorContext): IVideoExtractor {
  const serverName = 'Gofile';
  const sources: IVideo[] = [];
  const { axios: client, USER_AGENT, PolyURL } = ctx;
  const userAgent = USER_AGENT || DEFAULT_USER_AGENT;

  const extract = async (videoUrl: PolyURL): Promise<ISource> => {
    try {
      const urlHref = typeof videoUrl === 'string' ? videoUrl : videoUrl.href;
      const urlObj = typeof videoUrl === 'object' && videoUrl.origin ? videoUrl : new PolyURL(urlHref);
      const id = urlObj.searchParams.get('c') || urlObj.pathname.split('/').filter(Boolean).pop() || urlHref;

      const token = await getOrFetchToken(client, userAgent);
      const generateWT = await getOrFetchGenerateWT(client, userAgent);
      const websiteToken = generateWT(token);

      const response = await client.get(`${GOFILE_API}/contents/${id}`, {
        params: {
          contentFilter: '',
          page: 1,
          pageSize: 1000,
          sortField: 'name',
          sortDirection: 1,
        },
        headers: {
          'Accept': '*/*',
          'Accept-Language': `${GOFILE_LANGUAGE},en;q=0.9`,
          'Authorization': `Bearer ${token}`,
          'Origin': 'https://gofile.io',
          'Referer': 'https://gofile.io/',
          'User-Agent': userAgent,
          'X-BL': GOFILE_LANGUAGE,
          'X-Website-Token': websiteToken,
        },
      });

      if (response.data?.status !== 'ok') {
        if (response.data?.status === 'error-auth' || response.status === 401) {
          cachedAccountToken = null;
        }
        throw new Error(`[Gofile] API returned ${response.data?.status ?? 'invalid data'}`);
      }

      const file = findFirstFile(response.data.data);
      if (!file?.link) {
        throw new Error('[Gofile] No downloadable file found in Gofile response');
      }

      const defaultSource: IVideo = {
        url: file.link,
        isM3U8: file.link.includes('.m3u8'),
        isDASH: file.link.includes('.mpd'),
        quality: 'auto',
      };

      return {
        sources: [defaultSource],
        headers: {
          'User-Agent': userAgent,
          'Referer': 'https://gofile.io/',
          'Cookie': `accountToken=${token}`,
        },
        download: file.link,
      };
    } catch (error) {
      throw new Error(`[Gofile] Failed to extract: ${(error as Error).message}`);
    }
  };

  return {
    serverName,
    sources,
    extract,
  };
}

export default Gofile;
