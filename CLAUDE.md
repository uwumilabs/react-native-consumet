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
| `yarn test` | Builds, then the offline unit tests (`test/unit/`, recorded fixtures) |
| `yarn test:live` | Also the live suites (`test/anime`, `test/manga`, ...), which hit real sites; in band, since jest workers crash serialising axios errors |
| `yarn typecheck` | `tsc` over the library and `apps/src` (ts-jest type-checks the tests as they run) |
| `yarn lint` | ESLint (it ignores `apps/`; lint those files with `npx eslint --no-ignore`) |
| `yarn build` | The registry bundles in `dist/bundles/` (not committed) |
| `yarn build:registry` | `yarn build`, then publish bumped registry versions and rewrite the local dist map (what the hook and release run) |
| `yarn registry:check` | Checks every registry entry against its build and published file |
| `yarn example gen:local-dist` | Regenerates `apps/src/registry/local-dist-map.ts` |
| `cd apps && yarn android --no-packager --active-arch-only` | Builds and starts the example app (Metro already running: `yarn example start`) |

Node 24 (`.nvmrc`): the registry scripts `require` the library's import-free modules (registry
schema, signature format) straight from their `.ts` sources, which Node 20 can't, so nothing is built
or installed before signing.

## Commits

- Messages must pass `commitlint.config.js`: `type(scope): subject`, lower-case scope and subject, a
  subject of at least 10 characters with no trailing period, body lines of at most 100 characters,
  types feat, fix, docs, style, refactor, test, chore, perf, ci. Check a message with
  `npx --no-install commitlint < msgfile`.
- Never add attribution: no `Co-Authored-By`, no "Generated with ...", no mention of Claude.
- A breaking change to public behaviour (ids, return shapes, signatures) gets a `BREAKING CHANGE:`
  footer; release-it then bumps the major version.
- The pre-commit hook runs lint-staged, `yarn typecheck` and `scripts/stage-registry.js`, which runs
  `yarn build:registry` on the staged files and stages new registry/ files, the registry and the
  local dist map. It does not run the tests:
  run `yarn test` first.
- Commit only when asked. Pushing, tagging and releasing are the user's.

## Registry bundles

- `registry/` is committed and generated; `dist/` is built, not committed. Never edit files under
  `registry/` by hand: their bytes are hashed (the folder is in `.prettierignore` for that reason).
- If a change alters a registry bundle, bump that entry's `version` in `src/extension-registry.json`
  before committing, or the hook stops. To find the changed entries, run `yarn build` and compare the
  sha256 of each entry's `distFile` with its `sha256`. The three NetMirror entries share one bundle,
  so they move together.
- Then `yarn build:registry` (or the hook) publishes `registry/<extensions|extractors>/<key>/<version>.js`
  and rewrites `apps/src/registry/local-dist-map.ts`; commit both. A version published only in your
  working tree (never committed) can be deleted and published again.
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
- **Segments disguised as images.** Some servers put a small PNG in front of each MPEG-TS segment
  and serve it as `image/png` from an image CDN (MegaPlay's `?s=tcdn` server, on tiktokcdn).
  ffprobe then sees one `png` video stream and no audio, and ExoPlayer's TS sniffing fails because
  the packets don't line up from the start. Check the first bytes of a segment (`curl -r 0-15`;
  plain TS starts with `0x47`) and prefer servers that serve plain TS.
- **Audio in separate renditions.** When a master lists the audio as `#EXT-X-MEDIA:TYPE=AUDIO` with
  a `URI`, its variant playlists are video only. Don't return them as quality sources (apps pick the
  highest quality and play it silent); return the master, as the MegaPlay extractor does. A
  player's `audioTracks: []` on load is the sign.
- **No sound on the emulator** can simply be media volume 0: check `STREAM_MUSIC` in
  `adb shell dumpsys audio` before blaming the stream.
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

- **Supported versions:** library 2.0.0 and later. Older apps' registries point at the old committed
  dist/ on main; nothing keeps them working.
- **Shape:** every anime and movie provider is a factory `createX(ctx, customBaseURL?)`; bundled
  classes are generated from it with `providerClass(Base, createX)` (`src/providers/provider-class.ts`),
  so a new method needs no wrapper change. Every extractor is a function `X(ctx)` returning `{ extract }`,
  listed once in `src/extractors/index.ts` (which types `ctx.extractors`). Helpers several providers
  share live in `src/providers/common/` (`emptySearch`, `toMediaStatus`, `serverName`, `pickServer`,
  `ENC_DEC_API`); server names are `<extractor>-<label>`, built with `serverName`.

- **Manga:** every provider returns one shape (see "What every manga provider returns" in
  [docs/guides/manga.md](docs/guides/manga.md)).
  - The checks are plain functions in `test/contracts/manga.ts` (no jest, so Metro bundles it):
    `test/unit/helpers/manga-contract.ts` wraps them for unit tests (recorded responses from
    `test/unit/fixtures/manga/<provider>/`) and live suites (`test/manga/`), and the example app's
    Manga tab runs them on the device.
- **Anime and movie live suites** check results with `test/unit/helpers/media-contract.ts` (search
  page, info with episodes, servers, sources).
- **Fixtures:** trimmed real responses, each noting the request URL and when it was recorded.
- **Tests:** `test/` is outside ESLint (it reads `.prettierignore`); rules about the source, such as
  providers importing axios only for types, are ESLint rules, not tests. TypeScript 6 adds no
  `@types` globals, so helpers outside `*.test.ts` (checked by `yarn typecheck`) import `jest` and
  `expect` from `@jest/globals`. Shared helpers: `test/unit/helpers/` (registry entries and a
  `fetch` that serves them, fake providers for the meta tests, `rejectionOf`).
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
