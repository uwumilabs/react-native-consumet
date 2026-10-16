"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGISTRY_SIGNING_KEYS = void 0;
/**
 * Public keys trusted to sign the downloadable extension registry (REG-6): raw 32-byte ed25519
 * keys as 64-character lowercase hex. verifyRegistrySignature accepts a registry signed by any of
 * them.
 *
 * `yarn registry:keygen` adds a key here and prints its private key once, for the CI secret that
 * signs src/extension-registry.json (.github/workflows/sign-registry.yml). Keep an old key listed
 * while apps move to a release that bundles its replacement, then remove it. Remove a leaked key
 * at once.
 *
 * Empty until the first key is generated. Until then a downloaded registry can't be verified and
 * verifyRegistrySignature fails closed. The registry bundled in the app needs no signature.
 *
 * scripts/sign-registry.js and scripts/registry-keygen.js read and edit this list: keep each key a
 * quoted string literal inside the array.
 */
exports.REGISTRY_SIGNING_KEYS = [];
//# sourceMappingURL=registry-signing-keys.js.map