import fs from 'fs';
import path from 'path';

// SEC-2: static guards over the native sources. They run offline and fail if the release-build
// WebView debugging, the cookie/header logging or the iOS shared data store come back.

const repoRoot = path.join(__dirname, '../..');
const androidDir = path.join(repoRoot, 'android/src/main/java/com/consumet');
const read = (file: string) => fs.readFileSync(file, 'utf8');
const kotlinSources = fs
  .readdirSync(androidDir)
  .filter((f) => f.endsWith('.kt'))
  .map((f) => ({ file: f, source: read(path.join(androidDir, f)) }));
const iosSource = read(path.join(repoRoot, 'ios/Consumet.mm'));

describe('Android WebView debugging (SEC-2)', () => {
  it('is switched on only by WebViewDebugging', () => {
    const callers = kotlinSources.filter(({ source }) => source.includes('setWebContentsDebuggingEnabled')).map((s) => s.file);
    expect(callers).toEqual(['WebViewDebugging.kt']);
  });

  it("is gated on the host app's FLAG_DEBUGGABLE", () => {
    const helper = kotlinSources.find((s) => s.file === 'WebViewDebugging.kt')!.source;
    expect(helper).toMatch(/applicationInfo\.flags/);
    expect(helper).toMatch(/ApplicationInfo\.FLAG_DEBUGGABLE/);
    expect(helper).not.toMatch(/setWebContentsDebuggingEnabled\(false\)/);
  });

  it('is applied where the module creates its WebViews', () => {
    const constructed = kotlinSources.filter(({ source }) => /(?<![.\w])WebView\(\w+\)/.test(source));
    expect(constructed.length).toBeGreaterThan(0);
    for (const { source } of constructed) expect(source).toMatch(/WebViewDebugging\.enableIfHostAppDebuggable\(/);
  });
});

describe('Android logging (SEC-2)', () => {
  // Every value interpolated into a log message. Cookies, headers and request bodies must never be
  // logged; review the value before adding it here.
  const allowed = new Set([
    'url',
    // "crashed" or "was killed to free memory"
    'cause',
    'e.message',
    'error.message',
    'error.description',
    'consoleMessage.message()',
    'body.length',
    'response.code',
  ]);

  it.each(kotlinSources)('$file logs no cookies or headers', ({ source }) => {
    const logCalls = source.match(/Log\.[dewiv]\([^\n]*/g) ?? [];
    const interpolated = logCalls.flatMap((call) =>
      [...call.matchAll(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1] ?? m[2])
    );
    expect(interpolated.filter((value) => !allowed.has(value!))).toEqual([]);
  });
});

describe('iOS cookie isolation (SEC-2)', () => {
  it("never uses the host app's default website data store", () => {
    expect(iosSource).not.toMatch(/\[WKWebsiteDataStore\s+defaultDataStore\]/);
    expect(iosSource).toMatch(/nonPersistentDataStore/);
    expect(iosSource).toMatch(/websiteDataStore = RCConsumetDataStore\(\)/);
  });

  it('returns WebView cookies only through the per-URL filter', () => {
    // Every read of the cookie store goes through the function that filters by the loaded URL.
    const reads = iosSource.split('getAllCookies:').slice(1);
    expect(reads.length).toBeGreaterThan(0);
    for (const call of reads) expect(call.slice(0, 200)).toMatch(/RCConsumetCookiesForURL\(/);
  });
});
