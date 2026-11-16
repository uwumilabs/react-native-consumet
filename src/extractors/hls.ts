import type { IVideo } from '../models';

/** `uri` from a playlist, resolved against the URL of the playlist that lists it. */
function resolveUri(uri: string, playlistUrl: string): string {
  if (/^https?:\/\//i.test(uri)) return uri;
  if (uri.startsWith('//')) return `${playlistUrl.split('//')[0]}${uri}`;
  if (uri.startsWith('/')) return `${playlistUrl.match(/^https?:\/\/[^/?#]+/i)?.[0] ?? ''}${uri}`;
  return `${playlistUrl.split(/[?#]/)[0]!.replace(/[^/]*$/, '')}${uri}`;
}

/**
 * The variant streams an HLS master playlist lists, one per `#EXT-X-STREAM-INF`, labelled by
 * their height (`1080p`).
 *
 * Empty when `playlist` is not a master, and when the master lists its audio as separate
 * renditions (`#EXT-X-MEDIA:TYPE=AUDIO` with a `URI`): its variants are then video only, and a
 * player given one plays without sound. Return the master alone then; the player picks the
 * quality and the audio language from it.
 */
export function hlsVariants(playlist: unknown, masterUrl: string): IVideo[] {
  if (typeof playlist !== 'string') return [];
  const lines = playlist.split('\n').map((line) => line.trim());
  const separateAudio = lines.some(
    (line) => line.startsWith('#EXT-X-MEDIA:') && line.includes('TYPE=AUDIO') && line.includes('URI=')
  );
  if (separateAudio) return [];

  const variants: IVideo[] = [];
  lines.forEach((line, i) => {
    const uri = lines[i + 1];
    if (!line.startsWith('#EXT-X-STREAM-INF') || !uri || uri.startsWith('#')) return;
    const height = line.match(/RESOLUTION=\d+x(\d+)/)?.[1];
    variants.push({
      url: resolveUri(uri, masterUrl),
      isM3U8: true,
      quality: height ? `${height}p` : `quality_${variants.length + 1}`,
    });
  });
  return variants;
}
