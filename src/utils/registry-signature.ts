import { ed25519 } from '@noble/curves/ed25519';
import type { ExtensionRegistryData } from '../models/extension-manifest';
import { REGISTRY_SIGNING_KEYS } from '../registry-signing-keys';
import { RegistryError, validateRegistry } from './registry-schema';

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
  | 'NO_SIGNING_KEYS'
  /** A trusted key isn't a 64-character hex ed25519 public key */
  | 'INVALID_SIGNING_KEY'
  /** The signature file isn't 1 to MAX_REGISTRY_SIGNATURES lines of 128-character hex */
  | 'MALFORMED_SIGNATURE'
  /** No signature verifies: the registry changed after signing, or a key this app doesn't trust signed it */
  | 'SIGNATURE_MISMATCH';

/** Thrown when a downloaded registry can't be verified. Never means the registry is usable. */
export class RegistrySignatureError extends Error {
  readonly code: RegistrySignatureErrorCode;

  constructor(code: RegistrySignatureErrorCode, message: string) {
    super(message);
    this.name = 'RegistrySignatureError';
    this.code = code;
    // Keep `instanceof RegistrySignatureError` working when compiled to ES5-style classes.
    Object.setPrototypeOf(this, RegistrySignatureError.prototype);
  }
}

/** Most signature lines checked, so an oversized signature file can't keep the app busy verifying. */
export const MAX_REGISTRY_SIGNATURES = 4;

export interface RegistrySignatureOptions {
  /**
   * Hex ed25519 public keys to trust instead of the bundled REGISTRY_SIGNING_KEYS. To trust a key
   * of your own as well, pass `[...REGISTRY_SIGNING_KEYS, yourKey]`.
   */
  publicKeys?: readonly string[];
}

const PUBLIC_KEY_RE = /^[0-9a-f]{64}$/i;
const SIGNATURE_RE = /^[0-9a-f]{128}$/i;
// RFC 8032 checks: rejects non-canonical encodings and small-order keys (noble defaults to ZIP 215).
const STRICT = { zip215: false };

/** Bytes of a hex string already checked against PUBLIC_KEY_RE or SIGNATURE_RE. */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/**
 * UTF-8 bytes of `text`, the bytes Node writes for it: a lone surrogate becomes U+FFFD, as with
 * TextEncoder. Written out so verification doesn't depend on the runtime providing TextEncoder.
 */
function utf8Bytes(text: string): Uint8Array {
  // At most 3 bytes per UTF-16 code unit (a surrogate pair is 2 units and 4 bytes).
  const bytes = new Uint8Array(text.length * 3);
  let length = 0;
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;

    if (code < 0x80) {
      bytes[length++] = code;
    } else if (code < 0x800) {
      bytes[length++] = 0xc0 | (code >> 6);
      bytes[length++] = 0x80 | (code & 0x3f);
    } else if (code < 0x10000) {
      bytes[length++] = 0xe0 | (code >> 12);
      bytes[length++] = 0x80 | ((code >> 6) & 0x3f);
      bytes[length++] = 0x80 | (code & 0x3f);
    } else {
      bytes[length++] = 0xf0 | (code >> 18);
      bytes[length++] = 0x80 | ((code >> 12) & 0x3f);
      bytes[length++] = 0x80 | ((code >> 6) & 0x3f);
      bytes[length++] = 0x80 | (code & 0x3f);
    }
  }
  return bytes.subarray(0, length);
}

function trustedKeys(publicKeys: readonly string[]): { hex: string; bytes: Uint8Array }[] {
  if (!Array.isArray(publicKeys) || publicKeys.length === 0) {
    throw new RegistrySignatureError(
      'NO_SIGNING_KEYS',
      'No registry signing key configured: this version of react-native-consumet bundles no public key ' +
        'to verify a downloaded registry. Use the bundled registry, or pass publicKeys.'
    );
  }
  return publicKeys.map((key, index) => {
    const bytes = typeof key === 'string' && PUBLIC_KEY_RE.test(key) ? hexToBytes(key) : undefined;
    if (!bytes || !ed25519.utils.isValidPublicKey(bytes, false)) {
      throw new RegistrySignatureError(
        'INVALID_SIGNING_KEY',
        `Registry signing key ${index} is not a 64-character hex ed25519 public key`
      );
    }
    return { hex: key.toLowerCase(), bytes };
  });
}

function parseSignatures(signature: string): Uint8Array[] {
  const lines = typeof signature === 'string' ? signature.split('\n').map((line) => line.trim()) : [];
  const signatures = lines.filter(Boolean);
  if (signatures.length === 0 || signatures.length > MAX_REGISTRY_SIGNATURES) {
    throw new RegistrySignatureError(
      'MALFORMED_SIGNATURE',
      `Registry signature must be 1 to ${MAX_REGISTRY_SIGNATURES} lines of hex ed25519 signatures ` +
        `(got ${signatures.length})`
    );
  }
  return signatures.map((line, index) => {
    if (!SIGNATURE_RE.test(line)) {
      throw new RegistrySignatureError(
        'MALFORMED_SIGNATURE',
        `Registry signature line ${index + 1} is not a 128-character hex ed25519 signature`
      );
    }
    return hexToBytes(line);
  });
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
export function verifyRegistrySignature(
  registryText: string | Uint8Array,
  signature: string,
  publicKeys: readonly string[] = REGISTRY_SIGNING_KEYS
): string {
  const keys = trustedKeys(publicKeys);
  const signatures = parseSignatures(signature);
  let message: Uint8Array;
  if (typeof registryText === 'string') message = utf8Bytes(registryText);
  else if (registryText instanceof Uint8Array) message = registryText;
  else throw new TypeError('verifyRegistrySignature: registryText must be a string or a Uint8Array');

  for (const bytes of signatures) {
    for (const key of keys) {
      let valid = false;
      try {
        valid = ed25519.verify(bytes, message, key.bytes, STRICT);
      } catch {
        valid = false;
      }
      if (valid) return key.hex;
    }
  }
  throw new RegistrySignatureError(
    'SIGNATURE_MISMATCH',
    'Registry signature does not match: the registry changed after it was signed (or its signature ' +
      'is not updated yet), or it was signed with a key this app does not trust. Keep using the ' +
      'registry you have.'
  );
}

/**
 * Verify a downloaded registry, then parse and validate it (validateRegistry). This is the safe
 * way to turn a downloaded registry into one the managers can use.
 *
 * @param registryText the registry file's text, exactly as downloaded
 * @param signature the signature file's text (the registry URL plus `.sig`)
 * @throws RegistrySignatureError when the signature doesn't verify (checked before parsing)
 * @throws RegistryError when the signed registry isn't valid JSON or fails validateRegistry
 */
export function parseSignedRegistry(
  registryText: string,
  signature: string,
  options: RegistrySignatureOptions = {}
): ExtensionRegistryData & { schemaVersion: number } {
  verifyRegistrySignature(registryText, signature, options.publicKeys);

  let registry: unknown;
  try {
    registry = JSON.parse(registryText);
  } catch (error) {
    const issue = `registry: not valid JSON (${error instanceof Error ? error.message : String(error)})`;
    throw new RegistryError('INVALID_REGISTRY', `Invalid extension registry: ${issue}`, { issues: [issue] });
  }
  return validateRegistry(registry);
}

export { REGISTRY_SIGNING_KEYS };
