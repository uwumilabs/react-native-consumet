import type { ExtensionRegistryData } from '../models/extension-manifest';
/**
 * Signatures for a downloaded extension registry (REG-6).
 *
 * The registry an app downloads (src/extension-registry.json on main) holds the code URLs and the
 * hashes that check the code, so its hashes alone can't catch a malicious change to it. CI signs
 * the file's exact bytes with ed25519 and publishes the signature next to it, at the registry URL
 * plus `.sig` (src/extension-registry.json.sig). Apps check that signature against the public keys
 * bundled in this library before parsing the registry.
 *
 * Signature file: one to MAX_REGISTRY_SIGNATURES lines, each a 128-character hex ed25519
 * signature of the registry bytes. Several lines let CI sign with an old and a new key while a
 * key rotation rolls out. The registry verifies when any line verifies under any trusted key.
 *
 * Pure JS (noble-curves, no Buffer, crypto or TextEncoder), so it runs on Hermes.
 */
export type RegistrySignatureErrorCode = 
/** No trusted public key: this build can't verify a downloaded registry */
'NO_SIGNING_KEYS'
/** A trusted key isn't a 64-character hex ed25519 public key */
 | 'INVALID_SIGNING_KEY'
/** The signature file isn't 1 to MAX_REGISTRY_SIGNATURES lines of 128-character hex */
 | 'MALFORMED_SIGNATURE'
/** No signature verifies: the registry changed after signing, or a key this app doesn't trust signed it */
 | 'SIGNATURE_MISMATCH';
/** Thrown when a downloaded registry can't be verified. Never means the registry is usable. */
export declare class RegistrySignatureError extends Error {
    readonly code: RegistrySignatureErrorCode;
    constructor(code: RegistrySignatureErrorCode, message: string);
}
/**
 * Public keys trusted to sign a downloaded registry, as lowercase hex: the `publicKey` of each
 * entry in src/registry-signing-keys.json. `yarn registry:keygen` adds a key there and prints its
 * private key once, for the CI secret that signs src/extension-registry.json
 * (.github/workflows/sign-registry.yml). An app trusts only the keys of the library version it
 * ships, so keep an old key listed while apps move to a release that bundles its replacement.
 * Without keys, downloaded registries can't be verified and verifyRegistrySignature fails closed.
 */
export declare const REGISTRY_SIGNING_KEYS: readonly string[];
export { MAX_REGISTRY_SIGNATURES } from './registry-signature-format';
export interface RegistrySignatureOptions {
    /**
     * Hex ed25519 public keys to trust instead of the bundled REGISTRY_SIGNING_KEYS. To trust a key
     * of your own as well, pass `[...REGISTRY_SIGNING_KEYS, yourKey]`.
     */
    publicKeys?: readonly string[];
}
/**
 * Check a downloaded registry against its signature file before using it. Pass the registry
 * exactly as downloaded (the response text, or its bytes), not JSON re-serialized from it.
 *
 * @param registryText the registry file's text (UTF-8 encoded to check it) or raw bytes
 * @param signature the signature file's text (the registry URL plus `.sig`)
 * @param publicKeys trusted hex public keys; defaults to the bundled REGISTRY_SIGNING_KEYS
 * @returns the public key that verified the registry
 * @throws RegistrySignatureError when no key is configured, a key or the signature is malformed,
 *   or no signature verifies under a trusted key. It never returns without a valid signature.
 */
export declare function verifyRegistrySignature(registryText: string | Uint8Array, signature: string, publicKeys?: readonly string[]): string;
/**
 * Verify a downloaded registry, then parse and validate it (validateRegistry). This is the safe
 * way to turn a downloaded registry into one the managers can use.
 *
 * @param registryText the registry file's text, exactly as downloaded
 * @param signature the signature file's text (the registry URL plus `.sig`)
 * @throws RegistrySignatureError when the signature doesn't verify (checked before parsing)
 * @throws RegistryError when the signed registry isn't valid JSON or fails validateRegistry
 */
export declare function parseSignedRegistry(registryText: string, signature: string, options?: RegistrySignatureOptions): ExtensionRegistryData & {
    schemaVersion: number;
};
//# sourceMappingURL=registry-signature.d.ts.map