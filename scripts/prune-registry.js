/**
 * Lists, or with --delete removes, published registry versions that nothing can still need.
 *
 * A version is kept if it is the current version of its entry, the newest version before the
 * current one (for one-line rollbacks), or referenced by a supported release's bundled
 * registry. Supported releases: every stable tag in the two most recent minor lines
 * (see scripts/registry-support.js).
 *
 * Usage:
 *   node scripts/prune-registry.js            dry run: print what would be deleted
 *   node scripts/prune-registry.js --delete   delete those files
 */
const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  checkReferences,
  publishedFiles,
  planPrune,
  supportedTags,
  tagRegistry,
} = require('./registry-support');

const apply = process.argv.includes('--delete');
const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src', 'extension-registry.json'), 'utf8'));

// Without tags we can't tell what supported releases reference, so nothing is safe to delete.
const { tags, problems, notes } = checkReferences(registry);
notes.forEach((note) => console.log(`  · ${note}`));
if (!tags.length) {
  console.error('No release tags found; run `git fetch --tags` first. Nothing was deleted.');
  process.exit(1);
}
if (problems.length) {
  console.error(
    `Existing references are already broken; fix these first:\n${problems.map((p) => `  ✖ ${p}`).join('\n')}`
  );
  process.exit(1);
}

const supported = supportedTags(tags).map((tag) => ({ tag, registry: tagRegistry(tag) }));
const { keep, deletable } = planPrune(registry, publishedFiles(), supported);

console.log(`Supported releases: ${supported.map((s) => s.tag).join(', ') || 'none'}`);
console.log(`Keeping ${keep.size} published version(s).`);

if (!deletable.length) {
  console.log('Nothing to prune.');
  process.exit(0);
}

console.log(`${apply ? 'Deleting' : 'Would delete'} ${deletable.length} version(s):`);
for (const { file } of deletable) {
  console.log(`  - ${file}`);
  if (apply) {
    fs.unlinkSync(path.join(repoRoot, file));
    const dir = path.dirname(path.join(repoRoot, file));
    if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
  }
}
if (!apply) console.log('Dry run; re-run with --delete to remove them.');
