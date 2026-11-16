// The format of registry signatures and signing keys, shared by the library (registry-signature.ts)
// and the signing scripts (scripts/registry-signing.js). No runtime imports: the scripts require
// the built file without installed packages.

/** Most signature lines checked, so an oversized signature file can't keep the app busy verifying. */
export const MAX_REGISTRY_SIGNATURES = 4;

const PUBLIC_KEY_RE = /^[0-9a-f]{64}$/i;
const SIGNATURE_RE = /^[0-9a-f]{128}$/i;

/**
 * A raw 32-byte ed25519 public key in hex, either case, as lowercase hex; undefined for anything
 * else. Keys compare in lowercase.
 */
export function publicKeyHex(key: unknown): string | undefined {
  return typeof key === 'string' && PUBLIC_KEY_RE.test(key) ? key.toLowerCase() : undefined;
}

/**
 * The signatures in a signature file, as lowercase hex: 1 to MAX_REGISTRY_SIGNATURES non-empty
 * lines, each a 128-character hex ed25519 signature.
 *
 * @throws Error saying what is wrong, e.g. `line 2 is not a 128-character hex ed25519 signature`
 */
export function parseSignatureLines(text: unknown): string[] {
  const lines = typeof text === 'string' ? text.split('\n').map((line) => line.trim()) : [];
  const signatures = lines.filter(Boolean);
  if (signatures.length === 0 || signatures.length > MAX_REGISTRY_SIGNATURES) {
    throw new Error(
      `must be 1 to ${MAX_REGISTRY_SIGNATURES} lines of hex ed25519 signatures (got ${signatures.length})`
    );
  }
  return signatures.map((line, index) => {
    if (!SIGNATURE_RE.test(line)) throw new Error(`line ${index + 1} is not a 128-character hex ed25519 signature`);
    return line.toLowerCase();
  });
}
