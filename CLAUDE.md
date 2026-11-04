# CLAUDE.md

Notes for Claude Code sessions in this repo. [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/](docs/README.md)
describe the full workflow; this file holds the rules and the lessons that aren't written down
there.

Keep it current: when a session learns something that will matter again (a device or runtime
gotcha, a build or release step, a decision the user made), add it to the matching section without
being asked. Check it against the code first, keep it short, leave personal details out (the repo
is public), and say in the final message what was added.

## What this is

- `react-native-consumet`: anime, movie, manga and meta providers for React Native. Native helpers
  (hidden WebView requests, OkHttp/URLSession, a script deobfuscator) live in `android/` and `ios/`;
  their contract is `src/NativeConsumet.ts`, pinned by `test/unit/native-contract.test.ts`.
- Providers and extractors also ship as signed, versioned bundles in a registry
  (`src/extension-registry.json`, files under `registry/`), so a provider fix reaches apps without an
  npm release.
- `apps/` is the example app (workspace `react-native-consumet-example`). Its Anime, Movies and Manga
  tabs use the library source through Metro; the Registry tab loads registry bundles.
- uwumi (`../uwumi`) is the main consumer, but it is not a constraint: prefer one clean, consistent
  API, and record breaking changes in a `BREAKING CHANGE:` footer and
  [docs/migrations/README.md](docs/migrations/README.md).

## Commands

| Command | What it does |
| --- | --- |
| `yarn test` | Offline unit tests (`test/unit/`, recorded fixtures) |
| `yarn test:live` | Also the live suites (`test/anime`, `test/manga`, ...), which hit real sites |
| `yarn typecheck` | `tsc` over the library and `apps/src` (ts-jest type-checks the tests as they run) |
| `yarn lint` | ESLint (it ignores `apps/`; lint those files with `npx eslint --no-ignore`) |
| `yarn build` | `dist/` plus the registry bundles in `dist/bundles/` |
| `yarn registry:check` | Checks every registry entry against its build and published file |
| `yarn example gen:local-dist` | Regenerates `apps/src/registry/local-dist-map.ts` |
| `cd apps && yarn android --no-packager --active-arch-only` | Builds and starts the example app (Metro already running: `yarn example start`) |

## Commits

- Messages must pass `commitlint.config.js`: `type(scope): subject`, lower-case scope and subject, a
  subject of at least 10 characters with no trailing period, body lines of at most 100 characters,
  types feat, fix, docs, style, refactor, test, chore, perf, ci. Check a message with
  `npx --no-install commitlint < msgfile`.
- Never add attribution: no `Co-Authored-By`, no "Generated with ...", no mention of Claude.
- A breaking change to public behaviour (ids, return shapes, signatures) gets a `BREAKING CHANGE:`
  footer; release-it then bumps the major version.
- The pre-commit hook runs lint-staged, `yarn typecheck` and `scripts/stage-dist.js`, which rebuilds
  `dist/` from the staged files and publishes changed registry entries. It does not run the tests:
  run `yarn test` first.
- Commit only when asked. Pushing, tagging and releasing are the user's.

## Registry bundles

- `dist/` and `registry/` are committed and generated. Never edit files under `registry/` by hand:
  their bytes are hashed (the folder is in `.prettierignore` for that reason).
- If a change alters a registry bundle, bump that entry's `version` in `src/extension-registry.json`
  before committing, or the hook stops. To find the changed entries, run `yarn build` and compare the
  sha256 of each entry's `distFile` with its `sha256`.
- Then `node scripts/prepare-registry.js` (or the hook) publishes
  `registry/<extensions|extractors>/<key>/<version>.js`. Run `yarn example gen:local-dist` and
  commit `apps/src/registry/local-dist-map.ts` with it.
- Run `npx lint-staged` before building and bumping, because lint-staged rewrites staged sources.
- After a registry change, `yarn registry:check` reports the signature as stale until the Sign
  registry workflow re-signs on `main`. That is expected.

## Why it works in jest but not on the device

- **Hermes has no block scoping in runtime-compiled code.** Registry bundles run through
  `new Function` on Hermes, where `let`/`const` act like `var`. `scripts/hermes-safe-dist.js`
  compiles block scoping out of every bundle, and a test asserts none declares `let`/`const`. Stay
  away from syntax older Hermes builds may lack (`??=`, `String.prototype.matchAll`, lookbehind).
- **React Native's cookie jar.** RN's XHR defaults to `withCredentials: true`; on Android OkHttp then
  replaces any `Cookie` header the code sets with the native jar's cookies. A provider that manages
  its own cookies sends `withCredentials: false`.
- **WebView requests and Cloudflare.**
  - `makeGetRequestWithWebView` and `makePostRequestWithWebView` wait past a Cloudflare challenge:
    they poll the page until it is no longer "Just a moment...", within 30 s.
  - Don't pass a `User-Agent` to them unless a site needs one. Cloudflare fails a challenge whose
    user agent claims another browser than the engine's client hints, and the `cf_clearance` cookie
    only holds for the user agent that earned it.
  - Known gap: on the iOS simulator, Cloudflare's Turnstile stalls in the hidden WKWebView (WebKit
    blocks its Private Access Token request). Not yet tried on a real iPhone.
- **HLS sources.** Run ffprobe on them: some sites list qualities whose master playlist has no video
  stream, which ExoPlayer rejects as a malformed manifest.
- **File hosts wrap files in HTML.** FastDL's `dl.php?link=<url>` is a "Download Now" page, not the
  file. Return the file URL, and check that a direct source is media (`curl -r 0-15`, or ffprobe)
  rather than HTML.

## Testing on devices

- **Android (emulator):**
  - The example app (`consumet.example`) loads its JS from Metro. If the emulator can't reach
    `10.0.2.2:8081`, run `adb reverse tcp:8081 tcp:8081` and set the app's debug host to
    `localhost:8081` (dev menu, or `debug_http_host` in its shared preferences).
  - Drive it with `adb shell uiautomator dump` and `adb shell input tap`. With 3-button navigation
    the system bar covers the bottom 126 px, so taps there hit Home. Check you are still in the app
    with `adb shell dumpsys activity activities | grep topResumedActivity`.
  - Inspect a hidden WebView over DevTools:
    `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`, then `http://localhost:9222/json`.
- **The app's JS runtime:** reach it through Metro's inspector (`http://localhost:8081/json/list`).
  It rejects WebSocket clients that don't send `Origin: http://localhost:8081`. Native modules are at
  `globalThis.nativeModuleProxy.Consumet`.
- **Debugging a registry bundle on the device:** put an instrumented copy into
  `apps/src/registry/local-dist-map.ts`, load it in the Registry tab with Local dist and Run
  unverified, read `adb logcat ReactNativeJS`, then regenerate the map.
- **iOS:**
  - Xcode 27 replaced Simulator.app with DeviceHub. Open DeviceHub before `yarn ios`, or the CLI
    fails at `open devices://...`.
  - After an Xcode update, the first build can fail on a stale module cache in DerivedData.
- **Sharing devices:** one session drives the emulator at a time. If the user is using it, or the Mac
  (iOS taps are global mouse events), stop driving it.

## Providers

- **Manga:** every provider returns one shape (see "What every manga provider returns" in
  [docs/guides/manga.md](docs/guides/manga.md)).
  - Unit tests run trimmed, recorded responses from `test/unit/fixtures/manga/<provider>/` through
    `test/unit/helpers/manga-contract.ts`; live suites live in `test/manga/`.
  - The example app's Manga tab runs the same checks on the device.
- **Fixtures:** trimmed real responses, each noting the request URL and when it was recorded.
- **Site etiquette:**
  - Fetch only the pages a fix and its tests need. Don't bulk-download a site to study it.
  - If a site's robots.txt blocks AI agents, don't disguise the requests: report it to the user.
  - The user has decided to keep FlameScans and MangaKakalot's search-box endpoint despite their
    robots.txt, so don't raise those again.
- **Live tests** hit real sites: run them once, not in loops. Cloudflare escalates after repeated
  challenges from one IP.

## Larger changes in parallel

The user may ask for several agents at once. Give each lane a git worktree under
`.claude/worktrees/<lane>`, created from local HEAD (main is often ahead of origin), with
`node_modules` and `apps/node_modules` symlinked from the main checkout. Each lane owns its files and
commits with `--no-verify`. Merge each lane with `git cherry-pick -n`, apply the registry steps above,
and commit through the hook. Git ignores `.claude/worktrees/`, and jest, tsc and ESLint skip
`.claude/`.
