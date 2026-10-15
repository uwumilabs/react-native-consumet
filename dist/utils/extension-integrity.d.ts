export type IntegrityErrorCode = 'INTEGRITY_MISMATCH' | 'INTEGRITY_MISSING' | 'INVALID_IDENTIFIER';
/**
 * Thrown when extension/extractor code doesn't match its registry entry, or the entry
 * can't be safely turned into executable code.
 */
export declare class IntegrityError extends Error {
    readonly code: IntegrityErrorCode;
    readonly id: string;
    readonly expected?: string;
    readonly actual?: string;
    constructor(code: IntegrityErrorCode, id: string, message: string, details?: {
        expected?: string;
        actual?: string;
    });
}
export interface IntegrityOptions {
    /** Run code whose registry entry has no `sha256`. Off by default. */
    allowUnhashed?: boolean;
}
export interface ExecuteCodeOptions {
    /** Run the code without checking it against the registry `sha256`. Only for code you already trust. */
    skipIntegrity?: boolean;
}
export declare const sha256Hex: (code: string) => string;
/**
 * Factory and extractor names are interpolated into generated code, so they must be plain identifiers.
 */
export declare function assertValidIdentifier(value: unknown, what: string, id: string): asserts value is string;
/**
 * Verify code against the `sha256` of its registry entry before it is executed.
 * Apps can call this when installing/caching extension code.
 *
 * @throws IntegrityError when the hash is missing (unless `allowUnhashed`) or doesn't match
 */
export declare function verifyExtensionCode(code: string, manifest: {
    id?: string;
    name?: string;
    sha256?: string;
}, options?: IntegrityOptions): void;
//# sourceMappingURL=extension-integrity.d.ts.map