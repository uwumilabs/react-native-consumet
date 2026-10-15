import registry from '../../src/extension-registry.json';
import { ExtractorManager } from '../../src/utils/ExtractorManager';

const extractorEntry = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  version: '1.0.0',
  main: `https://raw.githubusercontent.com/o/r/refs/heads/main/registry/extractors/${name.toLowerCase()}/1.0.0.js`,
  sha256: 'f'.repeat(64),
  ...extra,
});
const managerWith = (...extractors: object[]) => new ExtractorManager({ extensions: [], extractors } as any);

describe('extractor names from the registry (EXT-4)', () => {
  it('resolves suffixed server names for an extractor that exists only in the registry', () => {
    const manager = managerWith(extractorEntry('NewHost'));

    expect(manager.extractBaseExtractorName('newhost-hd-1')).toBe('newhost');
    expect(manager.getExtractorMetadata('NewHost-HD-2')?.name).toBe('NewHost');
  });

  it('resolves aliases declared in the registry', () => {
    const manager = managerWith(extractorEntry('NewHost', { aliases: ['nh'] }));

    expect(manager.extractBaseExtractorName('nh-backup')).toBe('newhost');
    expect(manager.getExtractorMetadata('nh-backup')?.name).toBe('NewHost');
  });

  it('prefers the longest matching name', () => {
    const manager = managerWith(extractorEntry('Mega'), extractorEntry('MegaCloud'));

    expect(manager.extractBaseExtractorName('megacloud-hd-1')).toBe('megacloud');
    expect(manager.extractBaseExtractorName('mega-1')).toBe('mega');
  });

  it('keeps the built-in aliases for registries without an aliases field', () => {
    const manager = managerWith(extractorEntry('MegaCloud'));
    expect(manager.extractBaseExtractorName('akcloud-x')).toBe('megacloud');
  });

  it('resolves the server names providers use today', () => {
    const manager = new ExtractorManager(registry as any);

    expect(manager.extractBaseExtractorName('kwik-pahe')).toBe('kwik');
    expect(manager.extractBaseExtractorName('megaplay-hd-1')).toBe('megaplay');
    expect(manager.extractBaseExtractorName('MegaCloud')).toBe('megacloud');
    expect(manager.extractBaseExtractorName('upcloud')).toBe('megacloud');
    expect(manager.extractBaseExtractorName('HD-1')).toBeNull();
  });
});
