import type { IEpisodeServer } from '../../models';
/**
 * The server to load sources from. Server names start with the name of the extractor that reads
 * them (`megacloud-hd-1`), the same rule ExtractorManager resolves them by, so `server` matches
 * the first server whose name starts with it, case-insensitively. Without `server`, the first
 * server. Throws when there is none, or none matches.
 */
export declare function pickServer<T extends IEpisodeServer>(servers: readonly T[], server?: string): T;
//# sourceMappingURL=servers.d.ts.map