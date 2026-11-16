import { Gofile } from '../../src/extractors/gofile';
import { PolyURL } from '../../src/utils/url-polyfill';

// Stands in for gofile.io/js/wt.obf.js: its token says which of the app's globals the script saw.
const tokenScript = `
var seen = [typeof fetch, typeof XMLHttpRequest, typeof require, typeof process, typeof nativeModuleProxy].join(',');
var isWindow = [this === window, self === window, globalThis === window].join(',');
function generateWT(token) { return [token, seen, isWindow, navigator.language].join('|'); }
`;

describe('Gofile', () => {
  it("runs the site's token script without the app's globals", async () => {
    const get = jest.fn(async (url: string) => {
      if (url.endsWith('/wt.obf.js')) return { status: 200, data: tokenScript };
      return {
        status: 200,
        data: { status: 'ok', data: { type: 'folder', children: { a: { type: 'file', link: 'https://store1.gofile.io/download/web/a/film.mkv' } } } },
      };
    });
    const post = jest.fn(async () => ({ data: { data: { token: 'guest' } } }));
    const ctx: any = { axios: { get, post }, USER_AGENT: 'test-agent', PolyURL };

    const result = await Gofile(ctx).extract('https://gofile.io/d/abc');

    const contents = get.mock.calls.find(([url]) => url.includes('/contents/abc')) as any;
    expect(contents[1].headers['X-Website-Token']).toBe('guest|undefined,undefined,undefined,undefined,undefined|true,true,true|en-US');
    expect(result.sources[0]!.url).toBe('https://store1.gofile.io/download/web/a/film.mkv');
  });
});
