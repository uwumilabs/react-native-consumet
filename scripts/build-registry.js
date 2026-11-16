#!/usr/bin/env node
/**
 * Rebuilds dist/ and everything made from it, in the order each step needs:
 *   1. the package's `build` script: tsc, the registry bundles (build-extensions.js) and
 *      hermes-safe-dist.js
 *   2. prepare-registry.js: publishes new versions under registry/, refreshes the hashes in
 *      src/extension-registry.json and writes the example app's local dist map
 *
 * `yarn build:registry` runs it, as does release-it after a version bump. The pre-commit hook
 * (stage-dist.js) runs it on a copy of the staged files.
 */
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BuildStepError extends Error {
  constructor(step, error) {
    super(`${step} failed: ${error.message}`);
    this.step = step;
  }
}

/** Runs the steps in `root`, with its output on this process's. Throws a BuildStepError. */
function buildRegistry(root) {
  const { scripts } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const bin = path.join(root, 'node_modules', '.bin');
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  try {
    execSync(scripts.build, { cwd: root, env, stdio: 'inherit' });
  } catch (error) {
    throw new BuildStepError('build', error);
  }
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts', 'prepare-registry.js')], {
      cwd: root,
      stdio: 'inherit',
    });
  } catch (error) {
    throw new BuildStepError('prepare-registry', error);
  }
}

module.exports = { buildRegistry, BuildStepError };

if (require.main === module) {
  try {
    buildRegistry(path.join(__dirname, '..'));
  } catch (error) {
    console.error(`build-registry: ${error.message}`);
    process.exit(1);
  }
}
