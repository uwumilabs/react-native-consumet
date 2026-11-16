import Anilist from '../../src/providers/meta/anilist';
import Myanimelist from '../../src/providers/meta/mal';
import TMDB from '../../src/providers/meta/tmdb';
import { SubOrDub } from '../../src/models';
import { fakeAnimeProvider, fakeMovieProvider } from './helpers/fake-providers';

// Meta providers hand episode servers and sources to the provider they wrap: the provider's own
// arguments (a server name, SubOrDub) must reach it, or a dub request plays the sub.
describe.each([
  ['META.Anilist', () => fakeAnimeProvider(), (provider: any) => new Anilist(provider)],
  ['META.Myanimelist', () => fakeAnimeProvider(), (provider: any) => new Myanimelist(provider)],
  ['META.TMDB', () => fakeMovieProvider(), (provider: any) => new TMDB('test-key', provider)],
])('%s', (_name, fake, wrap) => {
  it('passes every argument of fetchEpisodeServers on to the provider', async () => {
    const provider = fake();
    const servers = [{ name: 'megacloud-hd-1', url: 'https://embed.test/1' }];
    provider.fetchEpisodeServers.mockResolvedValue(servers);

    await expect(wrap(provider).fetchEpisodeServers('show$episode$1', SubOrDub.DUB)).resolves.toBe(servers);
    expect(provider.fetchEpisodeServers).toHaveBeenCalledWith('show$episode$1', SubOrDub.DUB);
  });

  it('passes every argument of fetchEpisodeSources on to the provider', async () => {
    const provider = fake();
    const source = { sources: [{ url: 'https://cdn.test/master.m3u8', isM3U8: true }] };
    provider.fetchEpisodeSources.mockResolvedValue(source);

    await expect(wrap(provider).fetchEpisodeSources('show$episode$1', 'megacloud-hd-2', SubOrDub.DUB)).resolves.toBe(
      source
    );
    expect(provider.fetchEpisodeSources).toHaveBeenCalledWith('show$episode$1', 'megacloud-hd-2', SubOrDub.DUB);
  });
});
