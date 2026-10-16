import Anilist from '../../src/providers/meta/anilist';
import { MediaStatus, type IAnimeResult } from '../../src/models';
import { metaHttp } from '../../src/utils/meta-http';
import { anilistMediaDetailQuery } from '../../src/utils/queries';
import byStatus from './fixtures/anilist/advanced-search-by-status.json';
import bungakuShoujo from './fixtures/anilist/search-bungaku-shoujo.json';
import attackOnTitan from './fixtures/anilist/media-99147.json';
import trending from './fixtures/anilist/trending.json';
import { copy, replay, response } from './fixtures/anilist/replay';

// Recorded AniList responses (see each fixture's `note`), replayed offline.
const FILLER_URL = 'https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/';
const aot = attackOnTitan.body.data.Media;

const fakeProvider = (episodes: object[] = []) =>
  ({
    name: 'FakeProvider',
    search: jest.fn().mockResolvedValue({ results: [{ id: 'show', title: aot.title.romaji }] }),
    fetchAnimeInfo: jest.fn().mockResolvedValue({ episodes }),
    fetchEpisodeSources: jest.fn(),
    fetchEpisodeServers: jest.fn(),
  }) as any;

// A manga provider that finds the title on its first search.
const fakeMangaProvider = () =>
  ({
    name: 'FakeManga',
    search: jest.fn().mockResolvedValue({ results: [{ id: 'aot', title: aot.title.romaji }] }),
    fetchMangaInfo: jest.fn().mockResolvedValue({ chapters: [{ id: 'ch-2' }, { id: 'ch-1' }] }),
    fetchChapterPages: jest.fn(),
  }) as any;

/** Every AniList answer is `body`; MALSync has no mapping. */
const serve = (body: unknown) => {
  jest.spyOn(metaHttp, 'post').mockResolvedValue(response({ status: 200, body }) as any);
  jest.spyOn(metaHttp, 'get').mockResolvedValue({ status: 404, data: {} } as any);
};

/** fetchAnimeInfo, fetchAnilistInfoById and Manga.fetchMangaInfo for one recorded media. */
const allDetails = async (body: unknown): Promise<any[]> => {
  serve(body);
  return [
    await new Anilist(fakeProvider()).fetchAnimeInfo(String(aot.id)),
    await new Anilist(fakeProvider()).fetchAnilistInfoById(String(aot.id)),
    await new Anilist.Manga(fakeMangaProvider()).fetchMangaInfo(String(aot.id)),
  ];
};

const withStatus = (status: unknown) => {
  const body = copy(byStatus.recordings[0]!.body);
  body.data.Page.media[0].status = status;
  return { status: 200, body };
};

afterEach(() => jest.restoreAllMocks());

describe('AniList mappers (META-11)', () => {
  it.each([
    ['RELEASING', MediaStatus.ONGOING],
    ['FINISHED', MediaStatus.COMPLETED],
    ['NOT_YET_RELEASED', MediaStatus.NOT_YET_AIRED],
    ['CANCELLED', MediaStatus.CANCELLED],
    ['HIATUS', MediaStatus.HIATUS],
  ])('maps status %s to %s', async (status, expected) => {
    const recording = byStatus.recordings.find((r) => r.variables.status === status)!;
    replay(jest.spyOn(metaHttp, 'post'), recording);

    const { results } = await new Anilist(fakeProvider()).advancedSearch(undefined, recording.variables.type);

    expect(results[0]!.status).toBe(expected);
  });

  it.each([null, undefined, 'SOMETHING_NEW', 'constructor'])('maps status %p to Unknown', async (status) => {
    replay(jest.spyOn(metaHttp, 'post'), withStatus(status));

    const { results } = await new Anilist(fakeProvider()).advancedSearch();

    expect(results[0]!.status).toBe(MediaStatus.UNKNOWN);
  });

  it('maps the status of results, details, recommendations and relations alike', async () => {
    serve(trending.body);
    const { results } = await new Anilist(fakeProvider()).fetchAnimeGenres(['Action']);
    expect(results.map((r) => r.status)).toEqual([MediaStatus.ONGOING, MediaStatus.ONGOING]);

    for (const info of await allDetails(attackOnTitan.body)) {
      expect(info.status).toBe(MediaStatus.COMPLETED);
      expect((info.recommendations as IAnimeResult[]).map((r) => r.status)).toEqual([
        MediaStatus.COMPLETED,
        MediaStatus.COMPLETED,
        MediaStatus.COMPLETED,
      ]);
      expect((info.relations as IAnimeResult[]).map((r) => r.status)).toEqual([
        MediaStatus.COMPLETED,
        MediaStatus.COMPLETED,
        MediaStatus.COMPLETED,
      ]);
    }
  });

  it('asks for status version 2 everywhere, so hiatus media is not reported as releasing', () => {
    const query = anilistMediaDetailQuery();

    expect(query.match(/\bstatus\b(?!\(version: 2\))/g)).toBeNull();
    expect(query.match(/status\(version: 2\)/g)).toHaveLength(3);
  });

  it('uses the banner as the cover, or the largest cover image when there is none', async () => {
    replay(jest.spyOn(metaHttp, 'post'), bungakuShoujo);
    const media = bungakuShoujo.body.data.Page.media;

    const { results } = await new Anilist(fakeProvider()).search('"Bungaku Shoujo"');

    expect(results.map((r) => [r.id, r.image, r.cover])).toEqual([
      ['6408', media[0]!.coverImage.extraLarge, media[0]!.coverImage.extraLarge],
      ['111993', media[1]!.coverImage.extraLarge, media[1]!.bannerImage],
      ['7669', media[2]!.coverImage.extraLarge, media[2]!.coverImage.extraLarge],
    ]);
  });

  it.each([
    ['extraLarge', {}, 'xl'],
    ['large without extraLarge', { extraLarge: null }, 'l'],
    ['medium without the larger sizes', { extraLarge: null, large: null }, 'm'],
    ['no image without any size', { extraLarge: null, large: null, medium: null }, undefined],
  ])('picks %s as image and cover in every mapper', async (_size, missing, expected) => {
    const coverImage = { extraLarge: 'xl', large: 'l', medium: 'm', color: '#fff', ...missing };
    const search = copy(bungakuShoujo.body);
    Object.assign(search.data.Page.media[0], { coverImage, bannerImage: null });
    const browse = copy(trending.body);
    Object.assign(browse.data.Page.media[0], { coverImage, bannerImage: null });
    const detail = copy(attackOnTitan.body);
    Object.assign(detail.data.Media, { coverImage, bannerImage: null });
    Object.assign(detail.data.Media.recommendations.edges[0].node.mediaRecommendation, { coverImage, bannerImage: null });
    Object.assign(detail.data.Media.relations.edges[0].node, { coverImage, bannerImage: null });

    serve(search);
    const [searched] = (await new Anilist(fakeProvider()).search('x')).results;
    jest.restoreAllMocks();
    serve(browse);
    const [browsed] = (await new Anilist(fakeProvider()).fetchTrendingAnime()).results;
    const [info] = await allDetails(detail);

    for (const media of [searched, browsed, info, info!.recommendations![0], info!.relations![0]]) {
      expect([media!.image, media!.cover]).toEqual([expected, expected]);
    }
    const episodes = await new Anilist(fakeProvider([{ id: 'ep-1', number: 1 }])).fetchEpisodesListById('99147');
    expect(episodes[0]!.image).toBe(expected);
  });

  it('gives recommendations, relations and characters one shape in every method', async () => {
    const [animeInfo, infoById, mangaInfo] = await allDetails(attackOnTitan.body);
    const fma = aot.recommendations.edges[0]!.node.mediaRecommendation!;
    const chibi = aot.relations.edges[2]!;
    const mikasa = aot.characters.edges[0]!;

    expect(infoById!.recommendations![0]).toEqual({
      id: 5114,
      malId: 5114,
      title: fma.title,
      status: MediaStatus.COMPLETED,
      episodes: 64,
      chapters: null,
      image: fma.coverImage.extraLarge,
      cover: fma.bannerImage,
      color: '#e4c993',
      rating: 90,
      type: 'TV',
    });
    expect(infoById!.relations![2]).toEqual({
      id: 108942,
      malId: 39477,
      relationType: 'OTHER',
      title: chibi.node.title,
      status: MediaStatus.COMPLETED,
      episodes: 4,
      chapters: null,
      image: chibi.node.coverImage.extraLarge,
      cover: chibi.node.coverImage.extraLarge,
      color: '#e4c993',
      rating: 76,
      type: 'SPECIAL',
    });
    expect(infoById!.characters[0]).toEqual({
      id: 40881,
      role: 'MAIN',
      name: { first: 'Mikasa', last: 'Ackerman', full: 'Mikasa Ackerman', native: mikasa.node.name.native, userPreferred: 'Mikasa Ackerman' },
      image: mikasa.node.image.large,
      voiceActors: [
        {
          id: 100142,
          language: 'Japanese',
          name: { first: 'Yui', last: 'Ishikawa', full: 'Yui Ishikawa', native: '石川由依', userPreferred: 'Yui Ishikawa' },
          image: mikasa.voiceActors[0]!.image.large,
        },
        {
          id: 96804,
          language: 'English',
          name: { first: 'Trina', last: 'Nishimura', full: 'Trina Nishimura', native: null, userPreferred: 'Trina Nishimura' },
          image: mikasa.voiceActors[1]!.image.large,
        },
      ],
    });
    for (const info of [animeInfo, mangaInfo]) {
      expect(info!.recommendations).toEqual(infoById!.recommendations);
      expect(info!.relations).toEqual(infoById!.relations);
      expect(info!.characters).toEqual(infoById!.characters);
    }
  });

  it('skips a recommendation AniList hides instead of failing the whole lookup', async () => {
    // Recorded as is: one of 99147's recommendations comes back with `mediaRecommendation: null`.
    expect(aot.recommendations.edges.filter((e) => e.node.mediaRecommendation === null)).toHaveLength(1);

    for (const info of await allDetails(attackOnTitan.body)) {
      expect((info.recommendations as IAnimeResult[]).map((r) => r.id)).toEqual([5114, 1818, 101348]);
    }
  });

  it('requests and returns title.userPreferred', async () => {
    expect(anilistMediaDetailQuery()).toMatch(/Media\(id: \$id\) \{ id idMal title \{ userPreferred /);

    for (const info of await allDetails(attackOnTitan.body)) {
      expect(info.title).toEqual({
        romaji: 'Shingeki no Kyojin Season 3',
        english: 'Attack on Titan Season 3',
        native: aot.title.native,
        userPreferred: 'Shingeki no Kyojin Season 3',
      });
    }
  });

  it('returns no placeholder hashes', async () => {
    serve(bungakuShoujo.body);
    const searched = await new Anilist(fakeProvider()).search('x');
    jest.restoreAllMocks();
    serve(trending.body);
    const browsed = await new Anilist(fakeProvider()).fetchPopularAnime();
    const details = await allDetails(attackOnTitan.body);

    const json = JSON.stringify([searched, browsed, details]);
    expect(json).not.toMatch(/imageHash|coverHash|thumbnailHash/);
    expect(json).not.toContain('"hash"');
  });

  it('flags fillers the same way in fetchAnimeInfo and fetchEpisodesListById', async () => {
    // A filler list that stops at episode 5 still flags the episodes it lists.
    const fillers = [1, 2, 3, 4, 5].map((n) => ({ 'number': String(n), 'filler-bool': n === 3 }));
    const episodes = () => Array.from({ length: 12 }, (_, i) => ({ id: `ep-${i + 1}`, number: i + 1 }));
    jest.spyOn(metaHttp, 'post').mockResolvedValue(response(attackOnTitan) as any);
    jest.spyOn(metaHttp, 'get').mockImplementation(async (url: string) => {
      if (url === `${FILLER_URL}${aot.idMal}.json`) return { status: 200, data: { episodes: fillers } } as any;
      throw new Error(`unexpected request ${url}`);
    });

    const info = await new Anilist(fakeProvider(episodes())).fetchAnimeInfo('99147', true);
    const list = await new Anilist(fakeProvider(episodes())).fetchEpisodesListById('99147', true);

    const expected = [false, false, true, false, false, ...Array(7).fill(undefined)];
    expect(info.episodes!.map((e) => e.isFiller)).toEqual(expected);
    expect(list.map((e) => e.isFiller)).toEqual(expected);
  });
});
