import fs from 'fs';
import path from 'path';

// NAT-2: Google Play requires 16 KB-aligned native libraries for apps targeting Android 15+.
// app.cash.quickjs:quickjs-android 0.9.2 shipped a 4 KB-aligned libquickjs.so; the module now uses
// wang.harlon.quickjs:wrapper-android, whose libraries are 16 KB aligned from 3.2.0.

const repoRoot = path.join(__dirname, '../..');
const gradle = fs.readFileSync(path.join(repoRoot, 'android/build.gradle'), 'utf8');
const androidDir = path.join(repoRoot, 'android/src/main/java/com/consumet');
const kotlin = fs
  .readdirSync(androidDir)
  .map((f) => fs.readFileSync(path.join(androidDir, f), 'utf8'))
  .join('\n');

describe('Android native libraries support 16 KB pages (NAT-2)', () => {
  it('does not depend on the 4 KB-aligned app.cash QuickJS build', () => {
    expect(gradle).not.toMatch(/app\.cash\.quickjs/);
    expect(kotlin).not.toMatch(/^import app\.cash\.quickjs/m);
    expect(kotlin).toMatch(/^import com\.whl\.quickjs\.wrapper\.QuickJSContext$/m);
  });

  it('uses a quickjs-wrapper release with 16 KB-aligned libraries (3.2.0 or later)', () => {
    const version = /implementation "wang\.harlon\.quickjs:wrapper-android:(\d+)\.(\d+)\.(\d+)"/.exec(gradle);
    expect(version).not.toBeNull();
    const [major, minor] = [Number(version![1]), Number(version![2])];
    expect(major > 3 || (major === 3 && minor >= 2)).toBe(true);
  });
});
