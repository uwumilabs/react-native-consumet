"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaError = void 0;
/**
 * Error thrown by meta providers (Anilist, MAL, TMDB). Keeps the failing service, its HTTP status
 * when there was one, and the original error as `cause`, so apps can tell a rate limit or an
 * outage from a missing title.
 */
class MetaError extends Error {
    source;
    status;
    cause;
    constructor(message, options) {
        super(message);
        this.name = 'MetaError';
        this.source = options.source;
        this.status = options.status;
        this.cause = options.cause;
        Object.setPrototypeOf(this, MetaError.prototype);
    }
    /** Wraps any thrown value, reading the HTTP status from axios errors. A MetaError passes through. */
    static from(source, error, message) {
        if (error instanceof MetaError)
            return error;
        const status = error?.response?.status;
        return new MetaError(message ?? (error instanceof Error ? error.message : String(error)), {
            source,
            status: typeof status === 'number' ? status : undefined,
            cause: error,
        });
    }
}
exports.MetaError = MetaError;
//# sourceMappingURL=meta-error.js.map