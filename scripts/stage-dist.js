#!/usr/bin/env node
/**
 * Pre-commit step: when the staged changes touch what dist/ is built from, rebuild dist/ and the
 * registry from the staged files and stage the result (REG-5).
 *
 * The build runs in a temporary copy of the index, not the working tree, so unstaged edits never
 * reach the committed dist/ and the commit carries exactly the dist/ that CI rebuilds from it.
 * It runs the package's `build` script, then prepare-registry, which publishes new versions and
 * refreshes hashes. If a bundle changed under a version that is already published,
 * prepare-registry fails and so does the commit, until the entry's `version` is bumped.
 *
 * On success the working tree gets the fresh dist/ (replacing the old one, as build:clean does),
 * any newly published registry/ files and the refreshed src/extension-registry.json, and all of
 * them are staged.
 *
 * Usage (from .husky/pre-commit): node scripts/stage-dist.js
 */
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const REGISTRY_JSON = 'src/extension-registry.json';
// Staged paths that can change dist/ or the registry.
const BUILD_INPUTS = /^(src\/|scripts\/|tsconfig\.dist\.json$|package\.json$|yarn\.lock$)/;
// What the build reads, copied from the index into the temporary tree.
const BUILD_TREE = ['src', 'scripts', 'registry', 'package.json', 'tsconfig.json', 'tsconfig.dist.json'];

const git = (args, options = {}) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });
const nulList = (output) => output.split('\0').filter(Boolean);

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
  console.log(`stage-dist: ${staged.length} staged build input(s) changed, rebuilding dist/ from the index...`);
  git(['checkout-index', '--stdin', '-z', `--prefix=${tree}${path.sep}`], {
    input: git(['ls-files', '-z', '--', ...BUILD_TREE]),
  });
  fs.symlinkSync(fs.realpathSync(path.join(repoRoot, 'node_modules')), path.join(tree, 'node_modules'), 'dir');

  const { scripts } = JSON.parse(fs.readFileSync(path.join(tree, 'package.json'), 'utf8'));
  const bin = path.join(repoRoot, 'node_modules', '.bin');
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  try {
    execSync(scripts.build, { cwd: tree, env, stdio: 'inherit' });
  } catch {
    throw new StageError('the build failed on the staged files (see above); nothing was staged');
  }
  try {
    execFileSync(process.execPath, [path.join(tree, 'scripts', 'prepare-registry.js')], {
      cwd: tree,
      stdio: 'inherit',
    });
  } catch {
    throw new StageError(
      'prepare-registry failed (see above); nothing was staged. If a bundle changed, bump that ' +
        `entry's version in ${REGISTRY_JSON}, stage it and commit again.`
    );
  }

  // Check before touching the working tree, so a refusal leaves everything as it was.
  const freshRegistry = fs.readFileSync(path.join(tree, REGISTRY_JSON), 'utf8');
  const stagedRegistry = git(['show', `:${REGISTRY_JSON}`]);
  const registryChanged = freshRegistry !== stagedRegistry;
  if (registryChanged && fs.readFileSync(path.join(repoRoot, REGISTRY_JSON), 'utf8') !== stagedRegistry) {
    throw new StageError(
      `${REGISTRY_JSON} needs new hashes but has unstaged changes; stage or discard them, then commit again`
    );
  }

  fs.rmSync(path.join(repoRoot, 'dist'), { recursive: true, force: true });
  fs.cpSync(path.join(tree, 'dist'), path.join(repoRoot, 'dist'), { recursive: true });
  git(['add', '-A', '--', 'dist']);

  const alreadyPublished = new Set(nulList(git(['ls-files', '-z', '--', 'registry'])));
  const published = walk(path.join(tree, 'registry'))
    .map((file) => path.relative(tree, file).split(path.sep).join('/'))
    .filter((file) => !alreadyPublished.has(file));
  for (const file of published) {
    fs.mkdirSync(path.dirname(path.join(repoRoot, file)), { recursive: true });
    fs.copyFileSync(path.join(tree, file), path.join(repoRoot, file));
  }
  if (published.length) git(['add', '--', ...published]);

  if (registryChanged) {
    fs.writeFileSync(path.join(repoRoot, REGISTRY_JSON), freshRegistry);
    git(['add', '--', REGISTRY_JSON]);
  }

  const added = [
    'dist/',
    published.length && `${published.length} new registry file(s)`,
    registryChanged && REGISTRY_JSON,
  ];
  console.log(`stage-dist: staged ${added.filter(Boolean).join(', ')}`);
}

const staged = nulList(git(['diff', '--cached', '--name-only', '--no-renames', '-z'])).filter((file) =>
  BUILD_INPUTS.test(file)
);
if (!staged.length) {
  console.log('stage-dist: no staged changes to src/, scripts/ or build config; dist/ left as is');
} else {
  const tree = fs.mkdtempSync(path.join(os.tmpdir(), 'consumet-stage-dist-'));
  try {
    buildAndStage(tree, staged);
  } catch (error) {
    if (!(error instanceof StageError)) throw error;
    console.error(`\nstage-dist: ${error.message}`);
    process.exitCode = 1;
  } finally {
    // Remove the link first so cleaning up can never reach the real node_modules.
    const modules = path.join(tree, 'node_modules');
    if (fs.lstatSync(modules, { throwIfNoEntry: false })) fs.unlinkSync(modules);
    fs.rmSync(tree, { recursive: true, force: true });
  }
}
