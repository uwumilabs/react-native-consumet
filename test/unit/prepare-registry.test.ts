import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Runs scripts/prepare-registry.js against a throwaway repo, so exit codes and writes are real.
const RAW_REPO = 'https://raw.githubusercontent.com/uwumilabs/react-native-consumet';
const RAW_BASE = `${RAW_REPO}/refs/heads/main`;
const DIST_FILE = 'dist/bundles/extractors/foo.js';
const PUBLISHED = 'registry/extractors/foo/1.0.0.js';
const SCRIPTS = ['prepare-registry.js', 'registry-support.js'];
// The library's registry validator, which prepare-registry loads from the build
const SCHEMA = 'dist/utils/registry-schema.js';

type Entry = Record<string, unknown>;

let root: string;
const file = (rel: string) => path.join(root, rel);
const write = (rel: string, content: string) => {
  fs.mkdirSync(path.dirname(file(rel)), { recursive: true });
  fs.writeFileSync(file(rel), content);
};
const read = (rel: string) => fs.readFileSync(file(rel), 'utf8');
const readRegistry = () => JSON.parse(read('src/extension-registry.json'));
const writeRegistry = (extractors: Entry[], extensions: Entry[] = []) =>
  write('src/extension-registry.json', JSON.stringify({ extractors, extensions }, null, 2));
const foo = (fields: Entry = {}): Entry => ({ name: 'Foo', version: '1.0.0', distFile: DIST_FILE, ...fields });

const git = (...args: string[]) =>
  execFileSync(
    'git',
    ['-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', ...args],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
const commitAll = () => {
  git('add', '-A');
  git('commit', '-q', '--no-verify', '-m', 'state');
  return git('rev-parse', 'HEAD').trim();
};

function run(...args: string[]) {
  const result = spawnSync(process.execPath, [file('scripts/prepare-registry.js'), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/** Publishes Foo 1.0.0 and commits, the starting point for the --base tests. */
function publishFoo() {
  writeRegistry([foo()]);
  expect(run().status).toBe(0);
  return commitAll();
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'prepare-registry-'));
  for (const script of SCRIPTS) {
    write(`scripts/${script}`, fs.readFileSync(path.join(__dirname, '../../scripts', script), 'utf8'));
  }
  write(DIST_FILE, 'module.exports = 1;\n');
  write(SCHEMA, fs.readFileSync(path.join(__dirname, '../..', SCHEMA), 'utf8'));
  git('init', '-q');
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('prepare-registry publishing', () => {
  it('publishes a new entry and fills in main, sha256 and the dist registry', () => {
    writeRegistry([foo()]);

    expect(run().status).toBe(0);

    expect(read(PUBLISHED)).toBe('module.exports = 1;\n');
    const [entry] = readRegistry().extractors;
    expect(entry.main).toBe(`${RAW_BASE}/${PUBLISHED}`);
    expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(read('dist/extension-registry.json')).toBe(read('src/extension-registry.json'));
    expect(run('--check').status).toBe(0);
  });

  it('accepts a legacy dist URL and records its distFile', () => {
    writeRegistry([{ name: 'Foo', version: '1.0.0', main: `${RAW_REPO}/refs/heads/main/${DIST_FILE}` }]);

    expect(run().status).toBe(0);
    expect(readRegistry().extractors[0]).toMatchObject({ distFile: DIST_FILE, main: `${RAW_BASE}/${PUBLISHED}` });
  });
});

describe('prepare-registry exits non-zero', () => {
  it('when an entry has no build output, and writes nothing', () => {
    fs.rmSync(file(DIST_FILE));
    writeRegistry([foo()]);
    const before = read('src/extension-registry.json');

    const result = run();

    expect(result.status).toBe(1);
    expect(result.output).toContain(`build output not found at ${DIST_FILE}`);
    expect(read('src/extension-registry.json')).toBe(before);
    expect(run('--check').status).toBe(1);
  });

  it('without publishing the valid entries when another entry fails', () => {
    writeRegistry([foo(), { name: 'Bar', version: '1.0.0', distFile: 'dist/bundles/extractors/bar.js' }]);

    expect(run().status).toBe(1);
    expect(fs.existsSync(file(PUBLISHED))).toBe(false);
  });

  it.each([
    ['another host', 'https://example.com/foo.js'],
    ['a branch path outside dist/ and registry/', `${RAW_BASE}/src/extractors/foo.ts`],
    ["another entry's published file", `${RAW_BASE}/registry/extractors/bar/1.0.0.js`],
    ['the wrong kind', `${RAW_BASE}/registry/extensions/foo/1.0.0.js`],
    ['a non-semver version', `${RAW_BASE}/registry/extractors/foo/latest.js`],
  ])('when main has an unknown URL format: %s', (_label, main) => {
    writeRegistry([foo({ main })]);

    const result = run();

    expect(result.status).toBe(1);
    expect(result.output).toContain('unknown main URL format');
    expect(run('--check').status).toBe(1);
  });

  it.each(['../secret.js', 'dist/../secret.js', 'src/extractors/foo.ts', 'dist/bundles/foo.ts'])(
    'when distFile is not a .js file under dist/: %s',
    (distFile) => {
      writeRegistry([foo({ distFile })]);

      const result = run();

      expect(result.status).toBe(1);
      expect(result.output).toContain('distFile must be a .js file under dist/');
    }
  );

  it('when a build changed under a published version', () => {
    writeRegistry([foo()]);
    expect(run().status).toBe(0);
    write(DIST_FILE, 'module.exports = 2;\n');

    const result = run();

    expect(result.status).toBe(1);
    expect(result.output).toContain('1.0.0 is already published; bump the version');
    expect(read(PUBLISHED)).toBe('module.exports = 1;\n');
    expect(run('--check').status).toBe(1);
  });

  it('with --check when the registry hash is stale', () => {
    writeRegistry([foo()]);
    expect(run().status).toBe(0);
    writeRegistry([{ ...readRegistry().extractors[0], sha256: '0'.repeat(64) }]);

    const result = run('--check');

    expect(result.status).toBe(1);
    expect(result.output).toContain('registry entry is out of date');
  });

  it('on unknown arguments, and on --base without --check', () => {
    writeRegistry([foo()]);

    expect(run('--chek').status).toBe(1);
    expect(run('--base', 'HEAD').status).toBe(1);
    expect(fs.existsSync(file(PUBLISHED))).toBe(false);
  });

  it('when the registry fails the library schema, and writes nothing', () => {
    writeRegistry([foo({ name: 'Foo-Bar' })]);
    const before = read('src/extension-registry.json');

    const result = run();

    expect(result.status).toBe(1);
    expect(result.output).toContain('name must be');
    expect(read('src/extension-registry.json')).toBe(before);
    expect(fs.existsSync(file('registry/extractors/foo-bar/1.0.0.js'))).toBe(false);
  });

  it('when the registry schema module has not been built', () => {
    fs.rmSync(file(SCHEMA));
    writeRegistry([foo()]);

    const result = run();

    expect(result.status).toBe(1);
    expect(result.output).toContain('dist/utils/registry-schema.js not found');
  });
});

describe('prepare-registry --check --base', () => {
  it('passes a rebuilt entry with a version bump', () => {
    const base = publishFoo();
    write(DIST_FILE, 'module.exports = 2;\n');
    writeRegistry([{ ...readRegistry().extractors[0], version: '1.0.1' }]);
    expect(run().status).toBe(0);

    expect(run('--check', '--base', base).status).toBe(0);
  });

  it('fails when a hash changed without a version bump, even if the published file was rewritten to match', () => {
    const base = publishFoo();
    // Bypass the overwrite guard by hand: new build, same version, published file and hash rewritten.
    write(DIST_FILE, 'module.exports = 2;\n');
    write(PUBLISHED, 'module.exports = 2;\n');
    writeRegistry([foo()]);
    expect(run().status).toBe(0);
    expect(run('--check').status).toBe(0);

    const result = run('--check', '--base', base);

    expect(result.status).toBe(1);
    expect(result.output).toContain('extractors/foo@1.0.0: sha256 changed');
    expect(result.output).toContain('without a version bump');
    expect(result.output).toContain(`${PUBLISHED}: published at`);
  });

  it('fails when a version goes backwards', () => {
    write(DIST_FILE, 'module.exports = 2;\n');
    writeRegistry([foo({ version: '1.0.1' })]);
    expect(run().status).toBe(0);
    const base = commitAll();
    write(DIST_FILE, 'module.exports = 1;\n');
    writeRegistry([{ ...readRegistry().extractors[0], version: '1.0.0' }]);
    expect(run().status).toBe(0);

    const result = run('--check', '--base', base);

    expect(result.status).toBe(1);
    expect(result.output).toContain('version went backwards from 1.0.1 to 1.0.0');
  });

  it('fails on a base that is not a commit, and skips an all-zero base', () => {
    publishFoo();

    expect(run('--check', '--base', 'no-such-ref').status).toBe(1);
    const zero = run('--check', '--base', '0'.repeat(40));
    expect(zero.status).toBe(0);
    expect(zero.output).toContain('skipped the version bump check');
  });
});
