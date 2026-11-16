import { MediaStatus } from '../../src/models';
import { toMediaStatus } from '../../src/providers/common/media-status';
import { emptySearch } from '../../src/providers/common/search';
import { pickServer } from '../../src/providers/common/servers';

describe('toMediaStatus', () => {
  it.each([
    ['Currently Airing', MediaStatus.ONGOING],
    ['RELEASING', MediaStatus.ONGOING],
    ['On Going', MediaStatus.ONGOING],
    ['Publishing', MediaStatus.ONGOING],
    ['Finished Airing', MediaStatus.COMPLETED],
    ['Completed', MediaStatus.COMPLETED],
    ['Not yet aired', MediaStatus.NOT_YET_AIRED],
    ['NOT_YET_RELEASED', MediaStatus.NOT_YET_AIRED],
    ['not yet published', MediaStatus.NOT_YET_AIRED],
    ['Coming Soon', MediaStatus.NOT_YET_AIRED],
    ['On Hiatus', MediaStatus.HIATUS],
    ['Dropped', MediaStatus.CANCELLED],
    ['discontinued', MediaStatus.CANCELLED],
    ['Axed', MediaStatus.CANCELLED],
    ['Season 2 soon', MediaStatus.UNKNOWN],
  ])('reads %p as %p', (text, status) => {
    expect(toMediaStatus(text)).toBe(status);
  });

  it('leaves the status out when the site shows none', () => {
    expect(toMediaStatus('')).toBeUndefined();
    expect(toMediaStatus('   ')).toBeUndefined();
    expect(toMediaStatus(undefined)).toBeUndefined();
  });
});

describe('emptySearch', () => {
  it('is a last page with no results', () => {
    expect(emptySearch(3)).toEqual({ currentPage: 3, hasNextPage: false, results: [] });
    expect(emptySearch()).toEqual({ currentPage: 1, hasNextPage: false, results: [] });
  });
});

describe('pickServer', () => {
  const servers = [
    { name: 'megacloud-hd-1', url: 'https://a.example/1' },
    { name: 'MegaCloud-HD-2', url: 'https://a.example/2' },
    { name: 'streamwish', url: 'https://b.example/1' },
  ];

  it('picks the first server whose name starts with the requested one, ignoring case', () => {
    expect(pickServer(servers, 'MegaCloud').url).toBe('https://a.example/1');
    expect(pickServer(servers, 'megacloud-hd-2').url).toBe('https://a.example/2');
    expect(pickServer(servers, 'streamwish').url).toBe('https://b.example/1');
  });

  it('picks the first server when none is requested', () => {
    expect(pickServer(servers).url).toBe('https://a.example/1');
  });

  it('names the available servers when the requested one is missing', () => {
    expect(() => pickServer(servers, 'vidhide')).toThrow(
      "Server 'vidhide' not found; available: megacloud-hd-1, MegaCloud-HD-2, streamwish"
    );
    expect(() => pickServer([], 'vidhide')).toThrow('No servers found');
  });
});
