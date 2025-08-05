"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const models_1 = require("../../models");
class FlameScans extends models_1.MangaParser {
    constructor() {
        super(...arguments);
        this.name = 'FlameScans';
        this.baseUrl = 'https://flamescans.org/';
        this.logo = 'https://i.imgur.com/Nt1MW3H.png';
        this.classPath = 'MANGA.FlameScans';
        /**
         *
         * @param query Search query
         *
         */
        this.search = async (query) => {
            try {
                const { data } = await axios_1.default.get(`${this.baseUrl}/series/?title=${query.replace(/ /g, '%20')}`);
                const $ = (0, cheerio_1.load)(data);
                const searchMangaSelector = '.utao .uta .imgu, .listupd .bs .bsx, .listo .bs .bsx';
                const results = $(searchMangaSelector)
                    .map((i, el) => ({
                    id: $(el).find('a').attr('href')?.split('/series/')[1].replace('/', '') ?? '',
                    title: $(el).find('a').attr('title') ?? '',
                    image: $(el).find('img').attr('src'),
                }))
                    .get();
                return {
                    results: results,
                };
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchMangaInfo = async (mangaId) => {
            const mangaInfo = {
                id: mangaId,
                title: '',
            };
            try {
                const { data } = await axios_1.default.get(`${this.baseUrl}/manga/${mangaId}`);
                const $ = (0, cheerio_1.load)(data);
                // base from https://github.com/tachiyomiorg/tachiyomi-extensions/blob/661311c13b3b550e3fa906c1130b77a037ef7a11/multisrc/src/main/java/eu/kanade/tachiyomi/multisrc/mangathemesia/MangaThemesia.kt#L233
                const seriesTitleSelector = 'h1.entry-title';
                const seriesArtistSelector = ".infotable tr:icontains('artist') td:last-child, .tsinfo .imptdt:icontains('artist') i, .fmed b:icontains('artist')+span, span:icontains('artist')";
                const seriesAuthorSelector = ".infotable tr:icontains('author') td:last-child, .tsinfo .imptdt:icontains('author') i, .fmed b:icontains('author')+span, span:icontains('author')";
                const seriesDescriptionSelector = '.desc, .entry-content[itemprop=description]';
                const seriesAltNameSelector = ".alternative > div, .wd-full:icontains('alt') span, .alter, .seriestualt";
                const seriesGenreSelector = 'div.gnr a, .mgen a, .seriestugenre a';
                const seriesStatusSelector = ".infotable tr:icontains('status') td:last-child, .tsinfo .imptdt:icontains('status') i, .fmed b:icontains('status')+span span:icontains('status')";
                const seriesThumbnailSelector = '.infomanga > div[itemprop=image] img, .thumb img';
                const seriesChaptersSelector = 'div.bxcl li, div.cl li, #chapterlist li, ul li:has(div.chbox):has(div.eph-num)';
                mangaInfo.title = $(seriesTitleSelector).text().trim();
                mangaInfo.altTitles = $(seriesAltNameSelector).text()
                    ? $(seriesAltNameSelector)
                        .first()
                        .text()
                        .split('|')
                        .map((item) => item.replace(/\n/g, ' ').trim())
                    : [];
                mangaInfo.description = $(seriesDescriptionSelector).text().trim();
                mangaInfo.headerForImage = { Referer: this.baseUrl };
                mangaInfo.image = $(seriesThumbnailSelector).attr('src');
                mangaInfo.genres = $(seriesGenreSelector)
                    .map((i, el) => $(el).text())
                    .get();
                switch ($(seriesStatusSelector).text().trim()) {
                    case 'Completed':
                        mangaInfo.status = models_1.MediaStatus.COMPLETED;
                        break;
                    case 'Ongoing':
                        mangaInfo.status = models_1.MediaStatus.ONGOING;
                        break;
                    case 'Dropped':
                        mangaInfo.status = models_1.MediaStatus.CANCELLED;
                        break;
                    default:
                        mangaInfo.status = models_1.MediaStatus.UNKNOWN;
                        break;
                }
                mangaInfo.authors = $(seriesAuthorSelector).text().replace('-', '').trim()
                    ? $(seriesAuthorSelector)
                        .text()
                        .split(',')
                        .map((item) => item.trim())
                    : [];
                mangaInfo.artist = $(seriesArtistSelector).text().trim() ? $(seriesArtistSelector).text().trim() : 'N/A';
                mangaInfo.chapters = $(seriesChaptersSelector)
                    .map((i, el) => ({
                    id: $(el).find('a').attr('href')?.split('/')[3] ?? '',
                    title: $(el).find('.lch a, .chapternum').text().trim().replace(/\n/g, ' '),
                    releasedDate: $(el).find('.chapterdate').text(),
                }))
                    .get();
                return mangaInfo;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchChapterPages = async (chapterId) => {
            try {
                const { data } = await axios_1.default.get(`${this.baseUrl}/${chapterId}`);
                const $ = (0, cheerio_1.load)(data);
                const pageSelector = 'div#readerarea img, #readerarea div.figure_container div.composed_figure';
                const pages = $(pageSelector)
                    .map((i, el) => ({
                    img: $(el).attr('src'),
                    page: i,
                    headerForImage: { Referer: this.baseUrl },
                }))
                    .get();
                return pages;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
    }
}
exports.default = FlameScans;
//# sourceMappingURL=flamescans.js.map