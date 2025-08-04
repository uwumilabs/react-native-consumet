import { load } from 'cheerio';
import { AnimeParser, MediaStatus, SubOrSub, MediaFormat, } from '../../models';
import { substringAfter, substringBefore, calculateStringSimilarity, kitsuSearchQuery, range } from '../../utils';
import Gogoanime from '../anime/gogoanime';
import Zoro from '../anime/zoro';
import Anify from '../anime/anify';
import Bilibili from '../anime/bilibili';
import { ANIFY_URL } from '../../utils/utils';
class Myanimelist extends AnimeParser {
    /**
     * This class maps myanimelist to kitsu with any other anime provider.
     * kitsu is used for episode images, titles and description.
     * @param provider anime provider (optional) default: Gogoanime
     */
    constructor(provider) {
        super();
        this.name = 'Myanimelist';
        this.baseUrl = 'https://myanimelist.net/';
        this.logo = 'https://en.wikipedia.org/wiki/MyAnimeList#/media/File:MyAnimeList.png';
        this.classPath = 'META.Myanimelist';
        this.anilistGraphqlUrl = 'https://graphql.anilist.co';
        this.kitsuGraphqlUrl = 'https://kitsu.app/api/graphql';
        this.malSyncUrl = 'https://api.malsync.moe';
        this.anifyUrl = ANIFY_URL;
        this.search = async (query, page = 1) => {
            const searchResults = {
                currentPage: page,
                results: [],
            };
            const { data } = await this.client.request({
                method: 'get',
                url: `https://myanimelist.net/anime.php?q=${query}&cat=anime&show=${50 * (page - 1)}`,
                headers: {
                    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
                },
            });
            const $ = load(data);
            const pages = $('.normal_header').find('span').children();
            const maxPage = parseInt(pages.last().text());
            const hasNextPage = page < maxPage;
            searchResults.hasNextPage = hasNextPage;
            $('tr').each((i, item) => {
                const id = $(item).find('.hoverinfo_trigger').attr('href')?.split('anime/')[1].split('/')[0];
                const title = $(item).find('strong').text();
                const description = $(item).find('.pt4').text().replace('...read more.', '...');
                const type = $(item).children().eq(2).text().trim();
                const episodeCount = $(item).children().eq(3).text().trim();
                const score = (parseFloat($(item).children().eq(4).text()) * 10).toFixed(0);
                const imageTmp = $(item).children().first().find('img').attr('data-src');
                const imageUrl = `https://cdn.myanimelist.net/images/anime/${imageTmp?.split('anime/')[1]}`;
                if (title !== '') {
                    searchResults.results.push({
                        id: id ?? '',
                        title: title,
                        image: imageUrl,
                        rating: parseInt(score),
                        description: description,
                        totalEpisodes: parseInt(episodeCount),
                        type: type === 'TV'
                            ? MediaFormat.TV
                            : type === 'TV_SHORT'
                                ? MediaFormat.TV_SHORT
                                : type === 'MOVIE'
                                    ? MediaFormat.MOVIE
                                    : type === 'SPECIAL'
                                        ? MediaFormat.SPECIAL
                                        : type === 'OVA'
                                            ? MediaFormat.OVA
                                            : type === 'ONA'
                                                ? MediaFormat.ONA
                                                : type === 'MUSIC'
                                                    ? MediaFormat.MUSIC
                                                    : type === 'MANGA'
                                                        ? MediaFormat.MANGA
                                                        : type === 'NOVEL'
                                                            ? MediaFormat.NOVEL
                                                            : type === 'ONE_SHOT'
                                                                ? MediaFormat.ONE_SHOT
                                                                : undefined,
                    });
                }
            });
            return searchResults;
        };
        /**
         *
         * @param animeId anime id
         * @param fetchFiller fetch filler episodes
         */
        this.fetchAnimeInfo = async (animeId, dub = false, fetchFiller = false) => {
            try {
                const animeInfo = await this.fetchMalInfoById(animeId);
                const titleWithLanguages = animeInfo?.title;
                let fillerEpisodes;
                if ((this.provider instanceof Zoro || this.provider instanceof Gogoanime) &&
                    !dub &&
                    (animeInfo.status === MediaStatus.ONGOING ||
                        range({ from: 2000, to: new Date().getFullYear() + 1 }).includes(animeInfo.startDate?.year))) {
                    try {
                        animeInfo.episodes = (await new Anify(this.proxyConfig, this.adapter, this.provider.name.toLowerCase()).fetchAnimeInfo(animeId)).episodes?.map((item) => ({
                            id: item.slug,
                            title: item.title,
                            description: item.description,
                            number: item.number,
                            image: item.image,
                        }));
                        animeInfo.episodes?.reverse();
                    }
                    catch (err) {
                        animeInfo.episodes = await this.findAnimeSlug(titleWithLanguages?.english ||
                            titleWithLanguages?.romaji ||
                            titleWithLanguages?.native ||
                            titleWithLanguages?.userPreferred, animeInfo.season, animeInfo.startDate?.year, animeId, dub);
                        animeInfo.episodes = animeInfo.episodes?.map((episode) => {
                            if (!episode.image)
                                episode.image = animeInfo.image;
                            return episode;
                        });
                        return animeInfo;
                    }
                }
                else
                    animeInfo.episodes = await this.findAnimeSlug(titleWithLanguages?.english ||
                        titleWithLanguages?.romaji ||
                        titleWithLanguages?.native ||
                        titleWithLanguages?.userPreferred, animeInfo.season, animeInfo.startDate?.year, animeId, dub);
                if (fetchFiller) {
                    const { data: fillerData } = await this.client({
                        baseURL: `https://raw.githubusercontent.com/saikou-app/mal-id-filler-list/main/fillers/${animeId}.json`,
                        method: 'GET',
                        validateStatus: () => true,
                    });
                    if (!fillerData.toString().startsWith('404')) {
                        fillerEpisodes = [];
                        fillerEpisodes?.push(...fillerData.episodes);
                    }
                }
                animeInfo.episodes = animeInfo.episodes?.map((episode) => {
                    if (!episode.image)
                        episode.image = animeInfo.image;
                    if (fetchFiller && fillerEpisodes?.length > 0 && fillerEpisodes?.length >= animeInfo.episodes.length) {
                        if (fillerEpisodes[episode.number - 1])
                            episode.isFiller = new Boolean(fillerEpisodes?.[episode.number - 1]['filler-bool']).valueOf();
                    }
                    return episode;
                });
                return animeInfo;
            }
            catch (err) {
                console.error(err);
                throw err;
            }
        };
        this.fetchEpisodeSources = async (episodeId, ...args) => {
            try {
                if (episodeId.includes('/') && this.provider instanceof Anify)
                    return new Anify().fetchEpisodeSources(episodeId, args[0], args[1]);
                return this.provider.fetchEpisodeSources(episodeId, ...args);
            }
            catch (err) {
                throw new Error(`Failed to fetch episode sources from ${this.provider.name}: ${err}`);
            }
        };
        this.findAnimeRaw = async (slug, externalLinks) => {
            const findAnime = (await this.provider.search(slug));
            if (findAnime.results.length === 0)
                return [];
            // Sort the retrieved info for more accurate results.
            findAnime.results.sort((a, b) => {
                const targetTitle = slug.toLowerCase();
                let firstTitle;
                let secondTitle;
                if (typeof a.title === 'string')
                    firstTitle = a.title;
                else
                    firstTitle = a.title.english ?? a.title.romaji ?? '';
                if (typeof b.title === 'string')
                    secondTitle = b.title;
                else
                    secondTitle = b.title.english ?? b.title.romaji ?? '';
                const firstRating = calculateStringSimilarity(targetTitle, firstTitle.toLowerCase());
                const secondRating = calculateStringSimilarity(targetTitle, secondTitle.toLowerCase());
                // Sort in descending order
                return secondRating - firstRating;
            });
            // TODO: use much better way than this
            return (await this.provider.fetchAnimeInfo(findAnime.results[0].id));
        };
        this.findAnimeSlug = async (title, season, startDate, malId, dub, externalLinks) => {
            if (this.provider instanceof Anify)
                return (await this.provider.fetchAnimeInfo(malId)).episodes;
            // console.log({ title });
            const slug = title?.replace(/[^0-9a-zA-Z]+/g, ' ');
            let possibleAnime;
            if (malId && !(this.provider instanceof Bilibili)) {
                const malAsyncReq = await this.client({
                    method: 'GET',
                    url: `${this.malSyncUrl}/mal/anime/${malId}`,
                    validateStatus: () => true,
                });
                if (malAsyncReq.status === 200) {
                    const sitesT = malAsyncReq.data.Sites;
                    let sites = Object.values(sitesT).map((v, i) => {
                        const obj = [...Object.values(Object.values(sitesT)[i])];
                        const pages = obj.map((v) => ({
                            page: v.page,
                            url: v.url,
                            title: v.title,
                        }));
                        return pages;
                    });
                    sites = sites.flat();
                    sites.sort((a, b) => {
                        const targetTitle = malAsyncReq.data.title.toLowerCase();
                        const firstRating = calculateStringSimilarity(targetTitle, a.title.toLowerCase());
                        const secondRating = calculateStringSimilarity(targetTitle, b.title.toLowerCase());
                        // Sort in descending order
                        return secondRating - firstRating;
                    });
                    const possibleSource = sites.find((s) => {
                        if (s.page.toLowerCase() === this.provider.name.toLowerCase())
                            if (this.provider instanceof Gogoanime)
                                return dub ? s.title.toLowerCase().includes('dub') : !s.title.toLowerCase().includes('dub');
                            else
                                return true;
                        return false;
                    });
                    if (possibleSource) {
                        try {
                            possibleAnime = await this.provider.fetchAnimeInfo(possibleSource.url.split('/').pop());
                        }
                        catch (err) {
                            console.error(err);
                            possibleAnime = await this.findAnimeRaw(slug);
                        }
                    }
                    else
                        possibleAnime = await this.findAnimeRaw(slug);
                }
                else
                    possibleAnime = await this.findAnimeRaw(slug);
            }
            else
                possibleAnime = await this.findAnimeRaw(slug, externalLinks);
            // To avoid a new request, lets match and see if the anime show found is in sub/dub
            const expectedType = dub ? SubOrSub.DUB : SubOrSub.SUB;
            if (possibleAnime.subOrDub !== SubOrSub.BOTH && possibleAnime.subOrDub !== expectedType) {
                return [];
            }
            if (this.provider instanceof Zoro) {
                // Set the correct episode sub/dub request type
                possibleAnime.episodes.forEach((_, index) => {
                    if (possibleAnime.subOrDub === SubOrSub.BOTH) {
                        possibleAnime.episodes[index].id = possibleAnime.episodes[index].id.replace(`$both`, dub ? '$dub' : '$sub');
                    }
                });
            }
            const possibleProviderEpisodes = possibleAnime.episodes;
            if (typeof possibleProviderEpisodes[0]?.image !== 'undefined' &&
                typeof possibleProviderEpisodes[0]?.title !== 'undefined' &&
                typeof possibleProviderEpisodes[0]?.description !== 'undefined')
                return possibleProviderEpisodes;
            const options = {
                headers: { 'Content-Type': 'application/json' },
                query: kitsuSearchQuery(slug),
            };
            const newEpisodeList = await this.findKitsuAnime(possibleProviderEpisodes, options, season, startDate);
            return newEpisodeList;
        };
        this.findKitsuAnime = async (possibleProviderEpisodes, options, season, startDate) => {
            const kitsuEpisodes = await this.client.post(this.kitsuGraphqlUrl, options);
            const episodesList = new Map();
            if (kitsuEpisodes?.data.data) {
                const { nodes } = kitsuEpisodes.data.data.searchAnimeByTitle;
                if (nodes) {
                    nodes.forEach((node) => {
                        if (node.season === season && node.startDate.trim().split('-')[0] === startDate?.toString()) {
                            const episodes = node.episodes.nodes;
                            for (const episode of episodes) {
                                const i = episode?.number.toString().replace(/"/g, '');
                                let name;
                                let description;
                                let thumbnail;
                                if (episode?.description?.en)
                                    description = episode?.description.en.toString().replace(/"/g, '').replace('\\n', '\n');
                                if (episode?.thumbnail)
                                    thumbnail = episode?.thumbnail.original.url.toString().replace(/"/g, '');
                                if (episode) {
                                    if (episode.titles?.canonical)
                                        name = episode.titles.canonical.toString().replace(/"/g, '');
                                    episodesList.set(i, {
                                        episodeNum: episode?.number.toString().replace(/"/g, ''),
                                        title: name,
                                        description,
                                        thumbnail,
                                    });
                                    continue;
                                }
                                episodesList.set(i, {
                                    episodeNum: undefined,
                                    title: undefined,
                                    description: undefined,
                                    thumbnail,
                                });
                            }
                        }
                    });
                }
            }
            const newEpisodeList = [];
            if (possibleProviderEpisodes?.length !== 0) {
                possibleProviderEpisodes?.forEach((ep, i) => {
                    const j = (i + 1).toString();
                    newEpisodeList.push({
                        id: ep.id,
                        title: ep.title ?? episodesList.get(j)?.title ?? null,
                        image: ep.image ?? episodesList.get(j)?.thumbnail ?? null,
                        number: ep.number,
                        description: ep.description ?? episodesList.get(j)?.description ?? null,
                        url: ep.url ?? null,
                    });
                });
            }
            return newEpisodeList;
        };
        /**
         *
         * @param id anime id
         * @returns anime info without streamable episodes
         */
        this.fetchMalInfoById = async (id) => {
            const animeInfo = {
                id: id,
                title: '',
            };
            const { data } = await this.client.request({
                method: 'GET',
                url: `https://myanimelist.net/anime/${id}`,
                headers: {
                    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
                },
            });
            const $ = load(data);
            const episodes = [];
            const desc = $('[itemprop="description"]').first().text();
            const imageElem = $('[itemprop="image"]').first();
            const image = imageElem.attr('src') || imageElem.attr('data-image') || imageElem.attr('data-src');
            const genres = [];
            const genreDOM = $('[itemprop="genre"]').get();
            genreDOM.forEach((elem) => genres.push($(elem).text()));
            animeInfo.genres = genres;
            animeInfo.image = image;
            animeInfo.description = desc;
            animeInfo.title = {
                english: $('.js-alternative-titles.hide').children().eq(0).text().replace('English: ', '').trim(),
                romaji: $('.title-name').text(),
                native: $('.js-alternative-titles.hide').parent().children().eq(9).text().trim(),
                userPreferred: $('.js-alternative-titles.hide').children().eq(0).text().replace('English: ', '').trim(),
            };
            animeInfo.synonyms = $('.js-alternative-titles.hide')
                .parent()
                .children()
                .eq(8)
                .text()
                .replace('Synonyms:', '')
                .trim()
                .split(',');
            animeInfo.studios = [];
            animeInfo.popularity = parseInt($('.numbers.popularity').text().trim().replace('Popularity #', '').trim());
            const producers = [];
            $('a').each(function (i, link) {
                if ($(link).attr('href')?.includes('producer') && $(link).parent().children().eq(0).text() === 'Producers:') {
                    producers.push($(link).text());
                }
            });
            animeInfo.producers = producers;
            // animeInfo.episodes = episodes;
            const teaserDOM = $('.video-promotion > a');
            if (teaserDOM.length > 0) {
                const teaserURL = $(teaserDOM).attr('href');
                const style = $(teaserDOM).attr('style');
                if (teaserURL) {
                    animeInfo.trailer = {
                        id: substringAfter(teaserURL, 'embed/').split('?')[0],
                        site: 'https://youtube.com/watch?v=',
                        thumbnail: style ? substringBefore(substringAfter(style, "url('"), "'") : '',
                    };
                }
            }
            const ops = $('.theme-songs.js-theme-songs.opnening').find('tr').get();
            const ignoreList = ['Apple Music', 'Youtube Music', 'Amazon Music', 'Spotify'];
            animeInfo.openings = ops.map((element) => {
                //console.log($(element).text().trim());
                const name = $(element).children().eq(1).children().first().text().trim();
                if (!ignoreList.includes(name)) {
                    if ($(element).find('.theme-song-index').length !== 0) {
                        const index = $(element).find('.theme-song-index').text().trim();
                        const band = $(element).find('.theme-song-artist').text().trim();
                        const episodes = $(element).find('.theme-song-episode').text().trim();
                        //console.log($(element).children().eq(1).text().trim().split(index)[1]);
                        return {
                            name: $(element).children().eq(1).text().trim().split(index)[1]?.split(band)[0]?.trim(),
                            band: band.replace('by ', ''),
                            episodes: episodes,
                        };
                    }
                    else {
                        const band = $(element).find('.theme-song-artist').text().trim();
                        const episodes = $(element).find('.theme-song-episode').text().trim();
                        return {
                            name: $(element).children().eq(1).text().trim()?.split(band)[0]?.trim(),
                            band: band.replace('by ', ''),
                            episodes: episodes,
                        };
                    }
                }
            });
            animeInfo.openings = animeInfo.openings.filter(function (element) {
                return element !== undefined;
            });
            const eds = $('.theme-songs.js-theme-songs.ending').find('tr').get();
            animeInfo.endings = eds.map((element) => {
                //console.log($(element).text().trim());
                const name = $(element).children().eq(1).children().first().text().trim();
                if (!ignoreList.includes(name)) {
                    if ($(element).find('.theme-song-index').length !== 0) {
                        const index = $(element).find('.theme-song-index').text().trim();
                        const band = $(element).find('.theme-song-artist').text().trim();
                        const episodes = $(element).find('.theme-song-episode').text().trim();
                        //console.log($(element).children().eq(1).text().trim().split(index)[1]);
                        return {
                            name: $(element).children().eq(1).text().trim().split(index)[1]?.split(band)[0]?.trim(),
                            band: band.replace('by ', ''),
                            episodes: episodes,
                        };
                    }
                    else {
                        const band = $(element).find('.theme-song-artist').text().trim();
                        const episodes = $(element).find('.theme-song-episode').text().trim();
                        return {
                            name: $(element).children().eq(1).text().trim()?.split(band)[0]?.trim(),
                            band: band.replace('by ', ''),
                            episodes: episodes,
                        };
                    }
                }
            });
            animeInfo.endings = animeInfo.endings.filter(function (element) {
                return element !== undefined;
            });
            const description = $('.spaceit_pad').get();
            description.forEach((elem) => {
                const text = $(elem).text().toLowerCase().trim();
                const key = text.split(':')[0];
                const value = substringAfter(text, `${key}:`).trim();
                switch (key) {
                    case 'status':
                        animeInfo.status = this.malStatusToMediaStatus(value);
                        break;
                    case 'episodes':
                        animeInfo.totalEpisodes = parseInt(value);
                        if (isNaN(animeInfo.totalEpisodes))
                            animeInfo.totalEpisodes = 0;
                        break;
                    case 'premiered':
                        animeInfo.season = value.split(' ')[0]?.toUpperCase();
                        break;
                    case 'aired':
                        const dates = value.split('to');
                        if (dates.length >= 2) {
                            const start = dates[0]?.trim();
                            const end = dates[1]?.trim();
                            const startDate = new Date(start);
                            const endDate = new Date(end);
                            if (startDate.toString() !== 'Invalid Date') {
                                animeInfo.startDate = {
                                    day: startDate.getDate(),
                                    month: startDate.getMonth(),
                                    year: startDate.getFullYear(),
                                };
                            }
                            if (endDate.toString() !== 'Invalid Date') {
                                animeInfo.endDate = {
                                    day: endDate.getDate(),
                                    month: endDate.getMonth(),
                                    year: endDate.getFullYear(),
                                };
                            }
                        }
                        break;
                    case 'score':
                        animeInfo.rating = parseFloat(value);
                        break;
                    case 'studios':
                        for (const studio of $(elem).find('a'))
                            animeInfo.studios?.push($(studio).text());
                        break;
                    case 'rating':
                        animeInfo.ageRating = value;
                }
            });
            // Only works on certain animes, so it is unreliable
            // let videoLink = $('.mt4.ar a').attr('href');
            // if (videoLink) {
            //   await this.populateEpisodeList(episodes, videoLink);
            // }
            return animeInfo;
        };
        this.provider = provider || new Gogoanime();
    }
    malStatusToMediaStatus(status) {
        if (status === 'currently airing')
            return MediaStatus.ONGOING;
        else if (status === 'finished airing')
            return MediaStatus.COMPLETED;
        else if (status === 'not yet aired')
            return MediaStatus.NOT_YET_AIRED;
        return MediaStatus.UNKNOWN;
    }
    async populateEpisodeList(episodes, url, count = 1) {
        try {
            const { data } = await this.client.request({
                method: 'get',
                url: `${url}?p=${count}`,
                headers: {
                    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
                },
            });
            let hasEpisodes = false;
            const $ = load(data);
            for (const elem of $('.video-list').toArray()) {
                const href = $(elem).attr('href');
                const image = $(elem).find('img').attr('data-src');
                const titleDOM = $(elem).find('.episode-title');
                const title = titleDOM?.text();
                titleDOM.remove();
                const numberDOM = $(elem).find('.title').text().split(' ');
                let number = 0;
                if (numberDOM.length > 1) {
                    number = Number(numberDOM[1]);
                }
                if (href && href.indexOf('myanimelist.net/anime') > -1) {
                    hasEpisodes = true;
                    episodes.push({
                        id: '',
                        number,
                        title,
                        image,
                    });
                }
            }
            if (hasEpisodes)
                await this.populateEpisodeList(episodes, url, ++count);
        }
        catch (err) {
            console.error(err);
        }
    }
    fetchEpisodeServers(episodeId) {
        return this.provider.fetchEpisodeServers(episodeId);
    }
}
export default Myanimelist;
// (async () => {
//   const mal = new Myanimelist();
//   // const search = await mal.search('one piece');
//   const info = await mal.fetchAnimeInfo('21', true);
//   //console.log(info);
// })();
//# sourceMappingURL=mal.js.map