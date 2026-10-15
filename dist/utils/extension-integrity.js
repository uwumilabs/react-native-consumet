"use strict";

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sha256Hex = exports.IntegrityError = void 0;
exports.assertValidIdentifier = assertValidIdentifier;
exports.verifyExtensionCode = verifyExtensionCode;
const crypto_js_1 = __importDefault(require("crypto-js"));
/**
 * Thrown when extension/extractor code doesn't match its registry entry, or the entry
 * can't be safely turned into executable code.
 */
class IntegrityError extends Error {
  code;
  id;
  expected;
  actual;
  constructor(code, id, message) {
    let details = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    super(message);
    this.name = 'IntegrityError';
    this.code = code;
    this.id = id;
    this.expected = details.expected;
    this.actual = details.actual;
    // Keep `instanceof IntegrityError` working when compiled to ES5-style classes.
    Object.setPrototypeOf(this, IntegrityError.prototype);
  }
}
exports.IntegrityError = IntegrityError;
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const sha256Hex = code => crypto_js_1.default.SHA256(code).toString(crypto_js_1.default.enc.Hex);
exports.sha256Hex = sha256Hex;
/**
 * Factory and extractor names are interpolated into generated code, so they must be plain identifiers.
 */
function assertValidIdentifier(value, what, id) {
  if (typeof value !== 'string' || !IDENTIFIER_RE.test(value)) {
    throw new IntegrityError('INVALID_IDENTIFIER', id, `Invalid ${what} '${String(value)}' for '${id}'`);
  }
}
/**
 * Verify code against the `sha256` of its registry entry before it is executed.
 * Apps can call this when installing/caching extension code.
 *
 * @throws IntegrityError when the hash is missing (unless `allowUnhashed`) or doesn't match
 */
function verifyExtensionCode(code, manifest) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const id = manifest.id || manifest.name || 'unknown';
  if (!manifest.sha256) {
    if (options.allowUnhashed) return;
    throw new IntegrityError('INTEGRITY_MISSING', id, `No integrity hash for '${id}'; refusing to run unverified code`);
  }
  const actual = (0, exports.sha256Hex)(code);
  if (actual !== manifest.sha256) {
    throw new IntegrityError('INTEGRITY_MISMATCH', id, `Integrity check failed for '${id}': expected ${manifest.sha256.slice(0, 12)}… got ${actual.slice(0, 12)}…`, {
      expected: manifest.sha256,
      actual
    });
  }
}
//# sourceMappingURL=extension-integrity.js.map