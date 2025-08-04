import { load } from 'cheerio';
import { MangaParser, MediaStatus, } from '../../models';
class AsuraScans extends MangaParser {
    constructor() {
        super(...arguments);
        this.name = 'AsuraScans';
        this.baseUrl = 'https://asuracomic.net';
        this.logo = 'https://asuracomic.net/images/logo.png';
        this.classPath = 'MANGA.AsuraScans';
        this.fetchMangaInfo = async (mangaId) => {
            try {
                const { data } = await this.client.get(`${this.baseUrl}/${mangaId}`);
                const $ = load(data);
                const dom = $('html');
                const topInfoWrapper = dom.find('.relative.col-span-12.space-y-3.px-6');
                const info = {
                    id: mangaId,
                    title: dom.find('.text-xl.font-bold:nth-child(1)').text().trim(),
                    image: $(topInfoWrapper).find('img').attr('src'),
                    rating: $(topInfoWrapper).find('div > div.px-2.py-1 > p').text().trim(),
                    status: this.determineMediaState($(topInfoWrapper).find('div > div.flex.flex-row > div:nth-child(1) > h3:nth-child(2)').text().trim()),
                    description: dom.find('span.font-medium.text-sm').text().trim(),
                    authors: dom
                        .find('.grid.grid-cols-1.gap-5.mt-8 > div:nth-child(2) > h3:nth-child(2)')
                        .text()
                        .trim()
                        .split('/')
                        .map((ele) => ele.trim()),
                    artist: dom.find('.grid.grid-cols-1.gap-5.mt-8 > div:nth-child(3) > h3:nth-child(2)').text().trim(),
                    updatedOn: dom.find('.grid.grid-cols-1.gap-5.mt-8 > div:nth-child(5) > h3:nth-child(2)').text().trim(),
                    genres: dom
                        .find('.space-y-1.pt-4 > div > button')
                        .map((index, ele) => $(ele).text().trim())
                        .get(),
                    recommendations: dom
                        .find('.grid.grid-cols-2.gap-3.p-4 > a')
                        .map((index, ele) => {
                        return {
                            id: $(ele).attr('href'),
                            title: $(ele).find('div > h2.font-bold').text().trim(),
                            image: $(ele).find('div > div > img').attr('src'),
                            latestChapter: $(ele).find('div > h2:nth-child(3)').text().trim(),
                            status: this.determineMediaState($(ele).find('div > div:nth-child(1) > span').text().trim()),
                            rating: $(ele).find('div > div.block > span > label').text().trim(),
                        };
                    })
                        .get(),
                };
                const chapMatch = data
                    .replace(/\n/g, '')
                    .replace(/\\/g, '')
                    .match(/"chapters".*:(\[\{.*?\}\]),/);
                if (chapMatch) {
                    const chap = JSON.parse(chapMatch[1]);
                    info.chapters = chap.map((ele) => {
                        return {
                            id: ele.name,
                            title: ele.title !== '' ? ele.title : `Chapter ${ele.name}`,
                            releaseDate: ele.published_at,
                        };
                    });
                }
                return info;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchChapterPages = async (chapterId) => {
            try {
                const { data } = await this.client.get(`${this.baseUrl}/series/${chapterId}`);
                const chapMatch = data.replace(/\\/g, '').match(/pages.*:(\[{['"]order["'].*?}\])/);
                if (!chapMatch)
                    throw new Error('Parsing error');
                const chap = JSON.parse(chapMatch[1]);
                return chap.map((page, index) => ({
                    page: index + 1,
                    img: page.url,
                }));
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        /**
         *
         * @param query Search query
         */
        this.search = async (query, page = 1) => {
            try {
                const formattedQuery = encodeURI(query.toLowerCase());
                const { data } = await this.client.get(`${this.baseUrl}/series?page=${page}&name=${formattedQuery}`);
                const $ = load(data);
                const dom = $('html');
                const results = dom
                    .find('.grid.grid-cols-2.gap-3.p-4 > a')
                    .map((index, ele) => {
                    return {
                        id: $(ele).attr('href'),
                        title: $(ele).find('div > div > div:nth-child(2) > span:nth-child(1)').text().trim(),
                        image: $(ele).find('div > div > div:nth-child(1) > img').attr('src'),
                        status: this.determineMediaState($(ele).find('div > div > div:nth-child(1) > span').text().trim()),
                        latestChapter: $(ele).find('div > div > div:nth-child(2) > span:nth-child(2)').text().trim(),
                        rating: $(ele).find('div > div > div:nth-child(2) > span:nth-child(3) > label').text().trim(),
                    };
                })
                    .get();
                const searchResults = {
                    currentPage: page,
                    hasNextPage: dom.find('.flex.items-center.justify-center > a').attr('style')
                        .split('pointer-events:')[1]
                        .slice(1, -1) === 'auto'
                        ? true
                        : false,
                    results: results,
                };
                return searchResults;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
    }
    determineMediaState(state) {
        switch (state.toLowerCase().trim()) {
            case 'completed':
                return MediaStatus.COMPLETED;
            case 'ongoing':
                return MediaStatus.ONGOING;
            case 'dropped':
                return MediaStatus.CANCELLED;
            default:
                return MediaStatus.UNKNOWN;
        }
    }
}
export default AsuraScans;
//# sourceMappingURL=asurascans.js.map