import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { TurboModuleRegistry } from 'react-native';
import * as NativeConsumet from '../../src/NativeConsumet';
import { createProviderContext } from '../../src/utils/create-provider-context';
import { createExtractorContext } from '../../src/utils/create-extractor-context';
import { defaultExtractorContext } from '../../src/utils/extension-utils';

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
  multiply: '(a: number, b: number) => number',
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
      ...[...objc.matchAll(/reject\(\s*@"(\w+)"/g)].map((m) => m[1]),
      ...[...objc.matchAll(/static NSString \*const k\w+Code = @"(\w+)"/g)].map((m) => m[1]),
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

  it('multiply is synchronous', () => {
    expect(mock.multiply(2, 3)).toBe(6);
  });
});

describe('what JS and extensions see (NAT-1)', () => {
  it('exports every spec method bound to the native module', () => {
    const named = Object.keys(NativeConsumet)
      .filter((key) => key !== 'default')
      .sort();
    expect(named).toEqual(methods);
    for (const name of methods) {
      expect((NativeConsumet as any)[name]).toBe((NativeConsumet.default as any)[name]);
    }
  });

  it.each([
    ['createProviderContext()', () => createProviderContext().NativeConsumet],
    ['createExtractorContext()', () => createExtractorContext().NativeConsumet],
    ['defaultExtractorContext', () => defaultExtractorContext.NativeConsumet],
  ])('%s exposes every spec method', (_label, native) => {
    const exposed = native() as Record<string, unknown>;
    expect(Object.keys(exposed).sort()).toEqual(methods);
    for (const name of methods) expect(exposed[name]).toBe((NativeConsumet as any)[name]);
  });
});

describe('native implementations follow the contract (NAT-1)', () => {
  it.each(methods)('%s is implemented on Android and iOS', (name) => {
    expect(kotlin['ConsumetModule.kt']).toMatch(new RegExp(`override fun ${name}\\(`));
    expect(objc).toMatch(new RegExp(`^- \\((?:void|NSNumber \\*)\\)${name}:`, 'm'));
  });

  it('getDdosGuardCookiesWithWebView resolves a plain string on Android, as on iOS', () => {
    const android = kotlinFunction(kotlin['DdosGuardModule.kt']!, 'getDdosGuardCookiesWithWebView');
    expect(android).toMatch(/task\.resolve\(cookie\)/);
    expect(android).not.toMatch(/WritableNativeMap|putString\("cookie"/);
    expect(objc).toMatch(/\? resolve\(header\)/);
  });

  it('WebView requests reject on timeout on both platforms', () => {
    expect(allKotlin).not.toMatch(/"status", "timeout"/);
    expect(kotlin['WebViewTask.kt']).toMatch(/Runnable \{ reject\(TIMEOUT, "WebView request timed out"\) \}/);
    expect(objc).toMatch(/self\.onError\(kTimeoutCode, @"WebView request timed out"\)/);
    // GET, POST and the DDoS-Guard WebView all go through the shared task.
    expect(kotlin['HttpRequestModule.kt']!.match(/WebViewTask\(context/g)).toHaveLength(2);
    expect(kotlin['DdosGuardModule.kt']!.match(/WebViewTask\(context/g)).toHaveLength(1);
    expect(allKotlin.match(/(?<![.\w])WebView\(\w+\)/g)).toHaveLength(1);
  });

  it('only main-document failures reject on Android (sub-resources are ignored, as on iOS)', () => {
    const handlers = allKotlin.match(/override fun onReceivedError\([^)]*\) \{[^}]*/g) ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    for (const handler of handlers) {
      expect(handler).toMatch(/if \(!request\.isForMainFrame\b[^)]*\) return/);
    }
  });

  it('deobfuscateScript rejects instead of resolving null on both platforms', () => {
    expect(objc).not.toMatch(/resolve\(\[NSNull null\]\)/);
    expect(objc).not.toMatch(/catch\(e\)\{return null;\}/);
    expect(objc).toMatch(/reject\(@"EvaluationError", @"Deobfuscator did not return a string", nil\)/);
    expect(kotlin['DeobfuscatorModule.kt']).toMatch(/reject\("EvaluationError", "Deobfuscator did not return a string"\)/);
  });
});
