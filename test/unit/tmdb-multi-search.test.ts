import TMDB from '../../src/providers/meta/tmdb';
import { MultiStream } from '../../src/providers/movies/multistream/multistream';
import { TvType } from '../../src/models';
import { defaultAxios } from '../../src/utils/create-extractor-context';
import { metaHttp } from '../../src/utils/meta-http';
import search from './fixtures/tmdb/search-multi-tom-and-jerry-1.json';
import trendingAll from './fixtures/tmdb/trending-all-week.json';
import trendingPeople from './fixtures/tmdb/trending-person-day.json';
import { fakeMovieProvider } from './helpers/fake-providers';

// /search/multi lists people next to movies and shows. Built from recorded results: a person
// (Tim Burton, from trending/person/day), a show (LINK CLICK, from trending/all/week) and a movie.
const [person] = trendingPeople.results;
const [show] = trendingAll.results;
const [movie] = search.results;
const answer = (results: unknown[]) => ({ page: 1, results, total_pages: 3, total_results: 55 });

/** TMDB answers `/search/multi` with `data`, and `/tv/<id>` (MultiStream's season count) with 2 seasons. */
const respond = async (url: string) => {
  const { pathname } = new URL(url);
  if (pathname === '/3/search/multi') return { data: current } as any;
  if (pathname.startsWith('/3/tv/')) return { data: { number_of_seasons: 2 } } as any;
  throw new Error(`unexpected request: ${pathname}`);
};
let current: unknown;
const serve = (data: unknown) => {
  current = data;
  jest.spyOn(metaHttp, 'get').mockImplementation(respond);
  jest.spyOn(defaultAxios, 'get').mockImplementation(respond);
};

const tmdb = () => new TMDB('test-key', fakeMovieProvider());
const multiStream = () => new MultiStream(undefined, undefined, 'test-key');

afterEach(() => jest.restoreAllMocks());

describe('TMDB multi search', () => {
  it('META.TMDB lists the movies and shows, not the people', async () => {
    serve(answer([person, show, movie]));

    const { results } = await tmdb().search('tim');

    expect(results.map((r) => [r.id, r.type])).toEqual([
      [String(show!.id), TvType.TVSERIES],
      [String(movie!.id), TvType.MOVIE],
    ]);
  });

  it('MOVIES.MultiStream gives no `$person` ids', async () => {
    serve(answer([person, show, movie]));

    const { results } = await multiStream().search('tim');

    expect(results.map((r) => r.id)).toEqual([`${show!.id}$tv`, `${movie!.id}$movie`]);
  });

  it("keeps TMDB's next page after a page of people only", async () => {
    serve(answer([person]));

    for (const provider of [tmdb(), multiStream()]) {
      await expect(provider.search('tim')).resolves.toEqual(
        expect.objectContaining({ currentPage: 1, hasNextPage: true, results: [] })
      );
    }
  });
});
