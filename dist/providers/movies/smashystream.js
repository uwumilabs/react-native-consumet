import { MovieParser, TvType, } from '../../models';
import { load } from 'cheerio';
import { SmashyStream as SS } from '../../extractors';
class SmashyStream extends MovieParser {
    constructor() {
        super(...arguments);
        this.name = 'Smashystream';
        this.baseUrl = 'https://embed.smashystream.com';
        this.logo = 'https://smashystream.xyz/logo.png';
        this.classPath = 'MOVIES.SmashyStream';
        this.supportedTypes = new Set([TvType.MOVIE, TvType.TVSERIES]);
        this.search = async () => {
            throw new Error('Method not implemented.');
        };
        this.fetchMediaInfo = async () => {
            throw new Error('Method not implemented.');
        };
        this.fetchEpisodeServers = async (tmdbId, season, episode) => {
            try {
                const epsiodeServers = [];
                let url = `${this.baseUrl}/playere.php?tmdb=${tmdbId}`;
                if (season) {
                    url = `${this.baseUrl}/playere.php?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
                }
                const { data } = await axios.get(url);
                const $ = load(data);
                await Promise.all($('div#_default-servers a.server')
                    .map(async (i, el) => {
                        const streamLink = $(el).attr('data-id') ?? '';
                        epsiodeServers.push({
                            name: $(el).text().replace(/  +/g, ' ').trim(),
                            url: streamLink,
                        });
                    })
                    .get());
                return epsiodeServers;
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.fetchEpisodeSources = async (tmdbId, season, episode, server) => {
            try {
                const servers = await this.fetchEpisodeServers(tmdbId, season, episode);
                const selectedServer = servers.find((s) => s.name.toLowerCase() === server?.toLowerCase());
                if (!selectedServer) {
                    let url = `${this.baseUrl}/playere.php?tmdb=${tmdbId}`;
                    if (season) {
                        url = `${this.baseUrl}/playere.php?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
                    }
                    return {
                        headers: { Referer: this.baseUrl },
                        ...(await new SS(this.proxyConfig, this.adapter).extract(new URL(url))),
                    };
                }
                if (selectedServer.url.includes('/ffix')) {
                    return {
                        headers: { Referer: this.baseUrl },
                        ...(await new SS(this.proxyConfig, this.adapter).extractSmashyFfix(selectedServer.url)),
                    };
                }
                if (selectedServer.url.includes('/watchx')) {
                    return {
                        headers: { Referer: this.baseUrl },
                        ...(await new SS(this.proxyConfig, this.adapter).extractSmashyWatchX(selectedServer.url)),
                    };
                }
                if (selectedServer.url.includes('/nflim')) {
                    return {
                        headers: { Referer: this.baseUrl },
                        ...(await new SS(this.proxyConfig, this.adapter).extractSmashyNFlim(selectedServer.url)),
                    };
                }
                if (selectedServer.url.includes('/fx')) {
                    return {
                        headers: { Referer: this.baseUrl },
                        ...(await new SS(this.proxyConfig, this.adapter).extractSmashyFX(selectedServer.url)),
                    };
                }
                if (selectedServer.url.includes('/cf')) {
                    return {
                        headers: { Referer: this.baseUrl },
                        ...(await new SS(this.proxyConfig, this.adapter).extractSmashyCF(selectedServer.url)),
                    };
                }
                if (selectedServer.url.includes('/eemovie')) {
                    return {
                        headers: { Referer: this.baseUrl },
                        ...(await new SS(this.proxyConfig, this.adapter).extractSmashyEEMovie(selectedServer.url)),
                    };
                }
                return await this.fetchEpisodeSources(selectedServer.url, season, episode, server);
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
    }
}
export default SmashyStream;
//# sourceMappingURL=smashystream.js.map