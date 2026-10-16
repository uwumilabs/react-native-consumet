import { execFile, spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';

// NAT-3: deobfuscateScript downloads the Synchrony script at most once per process, keeps a copy on
// disk for later launches, and rejects a download without the pinned SHA-256. Android's cache has
// JVM tests (android/src/test/.../SynchronyScriptCacheTest.kt); on macOS this file compiles iOS's
// cache with Foundation and runs it against a local server.

const repoRoot = path.join(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const androidDir = 'android/src/main/java/com/consumet';
const synchronyKt = read(`${androidDir}/Synchrony.kt`);
const deobfuscatorKt = read(`${androidDir}/DeobfuscatorModule.kt`);
const iosCache = read('ios/RCConsumetSynchronyCache.m');
const consumetMm = read('ios/Consumet.mm');

const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');
/** The concatenated value of an Objective-C string constant split over several literals. */
const objcString = (source: string, name: string) => {
  const decl = new RegExp(`static NSString \\*const ${name} =((?:\\s*@"[^"]*")+);`).exec(source);
  if (!decl) throw new Error(`${name} not found`);
  return [...decl[1]!.matchAll(/@"([^"]*)"/g)].map((m) => m[1]).join('');
};

const pinned = {
  url: /const val SCRIPT_URL =\s*"([^"]+)"/.exec(synchronyKt)?.[1],
  sha256: /const val SCRIPT_SHA256 = "([^"]+)"/.exec(synchronyKt)?.[1],
};

describe('the pinned Synchrony script (NAT-3)', () => {
  it('is the same URL and SHA-256 on Android and iOS', () => {
    expect(pinned.url).toMatch(/^https:\/\/raw\.githubusercontent\.com\/.+\/[0-9a-f]{40}\/.+\.js$/);
    expect(pinned.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(objcString(iosCache, 'kSynchronyURL')).toBe(pinned.url);
    expect(objcString(iosCache, 'kSynchronySHA256')).toBe(pinned.sha256);
  });

  (process.env.LIVE_TESTS === '1' ? it : it.skip)('is what the URL serves (live)', async () => {
    const response = await fetch(pinned.url!);
    expect(response.status).toBe(200);
    expect(sha256(Buffer.from(await response.arrayBuffer()))).toBe(pinned.sha256);
  });
});

describe('deobfuscateScript does not download Synchrony per call (NAT-3)', () => {
  it('Android goes through one process-wide SynchronyScriptCache', () => {
    expect(deobfuscatorKt).toMatch(/scripts\.get\(\)/);
    expect(deobfuscatorKt.match(/\.newCall\(/g)).toHaveLength(1);
    expect(deobfuscatorKt).toMatch(/fun downloadScript\(\)/);
    expect(deobfuscatorKt).toMatch(/@Volatile private var cache: SynchronyScriptCache\?/);
  });

  it('iOS goes through RCConsumetSynchronyCache', () => {
    expect(consumetMm).toMatch(/\[\[RCConsumetSynchronyCache sharedCache\] loadScript:/);
    expect(consumetMm).not.toMatch(/synchrony-v|raw\.githubusercontent/);
    expect(iosCache.match(/dataTaskWithRequest:/g)).toHaveLength(1);
  });
});

const canCompileObjC = process.platform === 'darwin' && spawnSync('xcrun', ['--find', 'clang']).status === 0;

// Drives an RCConsumetSynchronyCache: argv is url, sha256, directory ("-" for none) and batches of
// concurrent loadScript calls ("3,1": three at once, then one). Prints each batch's results as JSON.
const HARNESS = String.raw`
#import <Foundation/Foundation.h>
#import "RCConsumetSynchronyCache.h"

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    if (argc != 5) return 2;
    NSString *dir = @(argv[3]);
    RCConsumetSynchronyCache *cache = [[RCConsumetSynchronyCache alloc]
        initWithURL:[NSURL URLWithString:@(argv[1])]
             sha256:@(argv[2])
          directory:[dir isEqualToString:@"-"] ? nil : [NSURL fileURLWithPath:dir isDirectory:YES]];
    NSMutableArray *batches = [NSMutableArray array];
    for (NSString *count in [@(argv[4]) componentsSeparatedByString:@","]) {
      NSMutableArray *results = [NSMutableArray array];
      NSLock *lock = [NSLock new];
      dispatch_group_t group = dispatch_group_create();
      for (NSInteger i = 0; i < count.integerValue; i++) {
        dispatch_group_enter(group);
        dispatch_async(dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{
          [cache loadScript:^(NSString *script, NSString *code, NSString *message) {
            [lock lock];
            [results addObject:@{
              @"script" : script ?: [NSNull null],
              @"code" : code ?: [NSNull null],
              @"message" : message ?: [NSNull null]
            }];
            [lock unlock];
            dispatch_group_leave(group);
          }];
        });
      }
      if (dispatch_group_wait(group, dispatch_time(DISPATCH_TIME_NOW, 20 * NSEC_PER_SEC)) != 0) return 3;
      [batches addObject:results];
    }
    NSData *json = [NSJSONSerialization dataWithJSONObject:batches options:0 error:nil];
    fwrite(json.bytes, 1, json.length, stdout);
  }
  return 0;
}
`;

type LoadResult = { script: string | null; code: string | null; message: string | null };

(canCompileObjC ? describe : describe.skip)('iOS RCConsumetSynchronyCache (NAT-3, macOS only)', () => {
  const script = 'class Hf{}const me=1;export{Hf as Deobfuscator,me as Transformer};';
  const prepared = 'class Hf{}const me=1;const Deobfuscator=Hf,Transformer=me;';
  const tampered = 'export{evil as Deobfuscator,x as Transformer};';
  const savedName = `synchrony-${sha256(script)}.js`;

  let work: string;
  let harness: string;
  let server: http.Server;
  let url: string;
  let serve: { status: number; body: string };
  let hits: number;
  let dir: string;

  beforeAll(async () => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'consumet-synchrony-'));
    fs.writeFileSync(path.join(work, 'harness.m'), HARNESS);
    harness = path.join(work, 'harness');
    const ios = path.join(repoRoot, 'ios');
    const compiled = spawnSync(
      'xcrun',
      [
        'clang',
        '-fobjc-arc',
        '-framework',
        'Foundation',
        `-I${ios}`,
        path.join(ios, 'RCConsumetSynchronyCache.m'),
        path.join(work, 'harness.m'),
        '-o',
        harness,
      ],
      { encoding: 'utf8' }
    );
    if (compiled.status !== 0) throw new Error(`clang failed:\n${compiled.stderr}`);

    server = http.createServer((_req, res) => {
      hits++;
      res.writeHead(serve.status, { 'Content-Type': 'application/javascript' });
      res.end(serve.body);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/synchrony.js`;
  }, 60_000);

  afterAll(async () => {
    await new Promise((resolve) => server?.close(resolve));
    if (work) fs.rmSync(work, { recursive: true, force: true });
  });

  beforeEach(() => {
    serve = { status: 200, body: script };
    hits = 0;
    dir = fs.mkdtempSync(path.join(work, 'cache-'));
  });

  const load = (batches: string, cacheDir: string | null = dir) =>
    new Promise<LoadResult[][]>((resolve, reject) => {
      execFile(harness, [url, sha256(script), cacheDir ?? '-', batches], { timeout: 30_000 }, (error, stdout) =>
        error ? reject(error) : resolve(JSON.parse(stdout))
      );
    });
  const ok: LoadResult = { script: prepared, code: null, message: null };

  it('downloads once across calls, including concurrent first calls', async () => {
    const batches = await load('5,3');

    expect(batches.flat()).toEqual(Array(8).fill(ok));
    expect(hits).toBe(1);
  });

  it('saves the verified script, and a later launch reads it instead of the network', async () => {
    await load('1');
    expect(fs.readdirSync(dir)).toEqual([savedName]);
    expect(fs.readFileSync(path.join(dir, savedName), 'utf8')).toBe(script);

    serve = { status: 500, body: '' };
    expect((await load('1')).flat()).toEqual([ok]);
    expect(hits).toBe(1);
  });

  it('rejects a download with the wrong SHA-256 as NetworkError, saves nothing and retries next call', async () => {
    serve = { status: 200, body: tampered };

    const batches = await load('3,1');

    for (const result of batches.flat()) {
      expect(result.script).toBeNull();
      expect(result.code).toBe('NetworkError');
      expect(result.message).toContain(`expected SHA-256 ${sha256(script)}, got ${sha256(tampered)}`);
    }
    expect(hits).toBe(2);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('rejects an HTTP error status as NetworkError', async () => {
    serve = { status: 404, body: script };

    expect((await load('1')).flat()).toEqual([{ script: null, code: 'NetworkError', message: 'HTTP 404' }]);
  });

  it('downloads again when the saved file was tampered with', async () => {
    fs.writeFileSync(path.join(dir, savedName), tampered);

    expect((await load('1')).flat()).toEqual([ok]);
    expect(hits).toBe(1);
    expect(fs.readFileSync(path.join(dir, savedName), 'utf8')).toBe(script);
  });

  it('deletes the saved files of other versions', async () => {
    fs.writeFileSync(path.join(dir, `synchrony-${'0'.repeat(64)}.js`), 'old version');
    fs.writeFileSync(path.join(dir, 'other.txt'), 'keep');

    await load('1');

    expect(fs.readdirSync(dir).sort()).toEqual(['other.txt', savedName]);
  });

  it('keeps the script in memory without a directory', async () => {
    expect((await load('2,2', null)).flat()).toEqual(Array(4).fill(ok));
    expect(hits).toBe(1);
  });
});
