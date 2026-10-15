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
  'MetaError',
  'ExtensionRegistry',
  'PolyURL',
  'FlixCloud',
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

  it('exports FlixCloud as an extractor factory', () => {
    const extractor = Consumet.FlixCloud(Consumet.defaultExtractorContext);
    expect(typeof extractor.extract).toBe('function');
  });

  it('exports the parser base classes that bundled providers extend', () => {
    expect(new Consumet.MOVIES.HiMovies()).toBeInstanceOf(Consumet.MovieParser);
    expect(typeof Consumet.AnimeParser).toBe('function');
  });

  it('exports WatchListType values', () => {
    expect(Consumet.WatchListType.WATCHING).toBe('watching');
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
