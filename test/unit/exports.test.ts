import path from 'path';
import ts from 'typescript';
import * as Consumet from '../../src';

// The package entry point's public surface (QA-4). ts-jest only transpiles, so type exports are
// read with the TypeScript compiler instead.
const entry = path.join(__dirname, '../../src/index.tsx');

const VALUES = [
  'ANIME',
  'MOVIES',
  'META',
  'ProviderManager',
  'ExtractorManager',
  'createProviderContext',
  'createExtractorContext',
  'defaultExtractorContext',
  'verifyExtensionCode',
  'IntegrityError',
  'RegistrySignatureError',
  'verifyRegistrySignature',
  'parseSignedRegistry',
  'REGISTRY_SIGNING_KEYS',
  'parseChapterNumber',
  'parseVolumeNumber',
  'sortChaptersForReading',
  'MetaError',
  'ExtensionRegistry',
  'PolyURL',
  'AnimeParser',
  'MovieParser',
  'WatchListType',
];

const TYPES = [
  'ProviderType',
  'ProviderConfig',
  'ProviderContext',
  'ProviderContextConfig',
  'ExtractorContext',
  'ExtractorContextConfig',
  'IVideoExtractor',
  'ExtractorInfo',
  'ExtensionManifest',
  'IAnimeProvider',
  'IMovieProvider',
  'ProviderCapabilities',
  'RegistrySignatureErrorCode',
  'RegistrySignatureOptions',
];

/** Names exported by the entry point that resolve to a type (interface, alias, class or enum). */
function exportedTypes(): Set<string> {
  const configFile = ts.readConfigFile(path.join(__dirname, '../../tsconfig.json'), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.join(__dirname, '../..'));
  const program = ts.createProgram([entry], { ...options, noEmit: true });
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(entry)!)!;
  const types = new Set<string>();
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    if (target.flags & ts.SymbolFlags.Type) types.add(symbol.name);
  }
  return types;
}

describe('public exports', () => {
  it.each(VALUES)('exports %s', (name) => {
    expect((Consumet as Record<string, unknown>)[name]).toBeDefined();
  });

  it.each(['FlixCloud', 'Gofile', 'HubCloud', 'Kwik', 'MegaCloud', 'MegaPlay', 'StreamWish', 'VidHide'])(
    'exports the extractor factory %s',
    (name) => {
      const factory = (Consumet as Record<string, any>)[name];
      expect(typeof factory(Consumet.defaultExtractorContext).extract).toBe('function');
    }
  );

  it('exports the parser base classes that bundled providers extend', () => {
    expect(new Consumet.MOVIES.HiMovies()).toBeInstanceOf(Consumet.MovieParser);
    expect(typeof Consumet.AnimeParser).toBe('function');
  });

  describe('types', () => {
    let types: Set<string>;
    beforeAll(() => {
      types = exportedTypes();
    });

    it.each(TYPES)('exports type %s', (name) => {
      expect(types.has(name)).toBe(true);
    });
  });
});
