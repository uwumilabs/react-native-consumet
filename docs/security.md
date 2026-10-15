# Security Model

react-native-consumet downloads provider and extractor code at runtime and runs it with `new Function()`. This page describes what that code can do, what the library checks before running it, and what is still missing.

## Trust model: extension code is fully trusted

There is **no sandbox**. Extension code runs in the app's own JavaScript runtime with the app's privileges:

- It receives a context with `axios`, `fetch`, `cheerio`, `CryptoJS`, URL helpers and **`NativeConsumet`** (WebView-backed GET/POST requests that carry the site's cookies, a direct POST client, DDoS-Guard bypass, and a script deobfuscator).
- The provided context is a convenience, not a boundary: code can reach `globalThis` and, through any function's `.constructor`, `Function` itself, and from there anything the app's JS can reach.

So the only security boundary is **which code gets to run**. Everything below is about making sure the code that runs is exactly the code that was published.

| Threat | Vector | What stops it |
|---|---|---|
| Tampered or corrupted download | CDN compromise, MITM, truncated response | SHA-256 check before execution (below) |
| Code injection through the registry | Malicious `factoryName` / extractor `name` interpolated into the `new Function()` template | Identifier validation (below) |
| A push to `main` changing what a published version runs | Rebuilding `dist/` | Immutable versioned files (below) |
| A malicious registry | Apps that download the registry get URLs and hashes from the same place | **Not yet solved**, see Known gaps |

## What the library enforces

### 1. SHA-256 integrity on every execution path

Every registry entry carries the `sha256` of its compiled file:

```json
{ "id": "animepahe", "main": "https://raw.githubusercontent.com/...", "sha256": "36a6ff40…" }
```

Before running any code, `ProviderManager` and `ExtractorManager` compare `SHA256(code)` with that hash. This applies to `loadExtension` / `loadExtractor` **and** to direct `executeProviderCode` / `executeExtractorCode` calls (the path apps that cache code use). Nothing runs on a mismatch:

```ts
import { IntegrityError } from 'react-native-consumet';

try {
  await providerManager.executeProviderCode(code, entry.factoryName, entry);
} catch (e) {
  if (e instanceof IntegrityError) {
    // e.code: 'INTEGRITY_MISMATCH' | 'INTEGRITY_MISSING' | 'INVALID_IDENTIFIER'
    // re-download the file, or ask the user to update the app
  }
}
```

- **Missing hash:** an entry without `sha256` is rejected. Construct the manager with `{ allowUnhashed: true }` (third constructor argument) only for registries you control.
- **Opting out:** `executeProviderCode(code, factoryName, metadata, { skipIntegrity: true })` (and the same for `executeExtractorCode`) runs code without the check. Use it only for code you already trust, such as files bundled with your app.
- **Checking at install time:** apps that download and cache code should verify it when they store it, with `verifyExtensionCode(code, entry)`.

### 2. Identifier validation

`factoryName` (providers) and `name` (extractors) are interpolated into the generated function body, so both must match `/^[A-Za-z_$][A-Za-z0-9_$]*$/`. Anything else throws `IntegrityError` with code `INVALID_IDENTIFIER` before code is built.

### 3. Immutable versioned files

Each registry entry's `main` points at a published copy of one exact version, `registry/extensions/<id>/<version>.js` or `registry/extractors/<name>/<version>.js`, written by `scripts/prepare-registry.js`. Published files are never overwritten: changing an entry's code requires a new `version` and therefore a new URL, so rebuilding `dist/` on `main` doesn't change what any published registry entry serves.

### 4. HTTPS and bounded downloads

Registry URLs use `https://raw.githubusercontent.com`; the platform networking stack enforces TLS. Code downloads are aborted after 30 seconds instead of hanging.

## Known gaps

These are tracked in the roadmap and not solved yet:

- **Library versions up to 1.6.0** still carry registries whose URLs point straight at `dist/` on `main`. Rebuilding `dist/` changes what those versions download, so 1.6.0 fails integrity checks and older versions run the new code unchecked. Updating the library fixes this.
- **Immutability is enforced by the publish script, not by GitHub.** Published files under `registry/` live on the `main` branch; nothing but review and `yarn registry:check` stops someone from editing one by hand.
- **Unsigned remote registry (REG-6).** When an app downloads `extension-registry.json`, the URLs and hashes come from the same mutable place, so the hash only detects corruption, not a malicious push. A registry bundled in the app binary is trustworthy; a downloaded one is only as trustworthy as the repository.
- **Versions up to 1.5.0** do not verify hashes at all.
- **Native module (SEC-2).** On Android, WebView remote debugging is currently enabled in release builds, and cookies and headers are written to logcat. On iOS, cookies from the shared WebView data store are returned without filtering by domain.

## Publishing and checking the registry

`scripts/prepare-registry.js` publishes each entry's build output (`distFile`) to its versioned path if that version isn't published yet, then writes `main` and `sha256` to both `src/extension-registry.json` and `dist/extension-registry.json`. It runs in the release flow (`after:bump` in release-it). Run it yourself after rebuilding `dist/`:

```bash
yarn build && node scripts/prepare-registry.js
```

It exits with an error, and writes nothing, if a build file is missing or if an entry's build output changed without a version bump. `yarn registry:check` runs the same checks without writing. The pre-commit hook rebuilds `dist/` but doesn't run these checks yet (REG-5).

## Guidance for consumers

1. **Prefer a bundled registry**, or verify a downloaded one out of band; see the unsigned-registry gap above.
2. **Verify cached code** with `verifyExtensionCode` when you store it, and handle `IntegrityError` by re-downloading.
3. **Always ship `sha256`** in custom registries; don't rely on `allowUnhashed`.
4. **Use HTTPS URLs** for all code.

## Reporting vulnerabilities

Open a [GitHub issue](https://github.com/uwumilabs/react-native-consumet/issues) marked **[Security]** or contact the maintainers directly via the [Discord server](https://discord.gg/n7xVPxbG4R).
