import { load } from 'cheerio';
import { MovieParser, TvType, StreamingServers, } from '../../models';
import { MixDrop, VidCloud } from '../../extractors';
class MovieHdWatch extends MovieParser {
    constructor() {
        super(...arguments);
        this.name = 'MovieHdWatch';
        this.baseUrl = 'https://movieshd.watch';
        this.logo = 'https://img.movieshd.watch/xxrz/400x400/100/ee/63/ee6317c38904ee048676164b0852207d/ee6317c38904ee048676164b0852207d.png';
        this.classPath = 'MOVIES.MovieHdWatch';
        this.supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES]);
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
                const { data } = await this.client.get(`${this.baseUrl}/search/${query.replace(/[\W_]+/g, '-')}?page=${page}`);
                const $ = load(data);
                const navSelector = 'div.pre-pagination:nth-child(3) > nav:nth-child(1) > ul:nth-child(1)';
                searchResult.hasNextPage =
                    $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;
                $('.film_list-wrap > div.flw-item').each((i, el) => {
                    const releaseDate = $(el).find('div.film-detail > div.film-infor > span:nth-child(2)').text();
                    const duration = $(el).find('div.film-detail > div.film-infor > span:nth-child(4)').text();
                    searchResult.results.push({
                        id: $(el).find('div.film-poster > a').attr('href')?.slice(1) ?? '',
                        title: $(el).find('div.film-detail > h2 > a').attr('title') ?? '',
                        url: `${this.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                        image: $(el).find('div.film-poster > img').attr('data-src'),
                        releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
                        seasons: releaseDate.includes('SS') ? parseInt(releaseDate.split('SS')[1]) : undefined,
                        duration: !duration.includes('EPS') ? duration : undefined,
                        type: $(el).find('div.film-poster > a').attr('href')?.includes('tv/') ? TvType.TVSERIES : TvType.MOVIE,
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
            if (mediaId.startsWith(this.baseUrl)) {
                mediaId = mediaId.replace(this.baseUrl + '/', '');
            }
            try {
                const { data } = await this.client.get(`${this.baseUrl}/${mediaId}`);
                const $ = load(data);
                const recommendationsArray = [];
                const movieInfo = {
                    id: mediaId,
                    title: '',
                    url: `${this.baseUrl}/${mediaId}`,
                };
                const uid = $('.detail_page-watch').attr('data-id');
                movieInfo.cover = $('div.dp-w-cover').attr('style')?.slice(22).replace(')', '').replace(';', '');
                movieInfo.title = $('.heading-name > a:nth-child(1)').text();
                movieInfo.image = $('.film-poster > img').attr('src');
                movieInfo.description = $('.description')
                    .text()
                    .replace(/(\r\n|\n|\r)/gm, '')
                    .trim();
                movieInfo.type = movieInfo.id.split('/')[0] === 'tv' ? TvType.TVSERIES : TvType.MOVIE;
                movieInfo.releaseDate = $('div.elements').find('div.row-line').first().text().replace('Released: ', '').trim();
                movieInfo.genres = $('div.row-line:nth-child(2)')
                    .first()
                    .find('a')
                    .map((i, el) => $(el).text().split('&'))
                    .get()
                    .map((v) => v.trim());
                movieInfo.casts = $('div.row-line:nth-child(3)')
                    .first()
                    .find('a')
                    .map((i, el) => $(el).attr('title'))
                    .get();
                movieInfo.production = $('div.row-line:nth-child(3)')
                    .last()
                    .find('a')
                    .map((i, el) => $(el).attr('title'))
                    .get()
                    .join();
                movieInfo.country = $('div.row-line:nth-child(2)')
                    .last()
                    .find('a')
                    .map((i, el) => $(el).attr('title'))
                    .get();
                movieInfo.duration = $('div.row-line:nth-child(1)')
                    .last()
                    .text()
                    .replace(/(\r\n|\n| |\r)/gm, '')
                    .replace('Duration:', '')
                    .trim();
                movieInfo.rating = parseFloat($('div.dp-i-stats > span.item.mr-2').text().replace('IMDB: ', ''));
                $('div.film_list-wrap > div.flw-item').each((i, el) => {
                    const releaseDate = $(el).find('div.film-detail > div.film-infor > span:nth-child(2)').text();
                    const duration = $(el).find('div.film-detail > div.film-infor > span:nth-child(4)').text();
                    recommendationsArray.push({
                        id: $(el).find('div.film-poster > a').attr('href')?.slice(1),
                        title: $(el).find('div.film-detail > h3.film-name > a').text(),
                        image: $(el).find('div.film-poster > img').attr('data-src'),
                        releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
                        seasons: releaseDate.includes('SS') ? parseInt(releaseDate.split('SS')[1]) : undefined,
                        duration: !duration.includes('EPS') ? duration : undefined,
                        type: $(el).find('div.film-poster > a').attr('href')?.includes('tv/') ? TvType.TVSERIES : TvType.MOVIE,
                    });
                });
                movieInfo.recommendations = recommendationsArray;
                const ajaxReqUrl = (id, type, isSeasons = false) => `${this.baseUrl}/ajax/${type === 'movie' ? type : `v2/${type}`}/${isSeasons ? 'seasons' : 'episodes'}/${id}`;
                if (movieInfo.type === TvType.TVSERIES) {
                    const { data } = await this.client.get(ajaxReqUrl(uid, 'tv', true));
                    const $$ = load(data);
                    const seasonsIds = $$('.dropdown-menu > a')
                        .map((i, el) => $(el).attr('data-id'))
                        .get();
                    movieInfo.episodes = [];
                    let season = 1;
                    for (const id of seasonsIds) {
                        const { data } = await this.client.get(ajaxReqUrl(id, 'season'));
                        const $$$ = load(data);
                        $$$('.nav > li')
                            .map((i, el) => {
                            const episode = {
                                id: $$$(el).find('a').attr('id').split('-')[1],
                                title: $$$(el).find('a').attr('title'),
                                number: parseInt($$$(el).find('a').attr('title').split(':')[0].slice(3).trim()),
                                season: season,
                                url: `${this.baseUrl}/ajax/v2/episode/servers/${$$$(el).find('a').attr('id').split('-')[1]}`,
                            };
                            movieInfo.episodes?.push(episode);
                        })
                            .get();
                        season++;
                    }
                }
                else {
                    movieInfo.episodes = [
                        {
                            id: uid,
                            title: movieInfo.title,
                            url: `${this.baseUrl}/ajax/movie/episodes/${uid}`,
                        },
                    ];
                }
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
         * @param server server type (default `VidCloud`) (optional)
         */
        this.fetchEpisodeSources = async (episodeId, mediaId, server = StreamingServers.UpCloud) => {
            if (episodeId.startsWith('http')) {
                const serverUrl = new URL(episodeId);
                switch (server) {
                    case StreamingServers.MixDrop:
                        return {
                            headers: { Referer: serverUrl.href },
                            sources: await new MixDrop(this.proxyConfig, this.adapter).extract(serverUrl),
                        };
                    case StreamingServers.VidCloud:
                        return {
                            headers: { Referer: serverUrl.href },
                            ...(await new VidCloud(this.proxyConfig, this.adapter).extract(serverUrl, true)),
                        };
                    case StreamingServers.UpCloud:
                        return {
                            headers: { Referer: serverUrl.href },
                            ...(await new VidCloud(this.proxyConfig, this.adapter).extract(serverUrl)),
                        };
                    default:
                        return {
                            headers: { Referer: serverUrl.href },
                            sources: await new MixDrop(this.proxyConfig, this.adapter).extract(serverUrl),
                        };
                }
            }
            try {
                const servers = await this.fetchEpisodeServers(episodeId, mediaId);
                const i = servers.findIndex((s) => s.name.toLowerCase() === server.toLowerCase());
                if (i === -1) {
                    throw new Error(`Server ${server} not found`);
                }
                const serverUrl = new URL(servers.filter((s) => s.name.toLowerCase() === server.toLowerCase())[0].url);
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
            if (!episodeId.startsWith(this.baseUrl + '/ajax') && !mediaId.includes('movie'))
                episodeId = `${this.baseUrl}/ajax/v2/episode/servers/${episodeId}`;
            else
                episodeId = `${this.baseUrl}/ajax/movie/episodes/${episodeId}`;
            try {
                const { data } = await this.client.get(episodeId);
                const $ = load(data);
                const servers = [];
                await Promise.all($('.nav > li').map(async (i, el) => {
                    const server = {
                        name: $(el).find('a').attr('title').slice(6).trim(),
                        url: `${this.baseUrl}/${mediaId}.${!mediaId.includes('movie') ? $(el).find('a').attr('data-id') : $(el).find('a').attr('data-linkid')}`.replace(!mediaId.includes('movie') ? /\/tv\// : /\/movie\//, !mediaId.includes('movie') ? '/watch-tv/' : '/watch-movie/'),
                    };
                    const { data } = await this.client.get(`${this.baseUrl}/ajax/get_link/${server.url.split('.').slice(-1).shift()}`);
                    const serverUrl = new URL(data.link);
                    server.url = serverUrl.href;
                    servers.push(server);
                }));
                return servers;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchRecentMovies = async () => {
            try {
                const { data } = await this.client.get(`${this.baseUrl}/home`);
                const $ = load(data);
                const movies = $('.section-id-02')
                    .find('div.flw-item')
                    .map((i, el) => {
                    const releaseDate = $(el).find('div.film-detail > div.film-infor > span:nth-child(2)').text();
                    const duration = $(el).find('div.film-detail > div.film-infor > span:nth-child(4)').text();
                    const movie = {
                        id: $(el).find('div.film-poster > a').attr('href')?.slice(1) ?? '',
                        title: $(el).find('div.film-detail > h3.film-name > a').attr('title') ?? '',
                        url: `${this.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                        image: $(el).find('div.film-poster > img').attr('data-src'),
                        releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
                        duration: !duration.includes('EPS') ? duration : undefined,
                        type: $(el).find('div.film-poster > a').attr('href')?.includes('movie/') ? TvType.MOVIE : TvType.TVSERIES,
                    };
                    return movie;
                })
                    .get();
                return movies;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchRecentTvShows = async () => {
            try {
                const { data } = await this.client.get(`${this.baseUrl}/home`);
                const $ = load(data);
                const tvshows = $('.section-id-03')
                    .find('div.flw-item')
                    .map((i, el) => {
                    const tvshow = {
                        id: $(el).find('div.film-poster > a').attr('href')?.slice(1) ?? '',
                        title: $(el).find('div.film-detail > h3.film-name > a').attr('title') ?? '',
                        url: `${this.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                        image: $(el).find('div.film-poster > img').attr('data-src'),
                        season: $(el).find('div.film-detail > div.film-infor > span:nth-child(2)').text(),
                        latestEpisode: $(el).find('div.film-detail > div.film-infor > span:nth-child(4)').text(),
                        type: $(el).find('div.film-poster > a').attr('href')?.includes('tv/') ? TvType.TVSERIES : TvType.MOVIE,
                    };
                    return tvshow;
                })
                    .get();
                return tvshows;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchTrendingMovies = async () => {
            try {
                const { data } = await this.client.get(`${this.baseUrl}/home`);
                const $ = load(data);
                const movies = $('#trending-movies')
                    .find('div.flw-item')
                    .map((i, el) => {
                    const releaseDate = $(el).find('div.film-detail > div.film-infor > span:nth-child(2)').text();
                    const duration = $(el).find('div.film-detail > div.film-infor > span:nth-child(4)').text();
                    const movie = {
                        id: $(el).find('div.film-poster > a').attr('href')?.slice(1) ?? '',
                        title: $(el).find('div.film-detail > h3.film-name > a').attr('title') ?? '',
                        url: `${this.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                        image: $(el).find('div.film-poster > img').attr('data-src'),
                        releaseDate: isNaN(parseInt(releaseDate)) ? undefined : releaseDate,
                        duration: !duration.includes('EPS') ? duration : undefined,
                        type: $(el).find('div.film-poster > a').attr('href')?.includes('movie/') ? TvType.MOVIE : TvType.TVSERIES,
                    };
                    return movie;
                })
                    .get();
                return movies;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchTrendingTvShows = async () => {
            try {
                const { data } = await this.client.get(`${this.baseUrl}/home`);
                const $ = load(data);
                const tvshows = $('#trending-tv')
                    .find('div.flw-item')
                    .map((i, el) => {
                    const tvshow = {
                        id: $(el).find('div.film-poster > a').attr('href')?.slice(1) ?? '',
                        title: $(el).find('div.film-detail > h3.film-name > a').attr('title') ?? '',
                        url: `${this.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                        image: $(el).find('div.film-poster > img').attr('data-src'),
                        season: $(el).find('div.film-detail > div.film-infor > span:nth-child(2)').text(),
                        latestEpisode: $(el).find('div.film-detail > div.film-infor > span:nth-child(4)').text(),
                        type: $(el).find('div.film-poster > a').attr('href')?.includes('tv/') ? TvType.TVSERIES : TvType.MOVIE,
                    };
                    return tvshow;
                })
                    .get();
                return tvshows;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchByCountry = async (country, page = 1) => {
            const result = {
                currentPage: page,
                hasNextPage: false,
                results: [],
            };
            const navSelector = 'div.pre-pagination:nth-child(3) > nav:nth-child(1) > ul:nth-child(1)';
            try {
                const { data } = await this.client.get(`${this.baseUrl}/country/${country}/?page=${page}`);
                const $ = load(data);
                result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;
                $('div.container > section.block_area > div.block_area-content > div.film_list-wrap > div.flw-item')
                    .each((i, el) => {
                    const resultItem = {
                        id: $(el).find('div.film-poster > a').attr('href')?.slice(1) ?? '',
                        title: $(el).find('div.film-detail > h2.film-name > a').attr('title') ?? '',
                        url: `${this.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                        image: $(el).find('div.film-poster > img').attr('data-src'),
                        type: $(el).find('div.film-poster > a').attr('href')?.includes('movie/') ? TvType.MOVIE : TvType.TVSERIES,
                    };
                    const season = $(el).find('div.film-detail > div.film-infor > span:nth-child(2)').text();
                    const latestEpisode = $(el).find('div.film-detail > div.film-infor > span:nth-child(4)').text() ?? null;
                    if (resultItem.type === TvType.TVSERIES) {
                        resultItem.season = season;
                        resultItem.latestEpisode = latestEpisode;
                    }
                    else {
                        resultItem.releaseDate = season;
                        resultItem.duration = latestEpisode;
                    }
                    result.results.push(resultItem);
                })
                    .get();
                return result;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchByGenre = async (genre, page = 1) => {
            const result = {
                currentPage: page,
                hasNextPage: false,
                results: [],
            };
            try {
                const { data } = await this.client.get(`${this.baseUrl}/genre/${genre}?page=${page}`);
                const $ = load(data);
                const navSelector = 'div.pre-pagination:nth-child(3) > nav:nth-child(1) > ul:nth-child(1)';
                result.hasNextPage = $(navSelector).length > 0 ? !$(navSelector).children().last().hasClass('active') : false;
                $('.film_list-wrap > div.flw-item')
                    .each((i, el) => {
                    const resultItem = {
                        id: $(el).find('div.film-poster > a').attr('href')?.slice(1) ?? '',
                        title: $(el).find('div.film-detail > h2.film-name > a').attr('title') ?? '',
                        url: `${this.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`,
                        image: $(el).find('div.film-poster > img').attr('data-src'),
                        type: $(el).find('div.film-poster > a').attr('href')?.includes('movie/') ? TvType.MOVIE : TvType.TVSERIES,
                    };
                    const season = $(el).find('div.film-detail > div.film-infor > span:nth-child(2)').text();
                    const latestEpisode = $(el).find('div.film-detail > div.film-infor > span:nth-child(4)').text() ?? null;
                    if (resultItem.type === TvType.TVSERIES) {
                        resultItem.season = season;
                        resultItem.latestEpisode = latestEpisode;
                    }
                    else {
                        resultItem.releaseDate = season;
                        resultItem.duration = latestEpisode;
                    }
                    result.results.push(resultItem);
                })
                    .get();
                return result;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
    }
}
// (async () => {
//   const movie = new MovieHdWatch();
//   const genre = await movie.fetchByGenre('drama');
//   console.log(genre)
// })();
export default MovieHdWatch;
//# sourceMappingURL=moviehdwatch.js.map