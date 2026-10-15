/** Where a meta provider failure came from. */
export type MetaErrorSource = 'anilist' | 'mal' | 'tmdb' | 'anizip' | 'filler' | 'provider';

/**
 * Error thrown by meta providers (Anilist, MAL, TMDB). Keeps the failing service, its HTTP status
 * when there was one, and the original error as `cause`, so apps can tell a rate limit or an
 * outage from a missing title.
 */
export class MetaError extends Error {
  readonly source: MetaErrorSource;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(message: string, options: { source: MetaErrorSource; status?: number; cause?: unknown }) {
    super(message);
    this.name = 'MetaError';
    this.source = options.source;
    this.status = options.status;
    this.cause = options.cause;
    Object.setPrototypeOf(this, MetaError.prototype);
  }

  /** Wraps any thrown value, reading the HTTP status from axios errors. A MetaError passes through. */
  static from(source: MetaErrorSource, error: unknown, message?: string): MetaError {
    if (error instanceof MetaError) return error;
    const status = (error as { response?: { status?: unknown } })?.response?.status;
    return new MetaError(message ?? (error instanceof Error ? error.message : String(error)), {
      source,
      status: typeof status === 'number' ? status : undefined,
      cause: error,
    });
  }
}
