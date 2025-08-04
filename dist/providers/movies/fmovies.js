import { load } from 'cheerio';
import { substringAfter, substringBeforeLast } from '../../utils/utils';
import { MovieParser, TvType, StreamingServers, } from '../../models';
import { StreamTape, VizCloud } from '../../extractors';
class Fmovies extends MovieParser {
    constructor(fmoviesResolver, proxyConfig, apiKey, adapter) {
        super(proxyConfig && proxyConfig.url ? proxyConfig : undefined, adapter);
        this.name = 'Fmovies';
        this.baseUrl = 'https://ww4.fmovies.co';
        this.logo = 'https://s1.bunnycdn.ru/assets/sites/fmovies/logo2.png';
        this.classPath = 'MOVIES.Fmovies';
        this.supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES]);
        this.fmoviesResolver = '';
        this.apiKey = '';
        /**
         *
         * @param query search query string
         * @param page page number (default 1) (optional)
         */
        this.search = async (query, page = 1) => {
            const searchResult = {
                currentPage: page,
                hasNextPage: false,
                results: [],
            };
            try {
                query = query.replace(/[\W_]+/g, '+');
                const vrf = await this.ev(query);
                const { data } = await this.client.get(`${this.baseUrl}/search?keyword=${query}&vrf=${vrf}&page=${page}`);
                const $ = load(data);
                searchResult.hasNextPage = $('.pagination')?.find('.active').next().hasClass('disabled');
                $('.filmlist > div.item').each((i, el) => {
                    const releaseDate = $(el).find('.meta').text();
                    searchResult.results.push({
                        id: $(el).find('a.title').attr('href').slice(1),
                        title: $(el).find('a.title').text(),
                        url: `${this.baseUrl}/${$(el).find('a.title').attr('href').slice(1)}`,
                        image: $(el).find('img').attr('src'),
                        releaseDate: isNaN(parseInt(releaseDate)) ? undefined : parseInt(releaseDate).toString(),
                        seasons: releaseDate.includes('SS') ? parseInt(releaseDate.split('SS')[1]) : undefined,
                        type: $(el).find('i.type').text() === 'Movie' ? TvType.MOVIE : TvType.TVSERIES,
                    });
                });
                return searchResult;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        /**
         *
         * @param mediaId media link or id
         */
        this.fetchMediaInfo = async (mediaId) => {
            if (!mediaId.startsWith(this.baseUrl)) {
                mediaId = `${this.baseUrl}/${mediaId}`;
            }
            const movieInfo = {
                id: mediaId.split('to/').pop(),
                title: '',
                url: mediaId,
            };
            try {
                const { data } = await this.client.get(mediaId);
                const $ = load(data);
                const uid = $('#watch').attr('data-id');
                // TODO
                // const recommendationsArray: IMovieResult[] = [];
                // $(
                //     'div.movie_information > div.container > div.m_i-related > div.film-related > section.block_area > div.block_area-content > div.film_list-wrap > div.flw-item'
                // ).each((i, el) => {
                //     recommendationsArray.push({
                //         id: $(el).find('div.film-poster > a').attr('href')?.slice(1)!,
                //         title: $(el).find('div.film-detail > h3.film-name > a').text(),
                //         image: $(el).find('div.film-poster > img').attr('data-src'),
                //         duration:
                //             $(el).find('div.film-detail > div.fd-infor > span.fdi-duration').text().replace('m', '') ?? null,
                //         type:
                //             $(el).find('div.film-detail > div.fd-infor > span.fdi-type').text().toLowerCase() === 'tv'
                //                 ? TvType.TVSERIES
                //                 : TvType.MOVIE ?? null,
                //     });
                // });
                const container = $('.watch-extra');
                movieInfo.cover = substringBeforeLast(substringAfter($('#watch').find('.play')?.attr('style') ?? '', 'url('), ')');
                movieInfo.title = container.find(`h1[itemprop="name"]`).text();
                movieInfo.image = container.find(`img[itemprop="image"]`).attr('src');
                movieInfo.description = container.find('div[itemprop="description"]')?.text()?.trim();
                movieInfo.type = movieInfo.id.split('/')[0] === 'series' ? TvType.TVSERIES : TvType.MOVIE;
                movieInfo.releaseDate = container.find('span[itemprop="dateCreated"]')?.text()?.trim();
                // TODO
                // movieInfo.genres = $('div.row-line:nth-child(2) > a')
                //     .map((i, el) => $(el).text().split('&'))
                //     .get()
                //     .map(v => v.trim());
                // movieInfo.casts = $('div.row-line:nth-child(5) > a')
                //     .map((i, el) => $(el).text())
                //     .get();
                // movieInfo.tags = $('div.row-line:nth-child(6) > h2')
                //     .map((i, el) => $(el).text())
                //     .get();
                // movieInfo.production = $('div.row-line:nth-child(4) > a:nth-child(2)').text();
                // movieInfo.country = $('div.row-line:nth-child(1) > a:nth-child(2)').text();
                // movieInfo.duration = $('span.item:nth-child(3)').text();
                // movieInfo.rating = parseFloat($('span.item:nth-child(2)').text());
                // movieInfo.recommendations = recommendationsArray as any;
                const ajaxData = (await this.client.get(await this.ajaxReqUrl(uid))).data;
                const $$ = load(ajaxData.html);
                movieInfo.episodes = [];
                $$('.episode').each((i, el) => {
                    const episode = {
                        id: $(el).find('a').attr('data-kname'),
                        title: $(el).find('a')?.attr('title') ?? '',
                    };
                    if (movieInfo.type === TvType.TVSERIES) {
                        episode.number = parseInt($(el).find('a')?.attr('data-kname').split('-')[1]);
                        episode.season = parseInt($(el).find('a')?.attr('data-kname').split('-')[0]);
                    }
                    movieInfo.episodes?.push(episode);
                });
                return movieInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        /**
         *
         * @param episodeId episode id
         * @param mediaId media id
         * @param server server type (default `Vizcloud`) (optional)
         */
        this.fetchEpisodeSources = async (episodeId, mediaId, server = StreamingServers.VizCloud) => {
            if (episodeId.startsWith('http')) {
                const serverUrl = new URL(episodeId);
                switch (server) {
                    case StreamingServers.StreamTape:
                        return {
                            headers: { Referer: serverUrl.href },
                            sources: await new StreamTape().extract(serverUrl),
                        };
                    default:
                        return {
                            headers: { Referer: serverUrl.href },
                            sources: await new VizCloud().extract(serverUrl, this.fmoviesResolver, this.apiKey),
                        };
                }
            }
            try {
                const servers = await this.fetchEpisodeServers(episodeId, mediaId);
                const selectedServer = servers.find((s) => s.name === server);
                if (!selectedServer) {
                    throw new Error(`Server ${server} not found`);
                }
                const { data } = await this.client.get(`${this.baseUrl}/ajax/episode/info?id=${selectedServer.url}`);
                const serverUrl = new URL(await this.decrypt(data.url));
                return await this.fetchEpisodeSources(serverUrl.href, mediaId, server);
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        /**
         *
         * @param episodeId takes episode link or movie id
         * @param mediaId takes movie link or id (found on movie info object)
         */
        this.fetchEpisodeServers = async (episodeId, mediaId) => {
            if (!mediaId.startsWith(this.baseUrl)) {
                mediaId = `${this.baseUrl}/${mediaId}`;
            }
            try {
                const { data } = await this.client.get(mediaId);
                const $ = load(data);
                const uid = $('#watch').attr('data-id');
                const epsiodeServers = [];
                const ajaxData = (await this.client.get(await this.ajaxReqUrl(uid))).data;
                const $$ = load(ajaxData.html);
                const servers = {};
                $$('.server').each((i, el) => {
                    const serverId = $(el).attr('data-id');
                    let serverName = $(el).text().toLowerCase().split('server')[1].trim();
                    if (serverName === 'vidstream') {
                        serverName = 'vizcloud';
                    }
                    servers[serverId] = serverName;
                });
                const el = $$(`a[data-kname="${episodeId}"]`);
                try {
                    const serverString = JSON.parse(el.attr('data-ep'));
                    for (const serverId in serverString) {
                        epsiodeServers.push({
                            name: servers[serverId],
                            url: serverString[serverId],
                        });
                    }
                    return epsiodeServers;
                }
                catch (err) {
                    console.log(err);
                    throw new Error('Episode not found');
                }
            }
            catch (err) {
                throw new Error('Episode not found');
            }
        };
        this.fmoviesResolver = fmoviesResolver ?? this.fmoviesResolver;
        this.apiKey = apiKey ?? this.apiKey;
    }
    async ev(query) {
        const { data } = await this.client.get(`${this.fmoviesResolver}/fmovies-vrf?query=${encodeURIComponent(query)}&apikey=${this.apiKey}`);
        return encodeURIComponent(data.url);
    }
    async decrypt(query) {
        const { data } = await this.client.get(`${this.fmoviesResolver}/fmovies-decrypt?query=${encodeURIComponent(query)}&apikey=${this.apiKey}`);
        return data.url;
    }
    async ajaxReqUrl(id) {
        const vrf = await this.ev(id);
        return `${this.baseUrl}/ajax/film/servers?id=${id}&vrf=${vrf}&token=`;
    }
}
// (async () => {
//     const movie = new Fmovies("https://9anime.enimax.xyz", {url: "https://proxy.vnxservers.com/"}, "848624aaffec43808c86f5e47e3fa5b0");
//     const search = await movie.search('friends');
//     // const search = await movie.fetchMediaInfo('series/friends-3rvj9');
//     // const search = await movie.fetchMediaInfo('movie/chimes-at-midnight-1qvnw');
//     // const search = await movie.fetchEpisodeSources('1-full','movie/chimes-at-midnight-1qvnw');
//     // const search = await movie.fetchMediaInfo('series/friends-3rvj9');
//     // console.log(JSON.stringify(movieInfo));
//     console.log(
//         search
//     );
//     // const recentTv = await movie.fetchTrendingTvShows();
//     // console.log(search);
// })();
export default Fmovies;
//# sourceMappingURL=fmovies.js.map