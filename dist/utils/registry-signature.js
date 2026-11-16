"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MAX_REGISTRY_SIGNATURES = exports.REGISTRY_SIGNING_KEYS = exports.RegistrySignatureError = void 0;
exports.verifyRegistrySignature = verifyRegistrySignature;
exports.parseSignedRegistry = parseSignedRegistry;
const ed25519_1 = require("@noble/curves/ed25519");
const registry_signing_keys_json_1 = __importDefault(require("../registry-signing-keys.json"));
const registry_schema_1 = require("./registry-schema");
const registry_signature_format_1 = require("./registry-signature-format");
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
/**
 * Public keys trusted to sign a downloaded registry, as lowercase hex: the `publicKey` of each
 * entry in src/registry-signing-keys.json. `yarn registry:keygen` adds a key there and prints its
 * private key once, for the CI secret that signs src/extension-registry.json
 * (.github/workflows/sign-registry.yml). An app trusts only the keys of the library version it
 * ships, so keep an old key listed while apps move to a release that bundles its replacement.
 * Without keys, downloaded registries can't be verified and verifyRegistrySignature fails closed.
 */
exports.REGISTRY_SIGNING_KEYS = registry_signing_keys_json_1.default.map(entry => entry.publicKey);
var registry_signature_format_2 = require("./registry-signature-format");
Object.defineProperty(exports, "MAX_REGISTRY_SIGNATURES", {
  enumerable: true,
  get: function () {
    return registry_signature_format_2.MAX_REGISTRY_SIGNATURES;
  }
});
// RFC 8032 checks: rejects non-canonical encodings and small-order keys (noble defaults to ZIP 215).
const STRICT = {
  zip215: false
};
/** Bytes of a hex string already checked by publicKeyHex or parseSignatureLines. */
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
    const hex = (0, registry_signature_format_1.publicKeyHex)(key);
    const bytes = hex && hexToBytes(hex);
    if (!hex || !bytes || !ed25519_1.ed25519.utils.isValidPublicKey(bytes, false)) {
      throw new RegistrySignatureError('INVALID_SIGNING_KEY', `Registry signing key ${index} is not a 64-character hex ed25519 public key`);
    }
    return {
      hex,
      bytes
    };
  });
}
function parseSignatures(signature) {
  try {
    return (0, registry_signature_format_1.parseSignatureLines)(signature).map(hexToBytes);
  } catch (error) {
    throw new RegistrySignatureError('MALFORMED_SIGNATURE', `Registry signature ${error.message}`);
  }
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
  let publicKeys = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : exports.REGISTRY_SIGNING_KEYS;
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