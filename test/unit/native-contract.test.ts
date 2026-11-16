import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { TurboModuleRegistry } from 'react-native';
import * as NativeConsumet from '../../src/NativeConsumet';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { createExtractorContext } from '../../src/utils/create-extractor-context';
import { defaultExtractorContext } from '../../src/utils/create-extractor-context';

// NAT-1: pins the JS-facing contract of the native module. The spec signatures, the jest mock in
// jest.setup.js, the exports and the contexts handed to extensions must agree, and both native
// implementations must follow the behaviour documented in src/NativeConsumet.ts. Runs offline.

const repoRoot = path.join(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(repoRoot, file), 'utf8');

// The contract. Changing a signature here is a breaking change for extension code and uwumi.
const SPEC: Record<string, string> = {
  bypassDdosGuard: '(url: string) => Promise<{ cookie: string }>',
  getDdosGuardCookiesWithWebView: '(url: string) => Promise<string>',
  makeGetRequestWithWebView:
    '(url: string, headers: { [key: string]: string }) => Promise<{ url: string; html: string; cookies: string; status: string; }>',
  makePostRequestWithWebView:
    '(url: string, headers: { [key: string]: string }, body: string) => Promise<{ url: string; response: string; cookies: string; status: string; contentType: string; }>',
  makePostRequest:
    '(url: string, headers: { [key: string]: string }, body: string) => Promise<{ statusCode: number; body: string; headers: { [key: string]: string }; }>',
  deobfuscateScript: '(source: string) => Promise<string | null>',
};
const methods = Object.keys(SPEC).sort();
const asyncMethods = methods.filter((name) => SPEC[name]!.includes('=> Promise<'));

const ERROR_CODES = [
  'WEBVIEW_ERROR',
  'TIMEOUT',
  'COOKIE_ERROR',
  'ERROR',
  'HTTP_ERROR',
  'NetworkError',
  'ParseError',
  'EvaluationError',
];

const specSource = read('src/NativeConsumet.ts');
const androidDir = 'android/src/main/java/com/consumet';
const kotlin = Object.fromEntries(
  fs
    .readdirSync(path.join(repoRoot, androidDir))
    .filter((f) => f.endsWith('.kt'))
    .map((f) => [f, read(`${androidDir}/${f}`)])
);
const allKotlin = Object.values(kotlin).join('\n');
const objc = read('ios/Consumet.mm');
const allObjc = fs
  .readdirSync(path.join(repoRoot, 'ios'))
  .filter((f) => /\.mm?$/.test(f))
  .map((f) => read(`ios/${f}`))
  .join('\n');

/** Signatures of the Spec interface members, whitespace-normalised. */
function specSignatures(): Record<string, string> {
  const file = ts.createSourceFile('NativeConsumet.ts', specSource, ts.ScriptTarget.Latest, true);
  const spec = file.statements.find((s): s is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'Spec');
  if (!spec) throw new Error('Spec interface not found');
  const norm = (node: ts.Node) => node.getText(file).replace(/\s+/g, ' ');
  return Object.fromEntries(
    spec.members.map((member) => {
      const name = (member.name as ts.Identifier).text;
      if (ts.isMethodSignature(member)) {
        return [name, `(${member.parameters.map(norm).join(', ')}) => ${norm(member.type!)}`];
      }
      return [name, norm((member as ts.PropertySignature).type!)];
    })
  );
}

/** The body of a Kotlin function, up to the next member at the same indentation. */
function kotlinFunction(source: string, name: string): string {
  const start = source.indexOf(`fun ${name}(`);
  if (start < 0) throw new Error(`fun ${name} not found`);
  const next = source.slice(start + 1).search(/\n {4}(?:\/\*\*|fun |private |override |internal )/);
  return next < 0 ? source.slice(start) : source.slice(start, start + 1 + next);
}

/** The value of a Kotlin `const val` in `file`: a string, or a number (`30_000L` reads as 30000). */
function kotlinConst(file: string, name: string): string | number {
  const value = new RegExp(`const val ${name} =\\s*(.+)$`, 'm').exec(kotlin[file] ?? '')?.[1]?.trim();
  if (value === undefined) throw new Error(`const val ${name} not found in ${file}`);
  return value.startsWith('"') ? JSON.parse(value) : Number(value.replace(/_|L$/g, ''));
}

/** The value of an Objective-C `static ... const` in the iOS sources: a string or a number. */
function objcConst(name: string): string | number {
  const decl = new RegExp(`static (?:const \\w+|NSString \\*const) ${name} =((?:\\s*@"[^"]*")+|\\s*[\\d.]+);`).exec(allObjc);
  if (!decl) throw new Error(`${name} not found in ios/`);
  const strings = [...decl[1]!.matchAll(/@"([^"]*)"/g)].map((m) => m[1]);
  return strings.length ? strings.join('') : Number(decl[1]);
}

describe('NativeConsumet spec (NAT-1)', () => {
  it('matches the pinned contract', () => {
    expect(specSignatures()).toEqual(SPEC);
  });

  it('documents exactly the rejection codes both platforms use', () => {
    const documented = [...specSource.matchAll(/^ \* \| `(\w+)`\s+\|/gm)].map((m) => m[1]);
    expect(documented).toEqual(ERROR_CODES);

    const kotlinCodes = new Set([
      ...[...allKotlin.matchAll(/\.reject\(\s*"(\w+)"/g)].map((m) => m[1]),
      ...[...allKotlin.matchAll(/const val [A-Z_]+ = "(\w+)"/g)].map((m) => m[1]).filter((c) => /ERROR|TIMEOUT/.test(c!)),
      ...[...allKotlin.matchAll(/val code = "(\w+)"/g)].map((m) => m[1]),
      ...[...allKotlin.matchAll(/\?\.code \?: "(\w+)"/g)].map((m) => m[1]),
    ]);
    const objcCodes = new Set([
      ...[...allObjc.matchAll(/reject\(\s*@"(\w+)"/g)].map((m) => m[1]),
      ...[...allObjc.matchAll(/rejectWithCode:\s*@"(\w+)"/g)].map((m) => m[1]),
      ...[...allObjc.matchAll(/NSString \*const \w+Code = @"(\w+)"/g)].map((m) => m[1]),
    ]);
    expect([...kotlinCodes].sort()).toEqual([...ERROR_CODES].sort());
    expect([...objcCodes].sort()).toEqual([...ERROR_CODES].sort());
  });
});

describe('jest mock of the native module (NAT-1)', () => {
  const mock = TurboModuleRegistry.getEnforcing<any>('Consumet');

  it('has exactly the spec methods', () => {
    expect(Object.keys(mock).sort()).toEqual(methods);
  });

  it.each(asyncMethods)('%s returns a promise that rejects offline', async (name) => {
    const result = mock[name]('https://example.com', {}, '');
    expect(result).toBeInstanceOf(Promise);
    await expect(result).rejects.toThrow(`NativeConsumet.${name} is not available in tests`);
  });

  it('has only asynchronous methods', () => {
    expect(asyncMethods).toEqual(methods);
  });
});

describe('what JS and extensions see (NAT-1)', () => {
  it('lists every spec method of the native module in nativeMethods', () => {
    expect(Object.keys(NativeConsumet.nativeMethods).sort()).toEqual(methods);
    for (const name of methods) {
      expect((NativeConsumet.nativeMethods as any)[name]).toBe((NativeConsumet.default as any)[name]);
    }
  });

  it.each([
    ['createProviderContext()', () => createProviderContext().NativeConsumet],
    ['createExtractorContext()', () => createExtractorContext().NativeConsumet],
    ['defaultExtractorContext', () => defaultExtractorContext.NativeConsumet],
  ])('%s exposes every spec method', (_label, native) => {
    const exposed = native() as Record<string, unknown>;
    expect(Object.keys(exposed).sort()).toEqual(methods);
    for (const name of methods) expect(exposed[name]).toBe((NativeConsumet.default as any)[name]);
  });
});

describe('native implementations follow the contract (NAT-1)', () => {
  it.each(methods)('%s is implemented on Android and iOS', (name) => {
    expect(kotlin['ConsumetModule.kt']).toMatch(new RegExp(`override fun ${name}\\(`));
    expect(objc).toMatch(new RegExp(`^- \\(void\\)${name}:`, 'm'));
  });

  // The same values on both platforms, pinned here; change a pair together. The Synchrony URL and
  // SHA-256 are pinned in native-synchrony-cache.test.ts.
  it.each([
    ['WebView request timeout (ms)', kotlinConst('WebViewTask.kt', 'TIMEOUT_MS'), Number(objcConst('kWebViewTimeout')) * 1000, 30_000],
    ['time a loaded page gets to settle (ms)', kotlinConst('HttpRequestModule.kt', 'CAPTURE_DELAY_MS'), Number(objcConst('kCaptureDelay')) * 1000, 1500],
    ['challenge page poll interval (ms)', kotlinConst('HttpRequestModule.kt', 'POLL_MS'), Number(objcConst('kPollInterval')) * 1000, 1000],
    ['DDoS-Guard check cookie', kotlinConst('DdosGuardHelper.kt', 'CHECK_COOKIE'), objcConst('kDdosGuardCheckCookie'), '__ddg2_'],
    ['DDoS-Guard check script', kotlinConst('DdosGuardHelper.kt', 'CHECK_SCRIPT_URL'), objcConst('kDdosGuardCheckScriptURL'), 'https://check.ddos-guard.net/check.js'],
    ['Synchrony cache directory', kotlinConst('DeobfuscatorModule.kt', 'CACHE_DIR'), objcConst('kSynchronyDirectory'), 'consumet'],
  ])('%s is the same on Android and iOS', (_label, android, ios, pinned) => {
    expect(android).toEqual(pinned);
    expect(ios).toEqual(android);
  });

  it('saves the Synchrony script under the same file name on both platforms', () => {
    expect(kotlin['SynchronyScriptCache.kt']).toContain('"synchrony-$sha256.js"');
    expect(allObjc).toContain('@"synchrony-%@.js"');
  });

  it('getDdosGuardCookiesWithWebView resolves a plain string on Android, as on iOS', () => {
    const android = kotlinFunction(kotlin['DdosGuardHelper.kt']!, 'getDdosGuardCookiesWithWebView');
    expect(android).toMatch(/task\.resolve\(cookie\)/);
    expect(android).not.toMatch(/WritableNativeMap|putString\("cookie"/);
    expect(objc).toMatch(/\[task resolve:header\]/);
  });

  it('WebView requests reject on timeout on both platforms', () => {
    expect(allKotlin).not.toMatch(/"status", "timeout"/);
    expect(kotlin['WebViewTask.kt']).toMatch(/reject\(TIMEOUT, "WebView request timed out"\)/);
    expect(objc).toMatch(/rejectWithCode:kTimeoutCode message:@"WebView request timed out"/);
    // Every WebView the module creates belongs to the task that settles its promise once.
    expect(Object.keys(kotlin).filter((file) => /(?<![.\w])WebView\(\w+\)/.test(kotlin[file]!))).toEqual(['WebViewTask.kt']);
    expect(allObjc.match(/\[WKWebView alloc\]/g)).toHaveLength(1);
  });

  it('only main-document failures reject on Android (sub-resources are ignored, as on iOS)', () => {
    const handlers = allKotlin.match(/override fun onReceivedError\([^)]*\) \{[^}]*/g) ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    for (const handler of handlers) expect(handler).toMatch(/isForMainFrame/);
  });

  it('WebView GET and POST wait past a Cloudflare challenge on both platforms', () => {
    // The same markers decide on both platforms.
    for (const marker of ['window._cf_chl_opt', "'challenge-form'", "'challenge-running'", "'Just a moment...'"]) {
      expect(kotlin['HttpRequestModule.kt']).toContain(marker);
      expect(objc).toContain(marker);
    }
    // A challenge keeps the task open while the page is polled.
    expect(kotlin['WebViewTask.kt']).toMatch(/fun keepOpen\(\)/);
    expect(kotlin['HttpRequestModule.kt']).toMatch(/task\.keepOpen\(\)/);
    expect(objc).toMatch(/- \(void\)keepOpen/);
    expect(objc).toMatch(/\[t keepOpen\]/);
    // GET and POST both capture through the check.
    for (const name of ['makeGetRequestWithWebView', 'makePostRequestWithWebView']) {
      expect(kotlinFunction(kotlin['HttpRequestModule.kt']!, name)).toMatch(/captureUnlessChallenge\(/);
      const method = objc.slice(objc.indexOf(`- (void)${name}:`));
      expect(method.slice(0, method.indexOf('\n#pragma mark'))).toMatch(/RCConsumetCaptureUnlessChallenge\(/);
    }
  });

  it("WebView requests keep the engine's own user agent unless one is passed", () => {
    // A user agent claiming another browser than the engine made Cloudflare fail its challenge.
    expect(kotlin['HttpRequestModule.kt']).not.toMatch(/DEFAULT_USER_AGENT/);
    expect(kotlin['WebViewTask.kt']).toMatch(/if \(userAgent != null\) userAgentString = userAgent/);
    // iOS: WKWebView's own, with Mobile Safari's tokens for the running iOS version.
    expect(objc).not.toMatch(/kDefaultUA/);
    expect(objc).toMatch(/applicationNameForUserAgent = RCConsumetSafariApplicationName\(\)/);
    expect(objc).toMatch(/if \(ua\.length\)\s*_webView\.customUserAgent = ua;/);
  });

  it('deobfuscateScript rejects instead of resolving null on both platforms', () => {
    expect(objc).not.toMatch(/resolve\(\[NSNull null\]\)/);
    expect(objc).not.toMatch(/catch\(e\)\{return null;\}/);
    expect(objc).toContain('Deobfuscator did not return a string');
    expect(kotlin['DeobfuscatorModule.kt']).toContain('Deobfuscator did not return a string');
  });
});

describe('template leftovers are gone (NAT-3)', () => {
  const gradle = read('android/build.gradle');

  it('has no multiply method on either platform', () => {
    expect(SPEC).not.toHaveProperty('multiply');
    expect(allKotlin).not.toMatch(/multiply/);
    expect(allObjc).not.toMatch(/multiply/);
  });

  it('declares only the Android dependencies the Kotlin sources import', () => {
    // Dependency -> package its classes are imported from. kotlin-stdlib comes from the Kotlin plugin.
    const imported: Record<string, string> = {
      'com.facebook.react:react-android': 'com.facebook.react',
      'com.squareup.okhttp3:okhttp': 'okhttp3',
      'wang.harlon.quickjs:wrapper-android': 'com.whl.quickjs',
    };
    const declared = [...gradle.matchAll(/^\s*implementation\s+["']([^:"']+:[^:"']+)/gm)].map((m) => m[1]);
    expect(declared.sort()).toEqual(Object.keys(imported).sort());
    for (const pkg of Object.values(imported)) {
      expect(allKotlin).toMatch(new RegExp(`^import ${pkg.replace(/\./g, '\\.')}\\.`, 'm'));
    }
  });
});
