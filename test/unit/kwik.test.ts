import { readFileSync } from 'fs';
import { join } from 'path';
import { Kwik } from '../../src/extractors/kwik';
import { createExtractorContext } from '../../src/utils/create-extractor-context';

const embed = readFileSync(join(__dirname, 'fixtures/kwik/embed.html'), 'utf8');
const EMBED_URL = 'https://kwik.cx/e/aeNSh4eblrse';
const STREAM =
  'https://vault-08.uwucdn.top/stream/08/13/63abd0640a098853df01676699553c949b1b3038117d9f59232d56ca53be3fef/uwu.m3u8';

/** Kwik with a native module whose WebView GET answers `html`. */
const kwik = (html: string) => {
  const makeGetRequestWithWebView = jest.fn(async (url: string) => ({ url, html, cookies: '', status: 'success' }));
  const ctx = createExtractorContext();
  return {
    extractor: Kwik({ ...ctx, NativeConsumet: { ...ctx.NativeConsumet, makeGetRequestWithWebView } }),
    makeGetRequestWithWebView,
  };
};

describe('Kwik', () => {
  it('finds the stream in the packed player script, not the packed cookie helper before it', async () => {
    const { extractor, makeGetRequestWithWebView } = kwik(embed);

    const source = await extractor.extract(EMBED_URL as any, 'https://animepahe.pw/');

    // The payload escapes its quotes (\'), so the URL must not end in a backslash.
    expect(source).toEqual({ sources: [{ url: STREAM, isM3U8: true }], headers: { Referer: 'https://kwik.cx/' } });
    // No User-Agent: the WebView's own keeps the Cloudflare clearance valid.
    expect(makeGetRequestWithWebView).toHaveBeenCalledWith(EMBED_URL, { Referer: 'https://animepahe.pw/' });
  });

  it('finds the stream again on a second call', async () => {
    const { extractor } = kwik(embed);

    await extractor.extract(EMBED_URL as any);
    expect((await extractor.extract(EMBED_URL as any)).sources[0]!.url).toBe(STREAM);
  });

  it('says whether the page had no packed script or no source in it', async () => {
    await expect(kwik('<html><title>Just a moment...</title></html>').extractor.extract(EMBED_URL as any)).rejects.toThrow(
      '[Kwik] No packed script found'
    );
    const cookieHelperOnly = embed.slice(0, embed.lastIndexOf('eval(function(p,a,c,k,e,'));
    await expect(kwik(cookieHelperOnly).extractor.extract(EMBED_URL as any)).rejects.toThrow('[Kwik] No source URL found');
  });
});
