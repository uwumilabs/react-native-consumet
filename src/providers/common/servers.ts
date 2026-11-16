import type { IEpisodeServer } from '../../models';

/**
 * The server to load sources from. Server names start with the name of the extractor that reads
 * them (`megacloud-hd-1`), the same rule ExtractorManager resolves them by, so `server` matches
 * the first server whose name starts with it, case-insensitively. Without `server`, the first
 * server. Throws when there is none, or none matches.
 */
export function pickServer<T extends IEpisodeServer>(servers: readonly T[], server?: string): T {
  if (!servers.length) throw new Error('No servers found for this episode');
  if (!server) return servers[0]!;
  const wanted = server.toLowerCase();
  const match = servers.find((candidate) => candidate.name.toLowerCase().startsWith(wanted));
  if (!match) {
    throw new Error(`Server '${server}' not found; available: ${servers.map((s) => s.name).join(', ')}`);
  }
  return match;
}
