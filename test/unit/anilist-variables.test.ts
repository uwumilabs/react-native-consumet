import Anilist from '../../src/providers/meta/anilist';
import { metaHttp } from '../../src/utils/meta-http';
import type { ITitle } from '../../src/models';
import searchFixture from './fixtures/anilist/search-fate-stay-night.json';
import { replay, sentBodies } from './fixtures/anilist/replay';
import { fakeAnimeProvider, fakeMangaProvider } from './helpers/fake-providers';

// The search the old interpolated query turned into a 400.
const SEARCH = '"Fate\\stay night"';

const notFound = () => Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } });

afterEach(() => jest.restoreAllMocks());

describe('AniList GraphQL variables (META-8)', () => {
  it('sends a search containing a quote and a backslash as a variable', async () => {
    const post = replay(jest.spyOn(metaHttp, 'post'), searchFixture);

    const res = await new Anilist(fakeAnimeProvider()).search(SEARCH, 1, 3);

    expect(post).toHaveBeenCalledWith('https://graphql.anilist.co', expect.anything(), expect.anything());
    const [body] = sentBodies(post);
    expect(body!.variables).toEqual({ search: SEARCH, page: 1, perPage: 3, type: 'ANIME' });
    expect(body!.query).not.toContain('Fate');
    expect(res.results.map((r) => [r.id, (r.title as ITitle).romaji])).toEqual([
      ['356', 'Fate/stay night'],
      ['6922', 'Fate/stay night Movie: UNLIMITED BLADE WORKS'],
      ['19603', 'Fate/stay night: Unlimited Blade Works'],
    ]);
  });

  // Each call's values, and the text none of them may leave in the query.
  it.each([
    ['search', (a: Anilist) => a.search(SEARCH), { search: SEARCH, page: 1, perPage: 15, type: 'ANIME' }, 'Fate'],
    [
      'Manga.search',
      () => new Anilist.Manga(fakeMangaProvider() as any).search(SEARCH, 2, 5),
      { search: SEARCH, page: 2, perPage: 5, type: 'MANGA' },
      'Fate',
    ],
    ['advancedSearch', (a: Anilist) => a.advancedSearch(SEARCH), { search: SEARCH }, 'Fate'],
    ['fetchAnimeInfo', (a: Anilist) => a.fetchAnimeInfo('99147'), { id: 99147 }, '99147'],
    ['fetchAnilistInfoById', (a: Anilist) => a.fetchAnilistInfoById('99147'), { id: 99147 }, '99147'],
    [
      'Manga.fetchMangaInfo',
      () => new Anilist.Manga(fakeMangaProvider() as any).fetchMangaInfo('105398'),
      { id: 105398 },
      '105398',
    ],
    ['fetchTrendingAnime', (a: Anilist) => a.fetchTrendingAnime(2, 5), { page: 2, perPage: 5 }, undefined],
    ['fetchPopularAnime', (a: Anilist) => a.fetchPopularAnime(2, 5), { page: 2, perPage: 5 }, undefined],
    [
      'fetchAnimeGenres',
      (a: Anilist) => a.fetchAnimeGenres(['Action', 'Slice of Life'], 2, 5),
      { genres: ['Action', 'Slice of Life'], page: 2, perPage: 5 },
      'Slice of Life',
    ],
    [
      'fetchAiringSchedule',
      (a: Anilist) => a.fetchAiringSchedule(2, 5, 'monday', 'friday', true),
      { page: 2, perPage: 5, notYetAired: true },
      undefined,
    ],
    ['fetchStaffById', (a: Anilist) => a.fetchStaffById(95185), { id: 95185 }, '95185'],
    ['fetchCharacterInfoById', (a: Anilist) => a.fetchCharacterInfoById('40882'), { id: 40882 }, '40882'],
    ['fetchEpisodesListById', (a: Anilist) => a.fetchEpisodesListById('162670'), { id: 162670 }, '162670'],
  ] as const)('%s sends its values as variables', async (_name, call, variables, value) => {
    const post = jest.spyOn(metaHttp, 'post').mockRejectedValue(notFound());

    await (call as (a: Anilist) => Promise<unknown>)(new Anilist(fakeAnimeProvider())).catch(() => undefined);

    const [body] = sentBodies(post);
    expect(body!.variables).toEqual(expect.objectContaining(variables));
    if (value) expect(body!.query).not.toContain(value);
  });
});
