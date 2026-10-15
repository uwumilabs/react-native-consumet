#!/usr/bin/env node
/**
 * Bundles every registry entry into one self-contained file (EXT-5).
 *
 * An entry's `distFile` names its bundle, and the bundle's source is the matching file under src/:
 *
 *   dist/bundles/extractors/hubcloud.js                  <- src/extractors/hubcloud.ts
 *   dist/bundles/providers/anime/anikoto/create-anikoto.js <- src/providers/anime/anikoto/create-anikoto.ts
 *
 * Relative imports are inlined, so a bundle never requires another dist file (HubCloud used to
 * require "./gofile", which the extension runtime can't provide). What the runtime does provide
 * stays external:
 *   - axios, cheerio, crypto-js
 *   - src/models            -> require('react-native-consumet/models')  (enums, base parsers)
 *   - src/utils/index and the create-*-context files -> require('react-native-consumet/utils')
 *
 * Runs after tsc and before hermes-safe-dist (see the `build` script). Also replaces tsc's re-printed
 * dist/extension-registry.json with a byte copy of src/extension-registry.json.
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const repoRoot = path.join(__dirname, '..');
const srcDir = path.join(repoRoot, 'src');
const registry = require(path.join(srcDir, 'extension-registry.json'));

const BUNDLE_DIR = 'dist/bundles/';
const MODELS_MODULE = 'react-native-consumet/models';
const UTILS_MODULE = 'react-native-consumet/utils';
const PACKAGE_EXTERNALS = ['axios', 'cheerio', 'crypto-js'];
const UTILS_FROM_RUNTIME = ['index', 'create-provider-context', 'create-extractor-context'];

// esbuild's CommonJS output sets module.exports; loaders before EXT-5 read factories from `exports`.
const FOOTER = 'if (module.exports !== exports) Object.assign(exports, module.exports);';

const isInside = (dir, file) => file === dir || file.startsWith(dir + path.sep);

const runtimeExternals = {
  name: 'runtime-externals',
  setup(build) {
    build.onResolve({ filter: /^\.\.?\// }, (args) => {
      const target = path.resolve(args.resolveDir, args.path).replace(/\.(js|ts)$/, '');
      if (isInside(path.join(srcDir, 'models'), target)) return { path: MODELS_MODULE, external: true };
      const utilsDir = path.join(srcDir, 'utils');
      if (target === utilsDir || UTILS_FROM_RUNTIME.some((name) => target === path.join(utilsDir, name))) {
        return { path: UTILS_MODULE, external: true };
      }
      return undefined;
    });
  },
};

function bundlesFromRegistry() {
  const bundles = new Map();
  const add = (entry, label, exportName) => {
    const distFile = entry.distFile;
    if (!distFile || !distFile.startsWith(BUNDLE_DIR) || !distFile.endsWith('.js')) {
      throw new Error(`${label}: distFile must be a bundle under ${BUNDLE_DIR} (got ${distFile})`);
    }
    const source = path.join(srcDir, distFile.slice(BUNDLE_DIR.length).replace(/\.js$/, '.ts'));
    if (!fs.existsSync(source)) throw new Error(`${label}: no source at ${path.relative(repoRoot, source)}`);
    const bundle = bundles.get(distFile) || { distFile, source, exportNames: new Set() };
    bundle.exportNames.add(exportName);
    bundles.set(distFile, bundle);
  };
  registry.extensions.forEach((e) => add(e, `extensions/${e.id}`, e.factoryName));
  registry.extractors.forEach((e) => add(e, `extractors/${e.name}`, e.name));
  return [...bundles.values()];
}

async function buildBundle({ distFile, source, exportNames }) {
  const outfile = path.join(repoRoot, distFile);
  await esbuild.build({
    // Bundles name their sources in comments relative to this; fixing it keeps the bytes (and
    // so the registry hashes) the same whatever directory the build runs from.
    absWorkingDir: repoRoot,
    entryPoints: [source],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'neutral',
    mainFields: ['main', 'module'],
    target: 'es2022',
    tsconfig: path.join(repoRoot, 'tsconfig.dist.json'),
    external: PACKAGE_EXTERNALS,
    plugins: [runtimeExternals],
    footer: { js: FOOTER },
    legalComments: 'none',
    logLevel: 'warning',
  });

  const code = fs.readFileSync(outfile, 'utf8');
  const relative = code.match(/\brequire\(\s*["']\.\.?\/[^"']*["']\s*\)/);
  if (relative) throw new Error(`${distFile}: bundle still has a relative ${relative[0]}`);
  // Loaders find a factory by its top-level name (`typeof createX`), else on exports (the footer).
  for (const name of exportNames) {
    const topLevel = new RegExp(`^(?:async )?function ${name}\\(|^var ${name} =`, 'm').test(code);
    const exported = new RegExp(`\\b${name}: \\(\\) => ${name}\\b`).test(code);
    if (!topLevel && !exported) {
      throw new Error(`${distFile}: '${name}' is neither declared at the top level nor exported`);
    }
  }
}

(async () => {
  const bundles = bundlesFromRegistry();
  for (const bundle of bundles) await buildBundle(bundle);
  // tsc re-prints the imported registry JSON with its own indentation. prepare-registry writes the
  // same bytes to src/ and dist/, so copy src/'s file to keep `yarn build` and prepare-registry
  // producing the same dist/ (CI compares dist/ with a rebuild).
  fs.copyFileSync(path.join(srcDir, 'extension-registry.json'), path.join(repoRoot, 'dist', 'extension-registry.json'));
  console.log(`build-extensions: bundled ${bundles.length} registry entr${bundles.length === 1 ? 'y' : 'ies'}`);
})().catch((error) => {
  console.error(`build-extensions: ${error.message}`);
  process.exit(1);
});
