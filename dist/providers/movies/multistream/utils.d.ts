import type { IEpisodeServer, ISource, ProviderContext } from '../../../models';
/**
 * MultiStream ids, built and read only here: `<tmdbId>$movie` for a movie (its media id and its one
 * episode id), `<tmdbId>$tv` for a show, and `<tmdbId>$tv$<episode>$<season>$<tmdbEpisodeId>` for a
 * show's episode (the TMDB episode id keeps ids unique).
 */
export declare const toMediaId: (tmdbId: string | number, type: string) => string;
export declare const toEpisodeId: (tmdbId: string | number, episode: number, season: number, tmdbEpisodeId: number) => string;
export declare const parseId: (id: string) => {
    tmdbId: string;
    type: string;
    episode: string | undefined;
    season: string | undefined;
};
export declare function getMultiServers(ctx: ProviderContext, id: string): Promise<IEpisodeServer[]>;
/**
 * The sources of one server (`pickServer`'s rule; the first server when omitted), the headers its
 * site needs, and the subtitles every site gave.
 */
export declare function getMultiSources(ctx: ProviderContext, id: string, server?: string): Promise<ISource>;
//# sourceMappingURL=utils.d.ts.map