import { load } from 'cheerio';
import { AnimeParser, MediaStatus, MediaFormat, SubOrSub, } from '../../models';
import { Kwik } from '../../extractors';
import { bypassDdosGuard, getDdosGuardCookiesWithWebView } from '../../NativeConsumet';
class AnimePahe extends AnimeParser {
    constructor() {
        super();
        this.name = 'AnimePahe';
        this.baseUrl = 'https://animepahe.ru';
        this.logo = 'https://animepahe.com/pikacon.ico';
        this.classPath = 'ANIME.AnimePahe';
        this.ddgCookie = null;
        /**
         * @param query Search query
         */
        this.search = async (query) => {
            try {
                if (!this.ddgCookie) {
                    await this.initDdgCookie();
                }
                const { data } = await this.client.get(`${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`, {
                    headers: this.Headers(false),
                });
                const res = {
                    results: data.data.map((item) => ({
                        id: item.session,
                        title: item.title,
                        image: item.poster,
                        rating: item.score,
                        releaseDate: item.year,
                        type: item.type,
                    })),
                };
                return res;
            }
            catch (err) {
                console.log(err);
                throw new Error(err.message);
            }
        };
        /**
         * @param id id format id/session
         * @param episodePage Episode page number (optional) default: -1 to get all episodes. number of episode pages can be found in the anime info object
         */
        this.fetchAnimeInfo = async (id, episodePage = -1) => {
            const animeInfo = {
                id: id,
                title: '',
            };
            try {
                if (!this.ddgCookie) {
                    await this.initDdgCookie();
                }
                const res = await fetch(`${this.baseUrl}/anime/${id}`, {
                    headers: this.Headers(id),
                });
                const data = await res.text();
                const $ = load(data);
                animeInfo.title = $('div.title-wrapper > h1 > span').first().text();
                animeInfo.image = $('div.anime-poster a').attr('href');
                animeInfo.cover = `https:${$('div.anime-cover').attr('data-src')}`;
                animeInfo.description = $('div.anime-summary').text().trim();
                animeInfo.genres = $('div.anime-genre ul li')
                    .map((i, el) => $(el).find('a').attr('title'))
                    .get();
                animeInfo.hasSub = true;
                switch ($('div.anime-info p:icontains("Status:") a').text().trim()) {
                    case 'Currently Airing':
                        animeInfo.status = MediaStatus.ONGOING;
                        break;
                    case 'Finished Airing':
                        animeInfo.status = MediaStatus.COMPLETED;
                        break;
                    default:
                        animeInfo.status = MediaStatus.UNKNOWN;
                }
                animeInfo.type = $('div.anime-info > p:contains("Type:") > a').text().trim().toUpperCase();
                animeInfo.releaseDate = $('div.anime-info > p:contains("Aired:")')
                    .text()
                    .split('to')[0]
                    .replace('Aired:', '')
                    .trim();
                animeInfo.studios = $('div.anime-info > p:contains("Studio:")').text().replace('Studio:', '').trim().split('\n');
                animeInfo.totalEpisodes = parseInt($('div.anime-info > p:contains("Episodes:")').text().replace('Episodes:', ''));
                animeInfo.recommendations = [];
                $('div.anime-recommendation .col-sm-6').each((i, el) => {
                    animeInfo.recommendations?.push({
                        id: $(el).find('.col-2 > a').attr('href')?.split('/')[2],
                        title: $(el).find('.col-2 > a').attr('title'),
                        image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
                        url: `${this.baseUrl}/anime/${$(el).find('.col-2 > a').attr('href')?.split('/')[2]}`,
                        releaseDate: $(el).find('div.col-9 > a').text().trim(),
                        status: $(el).find('div.col-9 > strong').text().trim(),
                    });
                });
                animeInfo.relations = [];
                $('div.anime-relation .col-sm-6').each((i, el) => {
                    animeInfo.relations?.push({
                        id: $(el).find('.col-2 > a').attr('href')?.split('/')[2],
                        title: $(el).find('.col-2 > a').attr('title'),
                        image: $(el).find('.col-2 > a > img').attr('src') || $(el).find('.col-2 > a > img').attr('data-src'),
                        url: `${this.baseUrl}/anime/${$(el).find('.col-2 > a').attr('href')?.split('/')[2]}`,
                        releaseDate: $(el).find('div.col-9 > a').text().trim(),
                        status: $(el).find('div.col-9 > strong').text().trim(),
                        relationType: $(el).find('h4 > span').text().trim(),
                    });
                });
                animeInfo.episodes = [];
                if (episodePage < 0) {
                    const { data: { last_page, data }, } = await this.client.get(`${this.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`, {
                        headers: this.Headers(id),
                    });
                    animeInfo.episodePages = last_page;
                    animeInfo.episodes.push(...data.map((item) => ({
                        id: `${id}/${item.session}`,
                        number: item.episode,
                        title: item.title,
                        image: item.snapshot,
                        duration: item.duration,
                        isSubbed: item.audio === 'jpn' || item.audio === 'eng',
                        isDubbed: item.audio === 'eng',
                        releaseDate: item.created_at,
                        url: `${this.baseUrl}/play/${id}/${item.session}`,
                    })));
                    for (let i = 1; i < last_page; i++) {
                        animeInfo.episodes.push(...(await this.fetchEpisodes(id, i + 1)));
                    }
                }
                else {
                    animeInfo.episodes.push(...(await this.fetchEpisodes(id, episodePage)));
                }
                return animeInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        /**
         *
         * @param episodeId Episode id
         * @param subOrDub sub or dub (default `SubOrSub.SUB`) (optional)
         */
        this.fetchEpisodeSources = async (episodeId, subOrDub = SubOrSub.SUB) => {
            try {
                if (!this.ddgCookie) {
                    await this.initDdgCookie();
                }
                const { data } = await this.client.get(`${this.baseUrl}/play/${episodeId}`, {
                    headers: this.Headers(episodeId.split('/')[0]),
                });
                const $ = load(data);
                const links = $('div#resolutionMenu > button').map((i, el) => ({
                    url: $(el).attr('data-src'),
                    quality: $(el).text(),
                    audio: $(el).attr('data-audio'),
                }));
                const downloads = $('div#pickDownload > a')
                    .map((i, el) => ({
                    url: $(el).attr('href'),
                    quality: $(el).text(),
                }))
                    .get();
                const iSource = {
                    headers: {
                        Referer: 'https://kwik.cx/',
                    },
                    sources: [],
                };
                for (const link of links) {
                    const res = await new Kwik(this.proxyConfig).extract(new URL(link.url));
                    res[0].quality = link.quality;
                    res[0].isDub = link.audio === 'eng';
                    // Only include sources that match the requested SubOrSub type
                    if ((subOrDub === SubOrSub.DUB && res[0].isDub) || (subOrDub === SubOrSub.SUB && !res[0].isDub)) {
                        iSource.sources.push(res[0]);
                    }
                }
                // If no sources were found after filtering, include all sources as fallback
                // if (iSource.sources.length === 0) {
                //   for (const link of links) {
                //     const res = await new Kwik(this.proxyConfig).extract(new URL(link.url));
                //     res[0]!.quality = link.quality;
                //     res[0]!.isDub = link.audio === 'eng';
                //     iSource.sources.push(res[0]!);
                //   }
                // }
                iSource.download = downloads;
                return iSource;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchEpisodes = async (session, page) => {
            const res = await this.client.get(`${this.baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`, {
                headers: this.Headers(session),
            });
            const epData = res.data.data;
            return [
                ...epData.map((item) => ({
                    id: `${session}/${item.session}`,
                    number: item.episode,
                    title: item.title,
                    image: item.snapshot,
                    duration: item.duration,
                    isSubbed: item.audio === 'jpn' || item.audio === 'eng',
                    isDubbed: item.audio === 'eng',
                    releaseDate: item.created_at,
                    url: `${this.baseUrl}/play/${session}/${item.session}`,
                })),
            ];
        };
        /**
         * @deprecated
         * @attention AnimePahe doesn't support this method
         */
        this.fetchEpisodeServers = (episodeLink) => {
            throw new Error('Method not implemented.');
        };
        this.initDdgCookie();
    }
    async initDdgCookie() {
        try {
            try {
                this.ddgCookie = await getDdosGuardCookiesWithWebView(this.baseUrl);
                // console.log('DDoS-Guard cookie obtained (WebView):', this.ddgCookie);
            }
            catch (err) {
                // console.error('Failed to bypass DDoS-Guard with WebView:', err);
                this.ddgCookie = await bypassDdosGuard(this.baseUrl);
                // console.log('DDoS-Guard cookie obtained (fallback):', this.ddgCookie);
            }
        }
        catch (error) {
            console.error('Failed to initialize DDoS-Guard cookie:', error);
        }
    }
    Headers(sessionId) {
        const headers = {
            'authority': 'animepahe.ru',
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'x-requested-with': 'XMLHttpRequest',
            'Referer': sessionId ? `${this.baseUrl}/anime/${sessionId}` : `${this.baseUrl}`,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        };
        if (this.ddgCookie) {
            headers.Cookie =
                typeof this.ddgCookie === 'object' && this.ddgCookie !== null ? this.ddgCookie.cookie : this.ddgCookie || '';
        }
        return headers;
    }
}
export default AnimePahe;
// (async () => {
//   const animepahe = new AnimePahe();
//   const anime = await animepahe.search('Classroom of the elite');
//   const info = await animepahe.fetchAnimeInfo(anime.results[0].id);
//   // console.log(info);
//   const sources = await animepahe.fetchEpisodeSources(info.episodes![0].id);
//   console.log(sources);
// })();
//# sourceMappingURL=animepahe.js.map