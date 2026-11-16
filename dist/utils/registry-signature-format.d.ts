/** Most signature lines checked, so an oversized signature file can't keep the app busy verifying. */
export declare const MAX_REGISTRY_SIGNATURES = 4;
/**
 * A raw 32-byte ed25519 public key in hex, either case, as lowercase hex; undefined for anything
 * else. Keys compare in lowercase.
 */
export declare function publicKeyHex(key: unknown): string | undefined;
/**
 * The signatures in a signature file, as lowercase hex: 1 to MAX_REGISTRY_SIGNATURES non-empty
 * lines, each a 128-character hex ed25519 signature.
 *
 * @throws Error saying what is wrong, e.g. `line 2 is not a 128-character hex ed25519 signature`
 */
export declare function parseSignatureLines(text: unknown): string[];
//# sourceMappingURL=registry-signature-format.d.ts.map