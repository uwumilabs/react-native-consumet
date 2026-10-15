import Anilist from '../../src/providers/meta/anilist';
import { MetaError } from '../../src/models';
import { metaHttp } from '../../src/utils/meta-http';

// What axios rejects with once metaHttp has used up its retry.
const httpError = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } });

const fakeProvider = () => ({
  name: 'FakeProvider',
  search: jest.fn().mockResolvedValue({ results: [{ id: 'show', title: 'Show' }] }),
  fetchAnimeInfo: jest.fn().mockResolvedValue({ episodes: [{ id: 'ep-1', number: 1 }] }),
  fetchEpisodeSources: jest.fn(),
  fetchEpisodeServers: jest.fn(),
});

afterEach(() => jest.restoreAllMocks());

describe('Anilist errors (META-7)', () => {
  it.each([
    ['search', (anilist: Anilist) => anilist.search('dr stone')],
    ['advancedSearch', (anilist: Anilist) => anilist.advancedSearch('dr stone')],
  ])('%s throws a MetaError on a rate limit instead of falling back to Anify', async (_name, call) => {
    const post = jest.spyOn(metaHttp, 'post').mockRejectedValue(httpError(429));
    const get = jest.spyOn(metaHttp, 'get');

    const error = await call(new Anilist(fakeProvider() as any)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MetaError);
    expect(error).toMatchObject({
      source: 'anilist',
      status: 429,
      message: 'You have been ratelimited by anilist. Please try again later',
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  });

  it('advancedSearch keeps the status of a server error', async () => {
    jest.spyOn(metaHttp, 'post').mockRejectedValue(httpError(503));

    await expect(new Anilist(fakeProvider() as any).advancedSearch()).rejects.toMatchObject({
      name: 'MetaError',
      source: 'anilist',
      status: 503,
    });
  });

  it('fetchAnimeInfo reports a missing id as a 404 MetaError', async () => {
    const notFound = httpError(404);
    jest.spyOn(metaHttp, 'post').mockRejectedValue(notFound);

    await expect(new Anilist(fakeProvider() as any).fetchAnimeInfo('0')).rejects.toMatchObject({
      name: 'MetaError',
      source: 'anilist',
      status: 404,
      cause: notFound,
      message: expect.stringContaining('Media not found'),
    });
  });

  it('fetchAnilistInfoById keeps the status instead of reporting every failure as not found', async () => {
    jest.spyOn(metaHttp, 'post').mockRejectedValue(httpError(500));

    await expect(new Anilist(fakeProvider() as any).fetchAnilistInfoById('21')).rejects.toMatchObject({
      name: 'MetaError',
      source: 'anilist',
      status: 500,
    });
  });

  it('wraps a network failure without a status, keeping the cause', async () => {
    const reset = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
    jest.spyOn(metaHttp, 'post').mockRejectedValue(reset);

    await expect(new Anilist(fakeProvider() as any).fetchTrendingAnime()).rejects.toMatchObject({
      name: 'MetaError',
      source: 'anilist',
      status: undefined,
      cause: reset,
      message: 'socket hang up',
    });
  });

  it.each([
    ['fetchEpisodeSources', 'sources'],
    ['fetchEpisodeServers', 'servers'],
  ] as const)('%s catches a rejected provider call as a provider MetaError', async (method, what) => {
    const provider = fakeProvider();
    const failure = new Error('blocked by cloudflare');
    provider[method].mockRejectedValue(failure);

    const error = await new Anilist(provider as any)[method]('ep-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MetaError);
    expect(error).toMatchObject({ source: 'provider', cause: failure });
    expect((error as MetaError).message).toBe(`Failed to fetch episode ${what} from FakeProvider: ${failure}`);
  });

  it('fetchEpisodesListById tells an AniList failure from a provider failure', async () => {
    jest.spyOn(metaHttp, 'post').mockRejectedValueOnce(httpError(502));
    await expect(new Anilist(fakeProvider() as any).fetchEpisodesListById('162670')).rejects.toMatchObject({
      name: 'MetaError',
      source: 'anilist',
      status: 502,
    });

    jest.spyOn(metaHttp, 'post').mockResolvedValue({ data: { data: { Media: { title: { romaji: 'Show' } } } } });
    const provider = fakeProvider();
    provider.fetchAnimeInfo.mockRejectedValue(new Error('provider down'));
    await expect(new Anilist(provider as any).fetchEpisodesListById('162670')).rejects.toMatchObject({
      name: 'MetaError',
      source: 'provider',
      message: 'provider down',
    });
  });
});
