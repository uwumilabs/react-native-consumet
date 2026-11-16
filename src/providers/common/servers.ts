import type { IEpisodeServer } from '../../models';

/**
 * The name of an episode server: the name of the extractor (or file host) that reads it, then the
 * site's label for it, lower-cased with spaces as dashes (`megacloud-hd-1`). Without a label, the
 * extractor's name alone. pickServer and ExtractorManager match names by that prefix.
 */
export function serverName(extractor: string, label: string = ''): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  return slug ? `${extractor}-${slug}` : extractor;
}

/**
 * The servers `server` names: those whose name starts with it, case-insensitively (server names
 * start with the name of the extractor that reads them, the rule ExtractorManager resolves them
 * by). Every server when `server` is omitted. Throws when there is none, or none matches.
 */
export function serversNamed<T extends IEpisodeServer>(servers: readonly T[], server?: string): T[] {
  if (!servers.length) throw new Error('No servers found for this episode');
  if (!server) return [...servers];
  const wanted = server.toLowerCase();
  const matches = servers.filter((candidate) => candidate.name.toLowerCase().startsWith(wanted));
  if (!matches.length) {
    throw new Error(`Server '${server}' not found; available: ${servers.map((s) => s.name).join(', ')}`);
  }
  return matches;
}

/** The server to load sources from: the first one `server` names (see serversNamed), or the first server. */
export function pickServer<T extends IEpisodeServer>(servers: readonly T[], server?: string): T {
  return serversNamed(servers, server)[0]!;
}
