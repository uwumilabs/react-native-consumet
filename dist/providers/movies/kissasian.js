import { load } from 'cheerio';
import { MovieParser, TvType, StreamingServers, MediaStatus, } from '../../models';
import { Mp4Upload, StreamWish, VidMoly } from '../../extractors';
class KissAsian extends MovieParser {
    constructor() {
        super(...arguments);
        this.name = 'KissAsian';
        this.baseUrl = 'https://kissasian.mx';
        this.logo = 'https://kissasian.mx/Content/images/logo.png';
        this.classPath = 'MOVIES.KissAsian';
        this.supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES]);
        this.search = async (query, page = 1) => {
            try {
                const searchResult = {
                    currentPage: page,
                    hasNextPage: false,
                    results: [],
                };
                const response = await this.client.post(`${this.baseUrl}/Search/Drama`, `keyword=${query.replace(/[\W_]+/g, '-')}`, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });
                const $ = load(response.data);
                $('div.item-list > div.list').each((i, el) => {
                    searchResult.results.push({
                        id: $(el).find('div.info > p > a').attr('href')?.slice(1),
                        title: $(el).find('div.info > p > a').text().trim(),
                        url: `${this.baseUrl}${$(el).find('div.info > p > a').attr('href')}`,
                        image: `${this.baseUrl}${$(el).find('div.cover > a > img').attr('src')}`,
                    });
                });
                if (searchResult.results.length === 0) {
                    searchResult.results.push({
                        id: response.request.res.responseUrl.replace(/https?:\/\/[^\/]*\/?/i, ''),
                        title: $('div.content').first().find('div.heading > h3').text().trim(),
                        url: response.request.res.responseUrl,
                        image: `${this.baseUrl}${$('div.content').first().find('div.cover > img').attr('src')}`,
                    });
                }
                return searchResult;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchMediaInfo = async (mediaId) => {
            try {
                const realMediaId = mediaId;
                if (!mediaId.startsWith(this.baseUrl))
                    mediaId = `${this.baseUrl}/${mediaId}`;
                const mediaInfo = {
                    id: '',
                    title: '',
                };
                const { data } = await this.client.post(mediaId, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });
                const $ = load(data);
                mediaInfo.id = realMediaId;
                mediaInfo.title = $('div.content').first().find('div.heading > h3').text().trim();
                mediaInfo.image = `${this.baseUrl}${$('div.content').first().find('div.cover > img').attr('src')}`;
                mediaInfo.otherNames = $('span:contains(Other name:)')
                    .siblings()
                    .map((i, el) => $(el).text().trim())
                    .get();
                mediaInfo.description = $('div.summary1 > p').text().trim();
                mediaInfo.releaseDate = $('span:contains(Date aired:)')
                    .parent()
                    .text()
                    .split('Date aired:')
                    .pop()
                    ?.replace(/\t/g, '')
                    .replace(/\n/g, '')
                    .trim();
                mediaInfo.genre = $('span:contains(Genres:)')
                    .siblings('a')
                    .map((i, el) => $(el).text().trim())
                    .get();
                mediaInfo.country = $('span:contains(Country:)').siblings('a').text().trim();
                switch ($('span:contains(Status:)').parent().text().split('Status:').pop()?.trim()) {
                    case 'Ongoing':
                        mediaInfo.status = MediaStatus.ONGOING;
                        break;
                    case 'Completed':
                        mediaInfo.status = MediaStatus.COMPLETED;
                        break;
                    case 'Cancelled':
                        mediaInfo.status = MediaStatus.CANCELLED;
                        break;
                    case 'Unknown':
                        mediaInfo.status = MediaStatus.UNKNOWN;
                        break;
                    default:
                        mediaInfo.status = MediaStatus.UNKNOWN;
                        break;
                }
                mediaInfo.episodes = [];
                $('ul.list li.episodeSub').each((i, el) => {
                    mediaInfo.episodes?.push({
                        id: $(el).find('a').attr('href')?.slice(1),
                        title: $(el).find('a').text().trim(),
                        episode: $(el).find('a').text()?.split('Episode').pop()?.trim(),
                        url: `${this.baseUrl}${$(el).find('a').attr('href')}`,
                    });
                });
                mediaInfo.episodes.reverse();
                return mediaInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchEpisodeSources = async (episodeId, server = StreamingServers.Mp4Upload) => {
            if (episodeId.startsWith('http')) {
                const serverUrl = new URL(episodeId);
                switch (server) {
                    case StreamingServers.VidMoly:
                        return {
                            sources: await new VidMoly(this.proxyConfig, this.adapter).extract(serverUrl),
                        };
                    case StreamingServers.StreamWish:
                        return {
                            ...(await new StreamWish(this.proxyConfig, this.adapter).extract(serverUrl)),
                        };
                    case StreamingServers.Mp4Upload:
                        return {
                            sources: await new Mp4Upload(this.proxyConfig, this.adapter).extract(serverUrl),
                        };
                    default:
                        throw new Error('Server not supported');
                }
            }
            try {
                const servers = await this.fetchEpisodeServers(episodeId);
                const i = servers.findIndex((s) => s.name.toLowerCase() === server.toLowerCase());
                if (i === -1) {
                    throw new Error(`Server ${server} not found`);
                }
                const serverUrl = new URL(servers.filter((s) => s.name.toLowerCase() === server.toLowerCase())[0].url);
                return await this.fetchEpisodeSources(serverUrl.href, server);
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
    }
    async fetchEpisodeServers(episodeId) {
        try {
            const episodeServers = [];
            const { data } = await this.client.post(`${this.baseUrl}/${episodeId}`, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const $ = load(data);
            episodeServers.push({
                name: $('ul.mirrorTab > li > a.actived').text().trim(),
                url: $('iframe#mVideo').attr('src'),
            });
            await Promise.all($('ul.mirrorTab > li > a.ign').map(async (i, ele) => {
                const { data } = await this.client.post(`${this.baseUrl}${$(ele).attr('href')}`, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });
                const $$ = load(data);
                if ($$('ul.mirrorTab > li > a.actived').text().trim()) {
                    const url = $$('iframe#mVideo').attr('src');
                    episodeServers.push({
                        name: $$('ul.mirrorTab > li > a.actived').text().trim(),
                        url: url.startsWith('https') ? url : url.replace('//', 'https://'),
                    });
                }
            }));
            episodeServers.map((element) => {
                switch (element.name) {
                    case 'VM':
                        element.name = StreamingServers.VidMoly;
                        break;
                    case 'SW':
                        element.name = StreamingServers.StreamWish;
                        break;
                    case 'MP':
                        element.name = StreamingServers.Mp4Upload;
                        break;
                    default:
                        break;
                }
            });
            return episodeServers;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
}
export default KissAsian;
//# sourceMappingURL=kissasian.js.map