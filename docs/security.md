# Security Model

react-native-consumet dynamically fetches and executes JavaScript provider/extractor code at runtime via `new Function()`. This document describes the threat model, mitigations in place, and guidance for library consumers.

## Threat Model

The dynamic code loading pattern introduces the following risks:

| Threat | Vector | Impact |
|---|---|---|
| **Compromised CDN** | Attacker replaces a dist file on GitHub/CDN | Arbitrary JS runs on the user's device |
| **MITM** | Network attacker intercepts the fetch response | Arbitrary JS runs on the user's device |
| **Registry tampering** | `extension-registry.json` is modified with a malicious `factoryName` | Code injection into the `new Function()` template |
| **Data exfiltration** | Malicious code calls `fetch`/`axios` to an attacker's server | User data or tokens sent off-device |

In React Native / Hermes there is no shell, no `child_process`, no file-system access — so RCE is constrained to what the JS runtime can do (network requests, React Native bridge APIs).

## Mitigations

### 1. SHA-256 Subresource Integrity

Every entry in `extension-registry.json` carries a `sha256` field — the hex digest of its compiled JS file as it existed at release time:

```json
{
  "id": "animepahe",
  "main": "https://raw.githubusercontent.com/...",
  "sha256": "21f402ce947b..."
}
```

At runtime, after fetching the remote file, both `ProviderManager` and `ExtractorManager` compute `CryptoJS.SHA256(code)` and compare against the bundled hash. A mismatch throws immediately before any code executes:

```
Integrity check failed for 'animepahe': expected 21f402ce947b… got deadbeef1234…
```

Because the registry JSON is bundled inside the app binary (not fetched at runtime), the expected hashes cannot be silently replaced by a network attacker.

### 2. `factoryName` Identifier Validation

`factoryName` from the registry is interpolated into the `new Function()` body as the return expression. Before interpolation, `ProviderManager` validates it against `/^[A-Za-z_$][A-Za-z0-9_$]*$/`:

```ts
if (!FACTORY_NAME_RE.test(factoryName)) {
  throw new Error(`Invalid factoryName '${factoryName}'`);
}
```

This prevents a tampered registry from injecting arbitrary code through the `factoryName` field.

### 3. HTTPS-Only Fetches

All `main` URLs in the default registry use `https://raw.githubusercontent.com`. The fetch options do not disable certificate verification (React Native's default networking stack enforces TLS).

### 4. Minimal Context Surface

The `new Function()` execution context exposes only:

- `fetch` / `axios` — network (scoped, no shell)
- `cheerio.load` — HTML parsing
- `CryptoJS` — cryptographic helpers
- `console` — logging
- `Promise`, `Object`, `URL`, `URLSearchParams` — standard JS globals

No React Native bridge APIs, no `NativeModules`, no device storage are exposed inside the sandbox.

## Keeping Hashes Current

Hashes are generated automatically by `scripts/prepare-registry.js`, which runs as part of the release flow (`after:bump` hook in `release-it`). When you:

1. Modify a provider/extractor source file
2. Run `yarn build` to recompile to `dist/`
3. Cut a release (`yarn release`)

…the script recomputes all hashes and writes them back into `src/extension-registry.json` and `dist/extension-registry.json` before the release is tagged.

If you need to regenerate hashes manually (e.g. after `yarn build:clean`):

```bash
node scripts/prepare-registry.js
```

## Guidance for Consumers

If you ship a custom `extension-registry.json` pointing to your own CDN:

1. **Always include `sha256`** for every `main` URL — the managers warn but allow execution when the field is absent, which defeats the protection.
2. **Regenerate hashes after every dist rebuild** — a stale hash will cause runtime failures for your users.
3. **Use HTTPS URLs** — HTTP allows MITM injection regardless of hash checking.
4. **Keep the registry bundled** — do not fetch the registry itself from the network; it must be part of the app bundle so expected hashes are trusted.

## Reporting Vulnerabilities

Open a [GitHub issue](https://github.com/uwumilabs/react-native-consumet/issues) marked **[Security]** or contact the maintainers directly via the [Discord server](https://discord.gg/n7xVPxbG4R).
