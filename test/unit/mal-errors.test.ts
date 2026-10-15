import Myanimelist from '../../src/providers/meta/mal';
import { MetaError } from '../../src/models';
import { metaHttp } from '../../src/utils/meta-http';

const fakeProvider = () => ({
  name: 'FakeProvider',
  search: jest.fn(),
  fetchAnimeInfo: jest.fn(),
  fetchEpisodeSources: jest.fn(),
  fetchEpisodeServers: jest.fn(),
});

afterEach(() => jest.restoreAllMocks());

describe('Myanimelist errors (META-7)', () => {
  it('fetchEpisodeSources catches a rejected provider call as a provider MetaError', async () => {
    const provider = fakeProvider();
    const failure = new Error('blocked by cloudflare');
    provider.fetchEpisodeSources.mockRejectedValue(failure);

    const error = await new Myanimelist(provider as any).fetchEpisodeSources('ep-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MetaError);
    expect(error).toMatchObject({ source: 'provider', cause: failure });
  });

  it('fetchAnimeInfo throws a MetaError with the MAL status and logs nothing', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const unavailable = Object.assign(new Error('Request failed with status code 503'), { response: { status: 503 } });
    jest.spyOn(metaHttp, 'request').mockRejectedValue(unavailable);

    await expect(new Myanimelist(fakeProvider() as any).fetchAnimeInfo('21')).rejects.toMatchObject({
      name: 'MetaError',
      source: 'mal',
      status: 503,
      cause: unavailable,
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('fetchAnimeInfo labels a failing provider lookup as a provider error', async () => {
    jest.spyOn(metaHttp, 'request').mockResolvedValue({ data: '<html><body></body></html>' });
    const provider = fakeProvider();
    provider.search.mockRejectedValue(new Error('provider down'));

    await expect(new Myanimelist(provider as any).fetchAnimeInfo('21')).rejects.toMatchObject({
      name: 'MetaError',
      source: 'provider',
      message: 'provider down',
    });
  });
});
