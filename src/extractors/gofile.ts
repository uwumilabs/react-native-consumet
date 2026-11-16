import { type ExtractorContext, type ISource, type IVideo } from '../models';
import type { PolyURL } from '../utils/url-polyfill';
import { toUrl } from './url';

const GOFILE_API = 'https://api.gofile.io';
const GOFILE_LANGUAGE = 'en-US';

type GofileContent = {
  id?: string;
  type?: string;
  link?: string;
  children?: Record<string, GofileContent>;
};

// Shared by every call, so one guest account and one copy of the site's token script serve them all.
let cachedAccountToken: string | null = null;
let cachedGenerateWT: ((token: string) => string) | null = null;
let cachedWTTime = 0;

/**
 * Globals of the app the site's script must not reach. `new Function` code sees the real global
 * scope, so each is shadowed by a parameter left undefined. The script only does string and
 * number work on the stand-in browser it is given.
 */
const HIDDEN_GLOBALS = [
  'global',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'require',
  'module',
  'exports',
  'process',
  'nativeModuleProxy',
  '__turboModuleProxy',
  '__fbBatchedBridge',
  'NativeConsumet',
  'localStorage',
  'sessionStorage',
  'indexedDB',
];

/**
 * The site's `generateWT`, which makes the X-Website-Token its API wants from the account token.
 * It comes from gofile.io/js/wt.obf.js, run against a stand-in browser; kept for three hours.
 */
async function getOrFetchGenerateWT(axiosClient: any, userAgent: string): Promise<(token: string) => string> {
  const now = Date.now();
  if (cachedGenerateWT && now - cachedWTTime < 3 * 60 * 60 * 1000) {
    return cachedGenerateWT;
  }

  const res = await axiosClient.get('https://gofile.io/js/wt.obf.js', {
    headers: { 'User-Agent': userAgent, 'Referer': 'https://gofile.io/' },
  });
  const runner = new Function(
    ['navigator', 'window', 'document', 'location', 'self', 'globalThis'].concat(HIDDEN_GLOBALS).join(','),
    `${res.data}\nreturn typeof generateWT !== 'undefined' ? generateWT : (window && window.generateWT);`
  );
  const fakeNav = { userAgent, language: GOFILE_LANGUAGE };
  const fakeWin: any = {
    navigator: fakeNav,
    location: { href: 'https://gofile.io/', protocol: 'https:', host: 'gofile.io' },
  };

  // As in a browser, `self`, `globalThis` and `this` are the window too: in a plain call `this`
  // would be the app's global object.
  const generateWT = runner.call(fakeWin, fakeNav, fakeWin, {}, fakeWin.location, fakeWin, fakeWin);
  if (typeof generateWT !== 'function') throw new Error('[Gofile] wt.obf.js no longer defines generateWT');
  cachedGenerateWT = generateWT;
  cachedWTTime = now;
  return generateWT;
}

async function getOrFetchToken(axiosClient: any, userAgent: string): Promise<string> {
  if (cachedAccountToken) return cachedAccountToken;

  const accountResponse = await axiosClient.post(
    `${GOFILE_API}/accounts`,
    {},
    { headers: { 'User-Agent': userAgent, 'Origin': 'https://gofile.io', 'Referer': 'https://gofile.io/' } }
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

export function Gofile(ctx: ExtractorContext) {
  const { axios, USER_AGENT, PolyURL } = ctx;

  const extract = async (videoUrl: string | PolyURL): Promise<ISource> => {
    const url = toUrl(PolyURL, videoUrl);
    const id = url.searchParams.get('c') || url.pathname.split('/').filter(Boolean).pop() || url.href;

    const token = await getOrFetchToken(axios, USER_AGENT);
    const generateWT = await getOrFetchGenerateWT(axios, USER_AGENT);

    const response = await axios.get(`${GOFILE_API}/contents/${id}`, {
      params: { contentFilter: '', page: 1, pageSize: 1000, sortField: 'name', sortDirection: 1 },
      headers: {
        'Accept': '*/*',
        'Accept-Language': `${GOFILE_LANGUAGE},en;q=0.9`,
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://gofile.io',
        'Referer': 'https://gofile.io/',
        'User-Agent': USER_AGENT,
        'X-BL': GOFILE_LANGUAGE,
        'X-Website-Token': generateWT(token),
      },
      // The answer's status is read below, so a rejected account token is dropped and the next call makes another.
      validateStatus: () => true,
    });

    if (response.data?.status !== 'ok') {
      if (response.data?.status === 'error-auth' || response.status === 401) cachedAccountToken = null;
      throw new Error(`[Gofile] API returned ${response.data?.status ?? `HTTP ${response.status}`}`);
    }

    const file = findFirstFile(response.data.data);
    if (!file?.link) throw new Error('[Gofile] No downloadable file found in Gofile response');

    const source: IVideo = {
      url: file.link,
      isM3U8: file.link.includes('.m3u8'),
      isDASH: file.link.includes('.mpd'),
      quality: 'auto',
    };

    return {
      sources: [source],
      headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://gofile.io/', 'Cookie': `accountToken=${token}` },
      download: file.link,
    };
  };

  return { extract };
}
