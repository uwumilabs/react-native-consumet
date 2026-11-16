import { HubCloud } from '../../src/extractors/hubcloud';
import { createExtractorContext } from '../../src/utils/create-extractor-context';

const FIRST = 'https://hubcloud.example/drive/abc';
const NEXT = 'https://hubcloud.example/hubcloud.php?id=abc';
const STORAGE = 'https://bucket.r2.cloudflarestorage.com/film.mkv?token=1';
const GOFILE = 'https://gofile.io/d/abc';

describe('HubCloud', () => {
  it('follows the base64 link in the page script and lists Gofile as its page', async () => {
    const first = `<title>Film 1080p</title><script>var url = 'https://hubcloud.example/go?r=${btoa(NEXT)}';</script>`;
    const next = `<a class="btn-success btn-lg h6" href="${GOFILE}">Gofile</a><a class="btn-danger" href="${STORAGE}">Download</a>`;
    const get = jest.fn(async (url: string) => {
      if (url === FIRST) return { data: first };
      if (url === NEXT) return { data: next };
      throw new Error(`unexpected request ${url}`);
    });

    const { sources } = await HubCloud({ ...createExtractorContext(), axios: { get } as any }).extract(FIRST);

    expect(sources.map(({ url, server, quality }) => ({ url, server, quality }))).toEqual([
      { url: STORAGE, server: 'CF Storage', quality: '1080p' },
      { url: GOFILE, server: 'Gofile', quality: '1080p' },
    ]);
  });
});
