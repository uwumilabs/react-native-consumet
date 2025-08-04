import { load } from 'cheerio';
import { MovieParser, TvType, StreamingServers, } from '../../../models';
import { MegaCloud, MixDrop, VidCloud } from '../../../extractors';
import { getMultiServers, getMultiSources } from './utils';
class MultiStream extends MovieParser {
    constructor(customBaseURL) {
        super(...arguments);
        this.name = 'MultiStream';
        this.baseUrl = 'https://rivestream.org';
        this.apiUrl = 'https://api.themoviedb.org/3';
        this.apiKey = '5201b54eb0968700e693a30576d7d4dc';
        this.logo = 'https://himovies.sx/images/group_1/theme_1/favicon.png';
        this.classPath = 'MOVIES.MultiStream';
        this.supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES]);
        /**
         *
         * @param query search query string
         * @param page page number (default 1) (optional)
         */
        this.search = async (query, page = 1) => {
            const searchUrl = `${this.apiUrl}/search/multi?api_key=${this.apiKey}&language=en-US&page=${page}&include_adult=false&query=${query}`;
            const search = {
                currentPage: page,
                hasNextPage: false,
                results: [],
            };
            try {
                const { data } = await this.client.get(searchUrl);
                if (data.results.length < 1)
                    return search;
                search.hasNextPage = page + 1 <= data.total_pages;
                search.currentPage = page;
                search.totalResults = data.total_results;
                search.totalPages = data.total_pages;
                const moviePromises = data.results.map(async (result) => {
                    const date = new Date(result?.release_date || result?.first_air_date);
                    let totalSeasons = undefined;
                    if (result.media_type === 'tv') {
                        try {
                            const { data: tvData } = await this.client.get(`${this.apiUrl}/tv/${result.id}?api_key=${this.apiKey}&language=en-US`);
                            totalSeasons = tvData.number_of_seasons;
                        }
                        catch (err) {
                            // Continue without seasons data if request fails
                        }
                    }
                    const movie = {
                        id: `${result.id}$${result.media_type}`,
                        title: result?.title || result?.name,
                        image: `https://image.tmdb.org/t/p/original${result?.poster_path}`,
                        type: result.media_type === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
                        rating: result?.vote_average || 0,
                        releaseDate: `${date.getFullYear()}` || '0',
                        seasons: totalSeasons,
                    };
                    return movie;
                });
                search.results = await Promise.all(moviePromises);
                return search;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        /**
         *
         * @param mediaId - The media identifier (TMDB ID with type, e.g., "1071585$movie")
         */
        this.fetchMediaInfo = async (mediaId) => {
            const movieInfo = {
                id: mediaId,
                title: '',
            };
            const parts = mediaId.split('$');
            const type = parts[1];
            mediaId = parts[0];
            const infoUrl = `${this.apiUrl}/${type}/${parts[0]}?api_key=${this.apiKey}&language=en-US&append_to_response=release_dates,images,recommendations,credits,videos`;
            try {
                const { data } = await this.client.get(infoUrl);
                movieInfo.title = data?.title || data?.name;
                movieInfo.image = `https://image.tmdb.org/t/p/original${data?.poster_path}`;
                movieInfo.cover = `https://image.tmdb.org/t/p/original${data?.backdrop_path}`;
                movieInfo.type = type === 'movie' ? TvType.MOVIE : TvType.TVSERIES;
                movieInfo.rating = data?.vote_average || 0;
                movieInfo.releaseDate = data?.release_date || data?.first_air_date;
                movieInfo.description = data?.overview;
                movieInfo.genres = data?.genres.map((genre) => genre.name);
                movieInfo.duration = data?.runtime || data?.episode_run_time[0];
                movieInfo.totalEpisodes = data?.number_of_episodes;
                movieInfo.totalSeasons = data?.number_of_seasons;
                movieInfo.characters = data?.credits?.cast.map((cast) => ({
                    id: cast.id,
                    name: cast.name,
                    url: `https://www.themoviedb.org/person/${cast.id}`,
                    character: cast.character,
                    image: `https://image.tmdb.org/t/p/original${cast.profile_path}`,
                }));
                movieInfo.trailer = {
                    id: data?.videos?.results[0]?.key,
                    site: data?.videos?.results[0]?.site,
                    url: `https://www.youtube.com/watch?v=${data?.videos?.results[0]?.key}`,
                };
                movieInfo.recommendations =
                    data?.recommendations?.results?.length <= 0
                        ? undefined
                        : data?.recommendations?.results.map((result) => {
                            return {
                                id: result.id,
                                title: result.title || result.name,
                                image: `https://image.tmdb.org/t/p/original${result.poster_path}`,
                                type: type === 'movie' ? TvType.MOVIE : TvType.TVSERIES,
                                rating: result.vote_average || 0,
                                releaseDate: result.release_date || result.first_air_date,
                            };
                        });
                if (movieInfo.type === TvType.TVSERIES) {
                    movieInfo.episodes = [];
                    for (let i = 1; i <= data?.number_of_seasons; i++) {
                        const { data } = await this.client.get(`${this.apiUrl}/tv/${mediaId}/season/${i}?api_key=${this.apiKey}`);
                        data.episodes.map((item) => {
                            const episode = {
                                id: `${mediaId}$tv$${item.episode_number}$${item.season_number}$${item.id}`,
                                //first part is mediaId, second is episode number, third is season number, fourth is episode id(to avoid conflicts just in case)
                                title: item.name,
                                number: item.episode_number,
                                season: item.season_number || i,
                                description: item.overview,
                                image: `https://image.tmdb.org/t/p/original${item.still_path}`,
                            };
                            movieInfo.episodes?.push(episode);
                        });
                    }
                }
                else {
                    movieInfo.episodes = [
                        {
                            id: `${mediaId}$movie`,
                            title: movieInfo.title,
                            description: movieInfo.description,
                            image: movieInfo.image,
                            number: 1,
                        },
                    ];
                }
                return movieInfo;
            }
            catch (err) {
                console.log(err);
                throw new Error(err.message);
            }
        };
        /**
         *
         * @param episodeId episode id
         * @param mediaId media id
         * @param server server type (defaults to the first from `fetchEpisodeServers`) (optional)
         */
        this.fetchEpisodeSources = async (episodeId, mediaId, server) => {
            const firstServer = (await this.fetchEpisodeServers(episodeId, mediaId))[0].name;
            return await getMultiSources(episodeId, server ? server : firstServer);
        };
        /**
         *
         * @param episodeId takes episode link or movie id
         * @param mediaId takes movie link or id (found on movie movieInfo object)
         */
        this.fetchEpisodeServers = async (episodeId, mediaId) => {
            try {
                const servers = await getMultiServers(episodeId);
                return servers;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        if (customBaseURL) {
            if (customBaseURL.startsWith('http://') || customBaseURL.startsWith('https://')) {
                this.baseUrl = customBaseURL;
            }
            else {
                this.baseUrl = `http://${customBaseURL}`;
            }
        }
        else {
            this.baseUrl = this.baseUrl;
        }
    }
}
// (async () => {
//   const movie = new MultiStream();
//   const search = await movie.search('jujutsu');
//   const movieInfo = await movie.fetchMediaInfo(search.results[0].id);
//   // const recentTv = await movie.fetchTrendingTvShows();
//   const servers = await movie.fetchEpisodeServers(movieInfo.episodes![0].id, movieInfo.id);
//   console.log(servers);
//   const genre = await movie.fetchEpisodeSources(
//     movieInfo.episodes![0].id,
//     movieInfo.id,
//     servers[0].name as StreamingServers
//   );
//   console.log(genre);
// })();
export default MultiStream;
//# sourceMappingURL=index.js.map