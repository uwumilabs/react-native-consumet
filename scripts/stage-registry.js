#!/usr/bin/env node
/**
 * Pre-commit step: when the staged changes touch what the registry bundles are built from, build
 * them from the staged files, publish new registry versions and stage the result (REG-5).
 *
 * The build runs in a temporary copy of the index, not the working tree, so unstaged edits never
 * reach what's published, and the commit's registry matches what CI rebuilds from it. It runs
 * build-registry.js: the package's `build` script, then prepare-registry, which publishes new
 * versions, refreshes hashes and writes the example app's local dist map. If a bundle changed
 * under a version that is already published, prepare-registry fails and so does the commit, until
 * the entry's `version` is bumped.
 *
 * On success the working tree gets any newly published registry/ files, the refreshed
 * src/extension-registry.json and the local dist map, and all of them are staged. dist/ isn't
 * committed.
 *
 * Usage (from .husky/pre-commit): node scripts/stage-registry.js
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { repoRoot, REGISTRY_FILE } = require('./registry-paths');
const { buildRegistry } = require('./build-registry');
const { LOCAL_DIST_MAP_FILE } = require('../apps/scripts/generate-local-dist');

// What the build reads, copied from the index into the temporary tree. Staged changes to these,
// or to yarn.lock (the tree links the installed node_modules), rebuild the registry.
const BUILD_TREE = [
  'src',
  'scripts',
  'registry',
  'package.json',
  'tsconfig.json',
  'tsconfig.dist.json',
  'apps/scripts/generate-local-dist.js',
];
const BUILD_INPUTS = [...BUILD_TREE, 'yarn.lock'];
// Files the build rewrites in place; staged as they come out of it.
const GENERATED = [REGISTRY_FILE, LOCAL_DIST_MAP_FILE];

const isBuildInput = (file) => BUILD_INPUTS.some((input) => file === input || file.startsWith(`${input}/`));

const git = (args, options = {}) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });
const nulList = (output) => output.split('\0').filter(Boolean);
const readIfExists = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

class StageError extends Error {}

/** Builds in `tree` and stages the result; throws StageError, before staging anything, on failure. */
function buildAndStage(tree, staged) {
  console.log(
    `stage-registry: ${staged.length} staged build input(s) changed, building the registry from the index...`
  );
  git(['checkout-index', '--stdin', '-z', `--prefix=${tree}${path.sep}`], {
    input: git(['ls-files', '-z', '--', ...BUILD_TREE]),
  });
  fs.symlinkSync(fs.realpathSync(path.join(repoRoot, 'node_modules')), path.join(tree, 'node_modules'), 'dir');

  try {
    buildRegistry(tree);
  } catch (error) {
    throw new StageError(
      error.step === 'prepare-registry'
        ? `prepare-registry failed (see above); nothing was staged. If a bundle changed, bump that ` +
          `entry's version in ${REGISTRY_FILE}, stage it and commit again.`
        : `the build failed on the staged files (see above); nothing was staged (${error.message})`
    );
  }

  // Check before touching the working tree, so a refusal leaves everything as it was.
  const changed = GENERATED.filter((file) => {
    const fresh = fs.readFileSync(path.join(tree, file), 'utf8');
    const stagedText = git(['ls-files', '-z', '--', file]) ? git(['show', `:${file}`]) : undefined;
    if (fresh === stagedText) return false;
    if (readIfExists(path.join(repoRoot, file)) !== stagedText) {
      throw new StageError(
        `${file} needs regenerating but has unstaged changes; stage or discard them, then commit again`
      );
    }
    return true;
  });

  const alreadyPublished = new Set(nulList(git(['ls-files', '-z', '--', 'registry'])));
  const published = walk(path.join(tree, 'registry'))
    .map((file) => path.relative(tree, file).split(path.sep).join('/'))
    .filter((file) => !alreadyPublished.has(file));
  for (const file of [...published, ...changed]) {
    fs.mkdirSync(path.dirname(path.join(repoRoot, file)), { recursive: true });
    fs.copyFileSync(path.join(tree, file), path.join(repoRoot, file));
  }
  if (published.length || changed.length) git(['add', '--', ...published, ...changed]);

  const added = [published.length && `${published.length} new registry file(s)`, ...changed].filter(Boolean);
  console.log(`stage-registry: ${added.length ? `staged ${added.join(', ')}` : 'the registry is up to date'}`);
}

const staged = nulList(git(['diff', '--cached', '--name-only', '--no-renames', '-z'])).filter(isBuildInput);
if (!staged.length) {
  console.log('stage-registry: no staged changes to what the registry is built from');
} else {
  const tree = fs.mkdtempSync(path.join(os.tmpdir(), 'consumet-stage-registry-'));
  try {
    buildAndStage(tree, staged);
  } catch (error) {
    if (!(error instanceof StageError)) throw error;
    console.error(`\nstage-registry: ${error.message}`);
    process.exitCode = 1;
  } finally {
    // Remove the link first so cleaning up can never reach the real node_modules.
    const modules = path.join(tree, 'node_modules');
    if (fs.lstatSync(modules, { throwIfNoEntry: false })) fs.unlinkSync(modules);
    fs.rmSync(tree, { recursive: true, force: true });
  }
}
