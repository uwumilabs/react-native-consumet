import { MegaPlay } from '../../src/extractors/megaplay';
import { createExtractorContext } from '../../src/utils/create-extractor-context';

const EMBED = 'https://megaplay.buzz/stream/s-2/167991/sub';
const MASTER = 'https://megap.example/anime/abc/master.m3u8';

// Masters recorded 2026-11-16 from megap.shiora.top (segment hosts trimmed away).
// Tokyo Revengers: War of the Three Titan Arc, episode 7: audio as separate renditions.
const SEPARATE_AUDIO_MASTER = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="Japanese",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="ja",CHANNELS="2",URI="audio/ja/index.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",DEFAULT=NO,AUTOSELECT=NO,LANGUAGE="en",CHANNELS="2",URI="audio/en/index.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=5500000,RESOLUTION=1920x1080,CODECS="avc1.4d401f,mp4a.40.2",AUDIO="aac",NAME="1080p"
index-f1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2",AUDIO="aac",NAME="720p"
index-f2.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.4d401f,mp4a.40.2",AUDIO="aac",NAME="480p"
index-f3.m3u8
`;
// Road of Naruto, episode 1: audio muxed into the one variant.
const MUXED_MASTER = `#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2657674,RESOLUTION=1920x1080,FRAME-RATE=23.974,CODECS="avc1.640032,mp4a.40.2"
index-f1-v1-a1.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=63153,RESOLUTION=640x360,CODECS="avc1.64001e",URI="iframes-f3-v1-a1.m3u8"
`;

/** MegaPlay whose context axios serves the embed page, getSources and the given master. */
const megaPlay = (master: string) => {
  const get = jest.fn(async (url: string) => {
    if (url === EMBED) return { headers: {}, data: '<div id="megaplay-player" data-id="167991"></div>' };
    if (url.includes('/stream/getSources?')) return { headers: {}, data: { sources: { file: MASTER }, tracks: [] } };
    if (url.includes('/stream/getSourcesNew?')) throw new Error('404');
    if (url === MASTER) return { headers: {}, data: master };
    throw new Error(`unexpected request ${url}`);
  });
  return MegaPlay({ ...createExtractorContext(), axios: { get } as any });
};

describe('MegaPlay', () => {
  it('returns only the master when the audio is in separate renditions', async () => {
    // Its variants are video only (checked with ffprobe), so an app that picks "1080p" got no sound.
    const { sources } = await megaPlay(SEPARATE_AUDIO_MASTER).extract(EMBED as any);

    expect(sources).toEqual([{ url: MASTER, isM3U8: true, quality: 'auto' }]);
  });

  it('lists each variant when the audio is muxed into it', async () => {
    const { sources } = await megaPlay(MUXED_MASTER).extract(EMBED as any);

    expect(sources).toEqual([
      { url: 'https://megap.example/anime/abc/index-f1-v1-a1.m3u8', isM3U8: true, quality: '1080p' },
      { url: MASTER, isM3U8: true, quality: 'auto' },
    ]);
  });
});
