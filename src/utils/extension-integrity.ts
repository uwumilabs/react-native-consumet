import CryptoJS from 'crypto-js';

export type IntegrityErrorCode = 'INTEGRITY_MISMATCH' | 'INTEGRITY_MISSING' | 'INVALID_IDENTIFIER';

/**
 * Thrown when extension/extractor code doesn't match its registry entry, or the entry
 * can't be safely turned into executable code.
 */
export class IntegrityError extends Error {
  readonly code: IntegrityErrorCode;
  readonly id: string;
  readonly expected?: string;
  readonly actual?: string;

  constructor(
    code: IntegrityErrorCode,
    id: string,
    message: string,
    details: { expected?: string; actual?: string } = {}
  ) {
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

export interface IntegrityOptions {
  /** Run code whose registry entry has no `sha256`. Off by default. */
  allowUnhashed?: boolean;
}

export interface ExecuteCodeOptions {
  /** Run the code without checking it against the registry `sha256`. Only for code you already trust. */
  skipIntegrity?: boolean;
}

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export const sha256Hex = (code: string): string => CryptoJS.SHA256(code).toString(CryptoJS.enc.Hex);

/**
 * Factory and extractor names are interpolated into generated code, so they must be plain identifiers.
 */
export function assertValidIdentifier(value: unknown, what: string, id: string): asserts value is string {
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
export function verifyExtensionCode(
  code: string,
  manifest: { id?: string; name?: string; sha256?: string },
  options: IntegrityOptions = {}
): void {
  const id = manifest.id || manifest.name || 'unknown';

  if (!manifest.sha256) {
    if (options.allowUnhashed) return;
    throw new IntegrityError('INTEGRITY_MISSING', id, `No integrity hash for '${id}'; refusing to run unverified code`);
  }

  const actual = sha256Hex(code);
  if (actual !== manifest.sha256) {
    throw new IntegrityError(
      'INTEGRITY_MISMATCH',
      id,
      `Integrity check failed for '${id}': expected ${manifest.sha256.slice(0, 12)}… got ${actual.slice(0, 12)}…`,
      { expected: manifest.sha256, actual }
    );
  }
}
