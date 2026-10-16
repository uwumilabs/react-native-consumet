"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.REGISTRY_SIGNING_KEYS = exports.MAX_REGISTRY_SIGNATURES = exports.RegistrySignatureError = void 0;
exports.verifyRegistrySignature = verifyRegistrySignature;
exports.parseSignedRegistry = parseSignedRegistry;
const ed25519_1 = require("@noble/curves/ed25519");
const registry_signing_keys_1 = require("../registry-signing-keys");
Object.defineProperty(exports, "REGISTRY_SIGNING_KEYS", {
  enumerable: true,
  get: function () {
    return registry_signing_keys_1.REGISTRY_SIGNING_KEYS;
  }
});
const registry_schema_1 = require("./registry-schema");
/** Thrown when a downloaded registry can't be verified. Never means the registry is usable. */
class RegistrySignatureError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = 'RegistrySignatureError';
    this.code = code;
    // Keep `instanceof RegistrySignatureError` working when compiled to ES5-style classes.
    Object.setPrototypeOf(this, RegistrySignatureError.prototype);
  }
}
exports.RegistrySignatureError = RegistrySignatureError;
/** Most signature lines checked, so an oversized signature file can't keep the app busy verifying. */
exports.MAX_REGISTRY_SIGNATURES = 4;
const PUBLIC_KEY_RE = /^[0-9a-f]{64}$/i;
const SIGNATURE_RE = /^[0-9a-f]{128}$/i;
// RFC 8032 checks: rejects non-canonical encodings and small-order keys (noble defaults to ZIP 215).
const STRICT = {
  zip215: false
};
/** Bytes of a hex string already checked against PUBLIC_KEY_RE or SIGNATURE_RE. */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
/**
 * UTF-8 bytes of `text`, the bytes Node writes for it: a lone surrogate becomes U+FFFD, as with
 * TextEncoder. Written out so verification doesn't depend on the runtime providing TextEncoder.
 */
function utf8Bytes(text) {
  // At most 3 bytes per UTF-16 code unit (a surrogate pair is 2 units and 4 bytes).
  const bytes = new Uint8Array(text.length * 3);
  let length = 0;
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + (code - 0xd800 << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) {
      bytes[length++] = code;
    } else if (code < 0x800) {
      bytes[length++] = 0xc0 | code >> 6;
      bytes[length++] = 0x80 | code & 0x3f;
    } else if (code < 0x10000) {
      bytes[length++] = 0xe0 | code >> 12;
      bytes[length++] = 0x80 | code >> 6 & 0x3f;
      bytes[length++] = 0x80 | code & 0x3f;
    } else {
      bytes[length++] = 0xf0 | code >> 18;
      bytes[length++] = 0x80 | code >> 12 & 0x3f;
      bytes[length++] = 0x80 | code >> 6 & 0x3f;
      bytes[length++] = 0x80 | code & 0x3f;
    }
  }
  return bytes.subarray(0, length);
}
function trustedKeys(publicKeys) {
  if (!Array.isArray(publicKeys) || publicKeys.length === 0) {
    throw new RegistrySignatureError('NO_SIGNING_KEYS', 'No registry signing key configured: this version of react-native-consumet bundles no public key ' + 'to verify a downloaded registry. Use the bundled registry, or pass publicKeys.');
  }
  return publicKeys.map((key, index) => {
    const bytes = typeof key === 'string' && PUBLIC_KEY_RE.test(key) ? hexToBytes(key) : undefined;
    if (!bytes || !ed25519_1.ed25519.utils.isValidPublicKey(bytes, false)) {
      throw new RegistrySignatureError('INVALID_SIGNING_KEY', `Registry signing key ${index} is not a 64-character hex ed25519 public key`);
    }
    return {
      hex: key.toLowerCase(),
      bytes
    };
  });
}
function parseSignatures(signature) {
  const lines = typeof signature === 'string' ? signature.split('\n').map(line => line.trim()) : [];
  const signatures = lines.filter(Boolean);
  if (signatures.length === 0 || signatures.length > exports.MAX_REGISTRY_SIGNATURES) {
    throw new RegistrySignatureError('MALFORMED_SIGNATURE', `Registry signature must be 1 to ${exports.MAX_REGISTRY_SIGNATURES} lines of hex ed25519 signatures ` + `(got ${signatures.length})`);
  }
  return signatures.map((line, index) => {
    if (!SIGNATURE_RE.test(line)) {
      throw new RegistrySignatureError('MALFORMED_SIGNATURE', `Registry signature line ${index + 1} is not a 128-character hex ed25519 signature`);
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
function verifyRegistrySignature(registryText, signature) {
  let publicKeys = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : registry_signing_keys_1.REGISTRY_SIGNING_KEYS;
  const keys = trustedKeys(publicKeys);
  const signatures = parseSignatures(signature);
  let message;
  if (typeof registryText === 'string') message = utf8Bytes(registryText);else if (registryText instanceof Uint8Array) message = registryText;else throw new TypeError('verifyRegistrySignature: registryText must be a string or a Uint8Array');
  for (const bytes of signatures) {
    for (const key of keys) {
      let valid = false;
      try {
        valid = ed25519_1.ed25519.verify(bytes, message, key.bytes, STRICT);
      } catch {
        valid = false;
      }
      if (valid) return key.hex;
    }
  }
  throw new RegistrySignatureError('SIGNATURE_MISMATCH', 'Registry signature does not match: the registry changed after it was signed (or its signature ' + 'is not updated yet), or it was signed with a key this app does not trust. Keep using the ' + 'registry you have.');
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
function parseSignedRegistry(registryText, signature) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  verifyRegistrySignature(registryText, signature, options.publicKeys);
  let registry;
  try {
    registry = JSON.parse(registryText);
  } catch (error) {
    const issue = `registry: not valid JSON (${error instanceof Error ? error.message : String(error)})`;
    throw new registry_schema_1.RegistryError('INVALID_REGISTRY', `Invalid extension registry: ${issue}`, {
      issues: [issue]
    });
  }
  return (0, registry_schema_1.validateRegistry)(registry);
}
//# sourceMappingURL=registry-signature.js.map