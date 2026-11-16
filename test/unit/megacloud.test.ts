import { MegaCloud } from '../../src/extractors/megacloud';
import { createExtractorContext } from '../../src/utils/create-extractor-context';

const EMBED = 'https://megacloud.test/embed-2/v3/e-1/abc123?k=1';
const NONCE = 'ABCDEFGHIJKLMNOPQRSTUVWXabcdefghijklmnopqrstuvwx';
const embedPage = `<html><div id="megacloud-player" data-id="abc123"></div><script>window._k = "${NONCE}";</script></html>`;

/** MegaCloud whose getSources answers `answer`, with one HLS stream. */
const extract = (answer: object) => {
  const get = jest.fn(async (url: string) => {
    if (url === EMBED) return { data: embedPage };
    if (url.includes('/getSources?')) {
      return { data: { sources: [{ file: 'https://cdn.test/master.m3u8', type: 'hls' }], tracks: [], ...answer } };
    }
    return { data: '#EXTM3U\n#EXTINF:10,\nseg-1.ts\n' };
  });
  return MegaCloud(createExtractorContext({ axios: { get } as any })).extract(EMBED, 'https://site.test/');
};

describe('MegaCloud intro and outro', () => {
  it('leaves them unset when getSources has none, as MegaPlay does', async () => {
    const source = await extract({});

    expect(source.intro).toBeUndefined();
    expect(source.outro).toBeUndefined();
  });

  it('gives the ones getSources has', async () => {
    const source = await extract({ intro: { start: 5, end: 90 }, outro: { start: 1300, end: 1390 } });

    expect(source.intro).toEqual({ start: 5, end: 90 });
    expect(source.outro).toEqual({ start: 1300, end: 1390 });
  });
});
