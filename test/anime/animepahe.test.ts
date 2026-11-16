import { ANIME } from '../../src/providers';
import { expectMediaInfo, expectMediaSearch, expectServers, expectSources } from '../unit/helpers/media-contract';

jest.setTimeout(120000);

// AnimePahe answers through the native hidden WebView (Cloudflare), so this suite only passes where
// NativeConsumet is available, not under plain jest.
const animepahe = new ANIME.AnimePahe();

test('search, info, servers and sources play the first episode', async () => {
  const search = await animepahe.search('Overlord IV');
  expectMediaSearch(search);

  const info = await animepahe.fetchAnimeInfo(search.results[0]!.id);
  expectMediaInfo(info);

  const episodeId = info.episodes![0]!.id;
  expectServers(await animepahe.fetchEpisodeServers(episodeId));
  expectSources(await animepahe.fetchEpisodeSources(episodeId));
});
