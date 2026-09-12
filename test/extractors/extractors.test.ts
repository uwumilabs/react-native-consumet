import {
  GDFlix,
  Gofile,
  HubCloud,
  StreamingServers,
  ExtractorManager,
  ExtensionRegistry,
  defaultExtractors,
  createExtractorContext,
  PolyURL,
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

    const gdflix = GDFlix(ctx);
    expect(gdflix.serverName).toBe('GDFlix');
    expect(typeof gdflix.extract).toBe('function');

    const gofile = Gofile(ctx);
    expect(gofile.serverName).toBe('Gofile');
    expect(typeof gofile.extract).toBe('function');

    const hubcloud = HubCloud(ctx);
    expect(hubcloud.serverName).toBe('HubCloud');
    expect(typeof hubcloud.extract).toBe('function');
  });

  it('should be present in defaultExtractors', () => {
    expect(typeof defaultExtractors.GDFlix).toBe('function');
    expect(typeof defaultExtractors.Gofile).toBe('function');
    expect(typeof defaultExtractors.HubCloud).toBe('function');

    const gd = defaultExtractors.GDFlix();
    expect(gd.serverName).toBe('GDFlix');

    const gf = defaultExtractors.Gofile();
    expect(gf.serverName).toBe('Gofile');

    const hc = defaultExtractors.HubCloud();
    expect(hc.serverName).toBe('HubCloud');
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
