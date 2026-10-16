import type { AxiosStatic } from 'axios';
import type TMDBClass from '../../src/providers/meta/tmdb';
import type { MultiStream as MultiStreamClass } from '../../src/providers/movies/multistream';
import type { IMovieProvider } from '../../src/models/types';
import type { metaHttp as MetaHttp } from '../../src/utils/meta-http';
import show from './fixtures/tmdb/tv-84958.json';
import season1 from './fixtures/tmdb/tv-84958-season-1.json';
import season2 from './fixtures/tmdb/tv-84958-season-2.json';
import search from './fixtures/tmdb/search-multi-tom-and-jerry-1.json';
import trending from './fixtures/tmdb/trending-all-week.json';

// The key TMDB and MultiStream have always fallen back to; apps that pass no key keep working.
const SHARED_KEY = '5201b54eb0968700e693a30576d7d4dc';

const noProvider = {
  name: 'Fake',
  search: jest.fn().mockResolvedValue({ currentPage: 1, hasNextPage: false, results: [] }),
  fetchMediaInfo: jest.fn(),
  fetchEpisodeSources: jest.fn(),
  fetchEpisodeServers: jest.fn(),
} as unknown as IMovieProvider;

// Fresh modules per test, so the warn-once state starts empty. Requests are answered from the
// fixtures (through this registry's axios and metaHttp), and the api_key of each is recorded.
const load = () => {
  let modules!: {
    TMDB: typeof TMDBClass;
    MultiStream: typeof MultiStreamClass;
    axios: AxiosStatic;
    defaultAxios: AxiosStatic;
    metaHttp: typeof MetaHttp;
  };
  jest.isolateModules(() => {
    modules = {
      TMDB: require('../../src/providers/meta/tmdb').default,
      MultiStream: require('../../src/providers/movies/multistream').MultiStream,
      axios: require('axios').default,
      // MultiStream without a context sends its requests through this instance
      defaultAxios: require('../../src/utils/extension-utils').defaultAxios,
      metaHttp: require('../../src/utils/meta-http').metaHttp,
    };
  });
  const keys = stubTmdb([modules.axios, modules.defaultAxios], modules.metaHttp);
  return { ...modules, keys };
};

const stubTmdb = (clients: AxiosStatic[], metaHttp: typeof MetaHttp) => {
  const keys: (string | null)[] = [];
  const respond = async (url: string) => {
    const { pathname, searchParams } = new URL(url);
    keys.push(searchParams.get('api_key'));
    const responses: Record<string, unknown> = {
      '/3/tv/84958': show,
      '/3/tv/84958/season/1': season1,
      '/3/tv/84958/season/2': season2,
      '/3/search/multi': search,
      '/3/trending/all/week': trending,
    };
    if (!(pathname in responses)) throw new Error(`unexpected request: ${pathname}`);
    return { data: responses[pathname] } as any;
  };
  jest.spyOn(metaHttp, 'get').mockImplementation(respond);
  for (const client of clients) jest.spyOn(client, 'get').mockImplementation(respond);
  return keys;
};

let warn: jest.SpyInstance;
let error: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  error = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  expect(error).not.toHaveBeenCalled();
  jest.restoreAllMocks();
});

describe('TMDB API key (META-12)', () => {
  it("sends the caller's key on every request and warns about nothing", async () => {
    const { TMDB, keys } = load();
    const tmdb = new TMDB('my-key', noProvider);

    await tmdb.search('loki');
    await tmdb.fetchTrending('all', 'week');
    await tmdb.fetchMediaInfo('84958', 'tv');

    expect(keys).toHaveLength(5);
    expect(new Set(keys)).toEqual(new Set(['my-key']));
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to the shared key, warning once, when no key is passed', async () => {
    const { TMDB, keys } = load();

    // As uwumi does: no arguments, and an env variable that isn't set.
    await new TMDB().search('loki');
    await new TMDB(process.env.UNSET_TMDB_API_KEY, noProvider).fetchMediaInfo('84958', 'tv');
    await new TMDB('  ', noProvider).fetchTrending('all', 'week');

    expect(new Set(keys)).toEqual(new Set([SHARED_KEY]));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/META\.TMDB was created without a TMDB API key/);
    expect(warn.mock.calls[0]![0]).toMatch(/Pass your own key/);
  });
});

describe('MultiStream TMDB API key (META-12)', () => {
  it("sends the caller's key and warns about nothing", async () => {
    const { MultiStream, keys } = load();

    await new MultiStream(undefined, undefined, 'my-key').search('tom and jerry');

    expect(keys).toEqual(['my-key']);
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to the shared key with its own one-time warning', async () => {
    const { MultiStream, TMDB, keys } = load();

    await new MultiStream().search('tom and jerry');
    await new MultiStream('https://rivestream.example').search('tom and jerry');
    new TMDB(undefined, noProvider);

    expect(keys).toEqual([SHARED_KEY, SHARED_KEY]);
    expect(warn.mock.calls.map(([message]) => /^\[react-native-consumet\] (\S+)/.exec(message)?.[1])).toEqual([
      'MOVIES.MultiStream',
      'META.TMDB',
    ]);
  });
});
