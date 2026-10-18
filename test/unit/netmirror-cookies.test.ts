import {
  createDisneyMirror,
  createNetflixMirror,
  createPrimeMirror,
} from '../../src/providers/movies/netflixmirror/create-netflixmirror';
import createProviderContext from '../../src/utils/create-provider-context';

// React Native attaches its native cookie jar to requests unless withCredentials is false, and on
// Android the jar replaces the Cookie headers NetMirror sets itself (a stored session cookie then
// hid the unlock page's data-addhash and dropped the ott cookie). Every request must opt out.
const stubAxios = () => {
  const configs: { url: string; config: any }[] = [];
  const respond = (url: string) => {
    if (url.includes('/newtv/search.php')) return { data: { status: 'y', searchResult: [{ id: '1', t: 'Title' }] } };
    if (url.includes('/newtv/post.php')) return { data: { status: 'ok', type: 'm' } };
    // The home page hands out a session cookie, so the session unlock finishes at once.
    return { data: '<html></html>', headers: { 'set-cookie': ['t_hash_t=session-token; path=/'] } };
  };
  return {
    configs,
    axios: {
      get: jest.fn(async (url: string, config: any) => {
        configs.push({ url, config });
        return { headers: {}, ...respond(url) };
      }),
      post: jest.fn(async (url: string, _data: unknown, config: any) => {
        configs.push({ url, config });
        return { headers: {}, data: '' };
      }),
    },
  };
};

describe('NetMirror requests skip the platform cookie jar', () => {
  it.each([
    ['NetflixMirror', createNetflixMirror],
    ['PrimeMirror', createPrimeMirror],
    ['DisneyMirror', createDisneyMirror],
  ])('%s sends every request with withCredentials: false', async (_name, create) => {
    const { axios, configs } = stubAxios();
    const provider = create({ ...createProviderContext(), axios: axios as any });

    const { results } = await provider.search('title');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(results).toHaveLength(1);
    expect(configs.length).toBeGreaterThan(1);
    expect(configs.filter(({ config }) => config?.withCredentials !== false).map(({ url }) => url)).toEqual([]);
  });
});

describe('NetMirror sources', () => {
  it('drops a quality whose master playlist has no video stream', async () => {
    const withStream = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=1280x720\nhttps://cdn.test/720p.m3u8\n';
    const audioOnly = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",URI="https://cdn.test/a.m3u8"\n';
    const get = jest.fn(async (url: string, config: any) => {
      expect(config?.withCredentials).toBe(false);
      if (url.includes('/mobile/home')) return { headers: { 'set-cookie': ['t_hash_t=session-token'] }, data: '' };
      if (url.includes('playlist.php')) {
        const sources = ['Auto', 'Full HD', 'Mid HD'].map((label, i) => ({ file: `/hls/1.m3u8?q=${i}&in=x`, label }));
        return { headers: {}, data: [{ sources, tracks: [] }] };
      }
      // Like the site: the Full HD master of a title without 1080p lists audio tracks only.
      return { headers: {}, data: url.includes('q=1&') ? audioOnly : withStream };
    });
    const provider = createNetflixMirror({ ...createProviderContext(), axios: { get, post: jest.fn() } as any });

    const { sources } = await provider.fetchEpisodeSources('1');

    expect(sources.map((s: any) => s.quality)).toEqual(['auto', '720p']);
  });
});
