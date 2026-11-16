import {
  GDFlix,
  Gofile,
  HubCloud,
  StreamingServers,
  ExtractorManager,
  ExtensionRegistry,
  defaultExtractors,
  createExtractorContext,
} from '../../src';

describe('New Extractors: GDFlix, Gofile, HubCloud', () => {
  it('should export GDFlix, Gofile, HubCloud from the main package', () => {
    expect(typeof GDFlix).toBe('function');
    expect(typeof Gofile).toBe('function');
    expect(typeof HubCloud).toBe('function');
  });

  it('should include GDFlix, Gofile, HubCloud in StreamingServers enum', () => {
    expect(StreamingServers.GDFlix).toBe('gdflix');
    expect(StreamingServers.Gofile).toBe('gofile');
    expect(StreamingServers.HubCloud).toBe('hubcloud');
  });

  it('should instantiate extractors via factory and have extract method', () => {
    const ctx = createExtractorContext();

    expect(typeof GDFlix(ctx).extract).toBe('function');
    expect(typeof Gofile(ctx).extract).toBe('function');
    expect(typeof HubCloud(ctx).extract).toBe('function');
  });

  it('should be present in defaultExtractors', () => {
    expect(typeof defaultExtractors.GDFlix).toBe('function');
    expect(typeof defaultExtractors.Gofile).toBe('function');
    expect(typeof defaultExtractors.HubCloud).toBe('function');

    expect(typeof defaultExtractors.GDFlix().extract).toBe('function');
    expect(typeof defaultExtractors.Gofile().extract).toBe('function');
    expect(typeof defaultExtractors.HubCloud().extract).toBe('function');
  });

  it('should be registered in ExtractorManager', () => {
    const manager = new ExtractorManager(ExtensionRegistry);

    const gdMeta = manager.getExtractorMetadata('gdflix');
    expect(gdMeta).toBeDefined();
    expect(gdMeta?.name).toBe('GDFlix');

    const gfMeta = manager.getExtractorMetadata('gofile');
    expect(gfMeta).toBeDefined();
    expect(gfMeta?.name).toBe('Gofile');

    const hcMeta = manager.getExtractorMetadata('hubcloud');
    expect(hcMeta).toBeDefined();
    expect(hcMeta?.name).toBe('HubCloud');
  });
});
