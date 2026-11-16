import type { CheerioAPI } from 'cheerio';
import {
  type SubOrDub,
  type ISearch,
  type IAnimeInfo,
  type IAnimeResult,
  type ISource,
  type IEpisodeServer,
  type MediaFormat,
  type ProviderContext,
  type ProviderConfig,
  type IAnimeEpisode,
  type ProviderCapabilities,
} from '../../../models';
import { toMediaStatus } from '../../common/media-status';
import { serverName, serversNamed } from '../../common/servers';
import { webViewJson } from '../helpers';

export function createAnimePahe(ctx: ProviderContext, customBaseURL?: string) {
  const { load, extractors, enums, createCustomBaseUrl, PolyURL, NativeConsumet } = ctx;
  const { Kwik } = extractors;
  const { makeGetRequestWithWebView } = NativeConsumet;
  const { SubOrDub: SubOrDubEnum } = enums;

  const baseUrl = createCustomBaseUrl('https://animepahe.pw', customBaseURL);

  const config: ProviderConfig = {
    name: 'AnimePahe',
    languages: 'en',
    classPath: 'ANIME.AnimePahe',
    logo: 'https://animepahe.pw/web-app-manifest-512x512.png',
    baseUrl,
    isNSFW: false,
    isWorking: true,
    isDubAvailableSeparately: true,
  };

  // The site sits behind a Cloudflare managed challenge, so every page and API call is loaded in
  // the hidden WebView, which waits past the challenge. No User-Agent is sent: the WebView keeps
  // its own, which the cf_clearance cookie it earns is bound to.

  let challenge: Promise<void> | undefined;
  /**
   * Loads the site once so the WebView holds a clearance before the first API call. Searches
   * running at once share the one load; a failed load is tried again by the next search. A passed
   * load is not repeated when the clearance expires: each WebView request waits past a challenge
   * itself, so an expired clearance only makes that request slower.
   */
  const ensureChallengePassed = (): Promise<void> => {
    if (!challenge) {
      challenge = makeGetRequestWithWebView(baseUrl, {}).then(
        () => undefined,
        (err: unknown) => {
          challenge = undefined;
          throw err;
        }
      );
    }
    return challenge;
  };

  /**
   * `parse` of the page at `url`, loaded through the WebView. Two failures pass and are tried
   * again, up to three loads: Chromium's QUIC error (ERR_QUIC_PROTOCOL_ERROR), and while the
   * challenge runs, an API answer that is the challenge page rather than JSON (`parse` throws),
   * which is asked again after a moment.
   */
  const webViewGet = async <T>(
    url: string,
    headers: Record<string, string>,
    parse: (html: string) => T
  ): Promise<T> => {
    for (let attempt = 1; ; attempt++) {
      let html: string;
      try {
        html = (await makeGetRequestWithWebView(url, headers)).html ?? '';
      } catch (err) {
        if (attempt < 3 && String((err as Error)?.message ?? err).includes('QUIC')) continue;
        throw err;
      }
      try {
        return parse(html);
      } catch (err) {
        if (attempt >= 3) throw err;
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  };

  const webViewPage = async (url: string): Promise<CheerioAPI> =>
    webViewGet(url, { Referer: baseUrl }, (html) => load(html));

  const webViewApi = async <T = any>(url: string, referer: string = baseUrl): Promise<T> =>
    webViewGet(
      url,
      {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': referer,
      },
      (html) => webViewJson<T>(html, url)
    );

  const mapEpisode = (session: string, item: any): IAnimeEpisode => ({
    id: `${session}/${item.session}`,
    number: item.episode,
    title: item.title,
    image: item.snapshot,
    duration: item.duration,
    isSubbed: item.audio === 'jpn' || item.audio === 'eng',
    isDubbed: item.audio === 'eng',
    releaseDate: item.created_at,
    url: `${baseUrl}/play/${session}/${item.session}`,
  });

  const fetchEpisodePage = async (session: string, page: number): Promise<{ last_page: number; data: any[] }> =>
    webViewApi(`${baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, `${baseUrl}/anime/${session}`);

  /** @param _page ignored: the site answers a search with one page of results */
  const search = async (query: string, _page: number = 1): Promise<ISearch<IAnimeResult>> => {
    await ensureChallengePassed();
    const data = await webViewApi<{ data: any[] }>(`${baseUrl}/api?m=search&q=${encodeURIComponent(query)}`);
    return {
      results: data.data.map((item: any) => ({
        id: item.session,
        title: item.title,
        image: item.poster,
        rating: item.score,
        releaseDate: item.year,
        type: item.type,
      })),
    };
  };

  /**
   * @param id the anime's session id
   * @param episodePage the page of episodes to list; -1 (the default) lists them all. The number of
   * pages is the info's `episodePages`.
   */
  const fetchAnimeInfo = async (id: string, episodePage: number = -1): Promise<IAnimeInfo> => {
    const $ = await webViewPage(`${baseUrl}/anime/${id}`);
    const animeInfo: IAnimeInfo = { id, title: $('div.title-wrapper > h1 > span').first().text() };

    animeInfo.image = $('div.anime-poster a').attr('href');
    // The site gives the cover as a protocol-relative URL.
    const cover = $('div.anime-cover').attr('data-src');
    animeInfo.cover = cover ? `https:${cover}` : undefined;
    animeInfo.description = $('div.anime-summary').text().trim();
    animeInfo.genres = $('div.anime-genre ul li')
      .map((_, el) => $(el).find('a').attr('title'))
      .get();
    animeInfo.hasSub = true;
    animeInfo.status = toMediaStatus($('div.anime-info p:icontains("Status:") a').text());
    animeInfo.type = $('div.anime-info > p:contains("Type:") > a').text().trim().toUpperCase() as MediaFormat;
    animeInfo.releaseDate = $('div.anime-info > p:contains("Aired:")')
      .text()
      .split('to')[0]!
      .replace('Aired:', '')
      .trim();
    animeInfo.studios = $('div.anime-info > p:contains("Studio:")').text().replace('Studio:', '').trim().split('\n');
    animeInfo.totalEpisodes = parseInt($('div.anime-info > p:contains("Episodes:")').text().replace('Episodes:', ''));

    const relatedCard = (el: any) => {
      const anchor = $(el).find('.col-2 > a');
      const animeId = anchor.attr('href')?.split('/')[2];
      return {
        id: animeId!,
        title: anchor.attr('title')!,
        image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
        url: `${baseUrl}/anime/${animeId}`,
        releaseDate: $(el).find('div.col-9 > a').text().trim(),
        status: toMediaStatus($(el).find('div.col-9 > strong').text()),
      };
    };
    animeInfo.recommendations = $('div.anime-recommendation .col-sm-6').toArray().map(relatedCard);
    animeInfo.relations = $('div.anime-relation .col-sm-6')
      .toArray()
      .map((el) => ({ ...relatedCard(el), relationType: $(el).find('h4 > span').text().trim() }));

    animeInfo.episodes = [];
    if (episodePage < 0) {
      const firstPage = await fetchEpisodePage(id, 1);
      animeInfo.episodePages = firstPage.last_page;
      animeInfo.episodes.push(...firstPage.data.map((item: any) => mapEpisode(id, item)));
      for (let i = 2; i <= firstPage.last_page; i++) {
        animeInfo.episodes.push(...(await fetchEpisodePage(id, i)).data.map((item: any) => mapEpisode(id, item)));
      }
    } else {
      animeInfo.episodes.push(
        ...(await fetchEpisodePage(id, episodePage)).data.map((item: any) => mapEpisode(id, item))
      );
    }

    return animeInfo;
  };

  /** The episode's Kwik players, one per fansub and resolution, with the button's label. */
  const fetchPlayers = async (episodeId: string, subOrDub: SubOrDub) => {
    const $ = await webViewPage(`${baseUrl}/play/${episodeId}`);
    const players = $('div#resolutionMenu > button')
      .toArray()
      .map((el) => ({
        name: serverName('kwik', `${$(el).attr('data-fansub')}-${$(el).attr('data-resolution')}`),
        url: $(el).attr('data-src')!,
        label: $(el).text(),
        isDub: $(el).attr('data-audio') === 'eng',
      }))
      .filter((player) =>
        subOrDub === SubOrDubEnum.DUB ? player.isDub : subOrDub === SubOrDubEnum.SUB ? !player.isDub : true
      );
    const downloads = $('div#pickDownload > a')
      .toArray()
      .map((el) => ({ url: $(el).attr('href')!, quality: $(el).text() }));
    return { players, downloads };
  };

  /**
   * Every player's stream as one source each, labelled with its quality: the servers are the
   * qualities of one stream.
   * @param episodeId `<anime session>/<episode session>`
   * @param server a server name from fetchEpisodeServers, or the start of one, to keep only the
   * servers it names; all of them when omitted
   * @param subOrDub default `SubOrDub.SUB`
   */
  const fetchEpisodeSources = async (
    episodeId: string,
    server?: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<ISource> => {
    const { players, downloads } = await fetchPlayers(episodeId, subOrDub);

    const iSource: ISource = { sources: [], download: downloads };
    for (const player of serversNamed(players, server)) {
      const res = await Kwik(ctx).extract(new PolyURL(player.url), `${baseUrl}/`);
      // Every player is on Kwik, so they all want the same headers.
      iSource.headers = res.headers;
      for (const source of res.sources) {
        iSource.sources.push({ ...source, quality: (player.label.match(/(\d{3,4})p/) || [])[0] });
      }
    }
    return iSource;
  };

  const fetchEpisodeServers = async (
    episodeId: string,
    subOrDub: SubOrDub = SubOrDubEnum.SUB
  ): Promise<IEpisodeServer[]> => {
    const { players } = await fetchPlayers(episodeId, subOrDub);
    return players.map(({ name, url }) => ({ name, url }));
  };

  return {
    ...config,
    capabilities: { aniZipEpisodes: true } as ProviderCapabilities,
    search,
    fetchAnimeInfo,
    fetchEpisodeSources,
    fetchEpisodeServers,
  };
}

export type AnimePaheProviderInstance = ReturnType<typeof createAnimePahe>;
