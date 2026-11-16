import fs from 'fs';
import path from 'path';
import registry from '../../src/extension-registry.json';
import { ProviderManager } from '../../src/utils/ProviderManager';
import { ExtractorManager } from '../../src/utils/ExtractorManager';

const { registryLayout } = require('../../scripts/registry-paths');

// Every registry entry must load from its published file with integrity checks on.
const readDist = (main: string) => {
  const relative = main.replace(/.*\/refs\/heads\/[^/]+\//, '');
  return fs.readFileSync(path.join(__dirname, '../..', relative), 'utf8');
};

describe('registry URLs are immutable (REG-1)', () => {
  const { entriesOf, entryKey, publishedFile, publishedUrl } = registryLayout();

  const entries: [string, string, any][] = entriesOf(registry).map(({ kind, entry }: any) => [
    entryKey(kind, entry),
    kind,
    entry,
  ]);

  test.each(entries)('%s points at its published version', (_key, kind, entry) => {
    expect(entry.main).toBe(publishedUrl(publishedFile(kind, entry)));
  });
});

describe('registry entries load from their published files with integrity checks', () => {
  // The three mirrors share one file; each entry must still get its own platform.
  test.each(registry.extensions.map((e) => [e.id, e] as const))('extension %s', async (_id, entry) => {
    const instance: any = await new ProviderManager(registry as any).executeProviderCode(readDist(entry.main), entry as any);
    expect(instance.name).toBe(entry.name);
    expect(typeof instance.search).toBe('function');
  });

  test.each(registry.extractors.map((e) => [e.name, e] as const))('extractor %s', async (_name, entry) => {
    const extractor = await new ExtractorManager(registry as any).executeExtractorCode(
      readDist(entry.main),
      entry as any
    );
    expect(typeof extractor.extract).toBe('function');
  });
});
