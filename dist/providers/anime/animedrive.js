import { load } from 'cheerio';
import axios, {} from 'axios';
import { AnimeParser, MediaStatus, MediaFormat, } from '../../models';
class AnimeDrive extends AnimeParser {
    constructor() {
        super(...arguments);
        this.name = 'AnimeDrive';
        this.baseUrl = 'https://animedrive.hu';
        this.logo = 'https://cdn.rcd.gg/PreMiD/websites/A/AnimeDrive/assets/logo.png';
        this.classPath = 'ANIME.animedrive';
        /**
         * @param query Search query
         * @param page Page number (optional)
         */
        this.search = async (query, page = 1) => {
            try {
                const { data } = await this.client.get(`${this.baseUrl}/search/?q=${decodeURIComponent(query)}&p=${page}`);
                const $ = load(data);
                const hasNextPage = $('.nk-pagination.nk-pagination-center > nav > a.nk-pagination-current-white').next('a').length > 0;
                const searchResults = [];
                $('div.row.row--grid .card')
                    .slice(1)
                    .each((i, el) => {
                    const id = $(el)
                        .find('div.card__content > h3.card__title > a')
                        .attr('href')
                        ?.replace('https://animedrive.hu/anime/?id=', '');
                    const title = $(el).find('div.card__content > h3.card__title > a').text();
                    const image = $(el).find('div.card__cover > div.nk-image-box-1-a > img').attr('src');
                    const url = $(el).find('div.card__content > h3.card__title > a').attr('href');
                    const subOrDub = 'sub'; // there is no hungarian dub for animes sadly
                    if (id && title && image && url) {
                        searchResults.push({ id, title, image, url, subOrDub });
                    }
                });
                return {
                    currentPage: page,
                    hasNextPage: hasNextPage,
                    results: searchResults,
                };
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        /**
         * @param id Anime id
         */
        this.fetchAnimeInfo = async (id) => {
            const info = {
                id: id,
                title: '',
            };
            try {
                const { data } = await this.client.get(`${this.baseUrl}/anime/?id=${id}`);
                const $ = load(data);
                info.title = $('div.col-sm-12.col-md-8.col-lg-9 > h2').text();
                info.image = $('div.nk-image-box-1-a.col-12 > img').attr('src');
                info.description = $('div.col-sm-12.col-md-8.col-lg-9 > p.col-12').text().trim();
                const typeText = $('table.animeSpecs.left td:contains("TÍPUS:")').next('td').text().trim();
                info.type = this.parseType(typeText);
                info.releaseYear = $('table.animeSpecs.left td:contains("KIADÁS:")').next('td').text().trim();
                const statusText = $('table.animeSpecs.left td:contains("STÁTUSZ:")').next('td').text().trim();
                info.status = this.parseStatus(statusText);
                const totalEpisodesWithSlash = $('table.animeSpecs.right td:contains("RÉSZEK:")').next('td').text().trim();
                const totalEpisodesWithoutSlash = totalEpisodesWithSlash.split('/')[0].trim();
                info.totalEpisodes = parseInt(totalEpisodesWithoutSlash);
                info.url = `${this.baseUrl}/anime/?id=${id}`;
                info.episodes = [];
                const episodes = Array.from({ length: info.totalEpisodes }, (_, i) => i + 1);
                episodes.forEach((_, i) => {
                    info.episodes?.push({
                        id: `?id=${id}&ep=${i + 1}`,
                        number: i + 1,
                        title: `${info.title} Episode ${i + 1}`,
                        url: `${this.baseUrl}/watch/?id=${id}&ep=${i + 1}`,
                    });
                });
                return info;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        /**
         * @param page Page number
         */
        this.fetchRecentEpisodes = async (page = 1) => {
            try {
                const { data } = await this.client.get(`${this.baseUrl}/latest-added?page=${page}`);
                const $ = load(data);
                const hasNextPage = !$('.pagination > nav > ul > li').last().hasClass('disabled');
                const recentEpisodes = [];
                $('div.film_list-wrap > div').each((i, el) => {
                    const id = $(el).find('div.film-poster > a').attr('href')?.replace('/watch/', '');
                    const image = $(el).find('div.film-poster > img').attr('data-src');
                    const title = $(el).find('div.film-poster > img').attr('alt');
                    const url = `${this.baseUrl}${$(el).find('div.film-poster > a').attr('href')}`;
                    const episode = parseInt($(el).find('div.tick-eps').text().replace('EP ', '').split('/')[0]);
                    if (id && image && title && url && !isNaN(episode)) {
                        recentEpisodes.push({ id, image, title, url, episode });
                    }
                });
                return {
                    currentPage: page,
                    hasNextPage: hasNextPage,
                    results: recentEpisodes,
                };
            }
            catch (err) {
                throw new Error('Something went wrong. Please try again later.');
            }
        };
        /**
         *
         * @param episodeId episode id
         */
        this.fetchEpisodeSources = async (episodeId) => {
            const headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Dnt': '1',
                'Referer': 'https://animedrive.hu/',
                'Sec-Ch-Ua': '"Not(A:Brand";v="24", "Chromium";v="122"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'iframe',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-site',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            };
            try {
                const response = await axios.get(`https://player.animedrive.hu/player_v1.5.php${episodeId}`, { headers });
                const $ = load(response.data);
                const htmlData = response.data;
                const sourcesDataMatch = /sources:\s*\[\s*(.*?)\s*\],?\s*poster:/.exec(htmlData);
                const sources = [];
                if (sourcesDataMatch) {
                    const sourcesData = sourcesDataMatch[1];
                    const sourceRegex = /{\s*src:\s*'(.*?)'.*?type:\s*'(.*?)'.*?size:\s*(\d+),?\s*}/g;
                    let match;
                    while ((match = sourceRegex.exec(sourcesData)) !== null) {
                        const url = match[1];
                        const size = match[3];
                        const quality = `${size}p`;
                        const isM3U8 = false; // it's always an mp4 file
                        sources.push({ url: url, quality: quality, isM3U8: isM3U8 });
                    }
                }
                const convertedSources = sources.map((wa) => ({
                    url: wa.url,
                    quality: wa.quality,
                    isM3U8: wa.isM3U8,
                }));
                return { sources: convertedSources }; // Ensure sources matches ISource's definition
            }
            catch (err) {
                console.log(err);
                throw new Error('Something went wrong. Please try again later.');
            }
        };
        /**
         * @deprecated Use fetchEpisodeSources instead
         */
        this.fetchEpisodeServers = (_episodeId) => {
            throw new Error('Method not implemented.');
        };
    }
    parseType(typeText) {
        switch (typeText) {
            case 'Sorozat':
                return MediaFormat.TV;
            case 'Film':
                return MediaFormat.MOVIE;
            case 'Special':
                return MediaFormat.SPECIAL;
            case 'OVA':
                return MediaFormat.OVA;
            default:
                return MediaFormat.TV;
        }
    }
    parseStatus(statusText) {
        switch (statusText) {
            case 'Fut':
                return MediaStatus.ONGOING;
            case 'Befejezett':
                return MediaStatus.COMPLETED;
            case 'Hamarosan':
                return MediaStatus.NOT_YET_AIRED;
            default:
                return MediaStatus.UNKNOWN;
        }
    }
}
export default AnimeDrive;
//# sourceMappingURL=animedrive.js.map