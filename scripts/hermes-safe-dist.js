#!/usr/bin/env node
/**
 * Post-processes the registry bundles (dist/bundles) so they are safe to run through
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
 * NetflixMirror, PrimeMirror and DisneyMirror bundle ran PrimeMirror for all three). The bundles
 * therefore also get block scoping compiled to `var`.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { repoRoot, BUNDLE_DIR } = require('./registry-paths');

const bundlesDir = path.join(repoRoot, BUNDLE_DIR);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

let rewritten = 0;

for (const file of walk(bundlesDir)) {
  const code = fs.readFileSync(file, 'utf8');
  const result = babel.transformSync(code, {
    babelrc: false,
    configFile: false,
    filename: file,
    sourceType: 'script',
    plugins: ['@babel/plugin-transform-parameters', '@babel/plugin-transform-block-scoping'],
  });
  fs.writeFileSync(file, result.code);
  rewritten++;
}

console.log(`hermes-safe-dist: rewrote ${rewritten} bundle(s)`);
