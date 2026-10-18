#!/usr/bin/env node
/**
 * Post-processes dist/ so provider/extractor code is safe to run through
 * `new Function` on Hermes.
 *
 * Hermes bug: in runtime-compiled code, the first `await` inside an async arrow
 * function with a non-simple parameter list (e.g. `async (q, page = 1) => {}`)
 * does not wait and evaluates to `undefined`. Rewriting default/rest/destructured
 * params into the function body sidesteps it; everything else stays ES2022.
 *
 * Hermes also compiles runtime code without block scoping: `let` and `const` act like `var`, so
 * closures created in a loop share one binding. esbuild's CommonJS export getters are built in
 * such a loop, and on Hermes every getter of a multi-export bundle returned the last export (the
 * NetflixMirror, PrimeMirror and DisneyMirror bundle ran PrimeMirror for all three). Registry
 * bundles (dist/bundles), the code that runs through `new Function`, therefore also get block
 * scoping compiled to `var`.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const distDir = path.join(__dirname, '..', 'dist');
const bundlesDir = path.join(distDir, 'bundles');
const isBundle = (file) => file.startsWith(bundlesDir + path.sep);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

const hasNonSimpleParams = (fn) => fn.params.some((p) => p.type !== 'Identifier');

let rewritten = 0;

for (const file of walk(distDir)) {
  const code = fs.readFileSync(file, 'utf8');
  const ast = babel.parseSync(code, { babelrc: false, configFile: false, sourceType: 'script' });
  const bundle = isBundle(file);
  let needsRewrite = bundle;
  if (!needsRewrite)
    babel.traverse(ast, {
      Function(p) {
        if (hasNonSimpleParams(p.node)) {
          needsRewrite = true;
          p.stop();
        }
      },
    });
  if (!needsRewrite) continue;

  const mapFile = `${file}.map`;
  const inputSourceMap = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')) : undefined;

  const result = babel.transformFromAstSync(ast, code, {
    babelrc: false,
    configFile: false,
    filename: file,
    sourceType: 'script',
    plugins: bundle
      ? ['@babel/plugin-transform-parameters', '@babel/plugin-transform-block-scoping']
      : ['@babel/plugin-transform-parameters'],
    sourceMaps: Boolean(inputSourceMap),
    inputSourceMap,
  });

  fs.writeFileSync(file, result.code);
  if (inputSourceMap && result.map) fs.writeFileSync(mapFile, JSON.stringify(result.map));
  rewritten++;
}

console.log(`hermes-safe-dist: rewrote ${rewritten} file(s)`);
