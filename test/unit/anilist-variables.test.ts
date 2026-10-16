import Anilist from '../../src/providers/meta/anilist';
import { metaHttp } from '../../src/utils/meta-http';
import * as queries from '../../src/utils/queries';
import type { ITitle } from '../../src/models';
import searchFixture from './fixtures/anilist/search-fate-stay-night.json';
import { replay, sentBodies } from './fixtures/anilist/replay';

// The search the old interpolated query turned into a 400.
const SEARCH = '"Fate\\stay night"';

const fakeProvider = () =>
  ({
    name: 'FakeProvider',
    search: jest.fn().mockResolvedValue({ results: [] }),
    fetchAnimeInfo: jest.fn().mockResolvedValue({ episodes: [] }),
    fetchEpisodeSources: jest.fn(),
    fetchEpisodeServers: jest.fn(),
  }) as any;

const fakeMangaProvider = () =>
  ({
    name: 'FakeManga',
    search: jest.fn().mockResolvedValue({ results: [] }),
    fetchMangaInfo: jest.fn(),
    fetchChapterPages: jest.fn(),
  }) as any;

const notFound = () => Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } });

afterEach(() => jest.restoreAllMocks());

describe('AniList GraphQL variables (META-8)', () => {
  it('sends a search containing a quote and a backslash as a variable', async () => {
    const post = replay(jest.spyOn(metaHttp, 'post'), searchFixture);

    const res = await new Anilist(fakeProvider()).search(SEARCH, 1, 3);

    expect(post).toHaveBeenCalledWith('https://graphql.anilist.co', expect.anything(), expect.anything());
    expect(sentBodies(post)).toEqual([
      { query: queries.anilistSearchQuery(), variables: { search: SEARCH, page: 1, perPage: 3, type: 'ANIME' } },
    ]);
    expect(sentBodies(post)[0]!.query).not.toContain('Fate');
    expect(res.results.map((r) => [r.id, (r.title as ITitle).romaji])).toEqual([
      ['356', 'Fate/stay night'],
      ['6922', 'Fate/stay night Movie: UNLIMITED BLADE WORKS'],
      ['19603', 'Fate/stay night: Unlimited Blade Works'],
    ]);
  });

  it.each([
    [
      'search',
      (a: Anilist) => a.search(SEARCH),
      queries.anilistSearchQuery(),
      { search: SEARCH, page: 1, perPage: 15, type: 'ANIME' },
    ],
    [
      'Manga.search',
      () => new Anilist.Manga(fakeMangaProvider()).search(SEARCH, 2, 5),
      queries.anilistSearchQuery(),
      { search: SEARCH, page: 2, perPage: 5, type: 'MANGA' },
    ],
    ['advancedSearch', (a: Anilist) => a.advancedSearch(SEARCH), queries.anilistAdvancedQuery(), { search: SEARCH }],
    ['fetchAnimeInfo', (a: Anilist) => a.fetchAnimeInfo('99147'), queries.anilistMediaDetailQuery(), { id: 99147 }],
    [
      'fetchAnilistInfoById',
      (a: Anilist) => a.fetchAnilistInfoById('99147'),
      queries.anilistMediaDetailQuery(),
      { id: 99147 },
    ],
    [
      'Manga.fetchMangaInfo',
      () => new Anilist.Manga(fakeMangaProvider()).fetchMangaInfo('105398'),
      queries.anilistMediaDetailQuery(),
      { id: 105398 },
    ],
    [
      'fetchTrendingAnime',
      (a: Anilist) => a.fetchTrendingAnime(2, 5),
      queries.anilistTrendingQuery(),
      { page: 2, perPage: 5 },
    ],
    ['fetchPopularAnime', (a: Anilist) => a.fetchPopularAnime(2, 5), queries.anilistPopularQuery(), { page: 2, perPage: 5 }],
    [
      'fetchAnimeGenres',
      (a: Anilist) => a.fetchAnimeGenres(['Action', 'Slice of Life'], 2, 5),
      queries.anilistGenresQuery(),
      { genres: ['Action', 'Slice of Life'], page: 2, perPage: 5 },
    ],
    [
      'fetchAiringSchedule',
      (a: Anilist) => a.fetchAiringSchedule(2, 5, 'monday', 'friday', true),
      queries.anilistAiringScheduleQuery(),
      { page: 2, perPage: 5, notYetAired: true },
    ],
    ['fetchStaffById', (a: Anilist) => a.fetchStaffById(95185), queries.anilistStaffInfoQuery(), { id: 95185 }],
    [
      'fetchCharacterInfoById',
      (a: Anilist) => a.fetchCharacterInfoById('40882'),
      queries.anilistCharacterQuery(),
      { id: 40882 },
    ],
  ] as const)('%s sends a fixed query with its values as variables', async (_name, call, query, variables) => {
    const post = jest.spyOn(metaHttp, 'post').mockRejectedValue(notFound());

    await (call as (a: Anilist) => Promise<unknown>)(new Anilist(fakeProvider())).catch(() => undefined);

    expect(sentBodies(post)).toEqual([{ query, variables: expect.objectContaining(variables) }]);
  });

  it('sends the episode list lookup id as a variable', async () => {
    const post = jest.spyOn(metaHttp, 'post').mockRejectedValue(notFound());

    await new Anilist(fakeProvider()).fetchEpisodesListById('162670').catch(() => undefined);

    const [body] = sentBodies(post);
    expect(body!.variables).toEqual({ id: 162670 });
    expect(body!.query).not.toContain('162670');
  });

  it('builds every AniList query without taking values', () => {
    const builders = Object.entries(queries).filter(([name]) => name.startsWith('anilist'));

    expect(builders.length).toBeGreaterThan(5);
    for (const [, build] of builders) expect((build as () => string).length).toBe(0);
  });

  it('builds the Kitsu title search without taking values', () => {
    expect(queries.kitsuTitleSearchQuery.length).toBe(0);
    expect(queries.kitsuTitleSearchQuery()).toContain('title: $title');
  });
});
