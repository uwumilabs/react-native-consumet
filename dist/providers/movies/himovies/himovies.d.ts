import { MovieParser } from '../../../models';
declare class HiMovies extends MovieParser {
    private instance;
    logo: string;
    constructor(customBaseURL?: string);
    get supportedTypes(): any;
    get name(): any;
    get baseUrl(): string;
    set baseUrl(value: string);
    get classPath(): any;
    search(...args: any[]): any;
    fetchRecentMovies(): any;
    fetchRecentTvShows(): any;
    fetchTrendingMovies(): any;
    fetchTrendingTvShows(): any;
    fetchByCountry(...args: any[]): any;
    fetchByGenre(...args: any[]): any;
    fetchMediaInfo(...args: any[]): any;
    fetchEpisodeSources(...args: any[]): any;
    fetchEpisodeServers(...args: any[]): any;
}
export default HiMovies;
//# sourceMappingURL=himovies.d.ts.map