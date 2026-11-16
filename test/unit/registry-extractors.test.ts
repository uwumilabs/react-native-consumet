import fs from 'fs';
import path from 'path';
import registry from '../../src/extension-registry.json';

// An extension's registry `extractors` tell apps which registry extractors its code runs, so the
// list must name exactly the ones the bundled source calls through ctx.extractors.

const srcDir = path.join(__dirname, '../../src');

/** The source of a bundle and of every module it inlines (its relative imports, apart from src/models). */
function bundledSource(file: string, seen = new Set<string>()): string {
  if (seen.has(file)) return '';
  seen.add(file);
  const code = fs.readFileSync(file, 'utf8');
  const imports = [...code.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)].map(([, spec]) => path.resolve(path.dirname(file), spec!));
  return [
    code,
    ...imports
      .filter((target) => !target.startsWith(path.join(srcDir, 'models')))
      .map((target) => [`${target}.ts`, path.join(target, 'index.ts')].find((candidate) => fs.existsSync(candidate)))
      .filter((target): target is string => Boolean(target))
      .map((target) => bundledSource(target, seen)),
  ].join('\n');
}

/** The extractors `code` takes from its context: `const { A, B } = extractors` or `extractors.A`. */
function calledExtractors(code: string): string[] {
  const names = new Set<string>();
  for (const [, list] of code.matchAll(/\{([^{}]*)\}\s*=\s*(?:ctx\.)?extractors\b/g)) {
    for (const binding of list!.split(',')) {
      const name = binding.split(':')[0]!.trim();
      if (name) names.add(name);
    }
  }
  for (const [, name] of code.matchAll(/\bextractors\.([A-Za-z_$][\w$]*)/g)) names.add(name!);
  return [...names].sort();
}

const sourceOf = (distFile: string) =>
  path.join(srcDir, path.relative('dist/bundles', distFile).replace(/\.js$/, '.ts'));

describe("registry extensions list the extractors their code calls", () => {
  it.each(registry.extensions.map((entry) => [entry.id, entry] as const))('%s', (_id, entry) => {
    const called = calledExtractors(bundledSource(sourceOf(entry.distFile)));
    expect(called).toEqual([...entry.extractors].sort());
  });

  it('reads both ways of calling an extractor', () => {
    const code = 'const { Kwik, MegaCloud: Mega } = extractors;\nreturn ctx.extractors.FlixCloud(ctx);';
    expect(calledExtractors(code)).toEqual(['FlixCloud', 'Kwik', 'MegaCloud']);
  });
});
