import type { ProviderContext } from '../models';
/**
 * Reads the arguments of a provider class wrapper. Wrappers take `(ctx?, customBaseURL?)`, the
 * order of the factories they wrap, or the older `(customBaseURL?)`. Without a context they get
 * `createProviderContext()`.
 */
export declare function providerArgs(ctxOrBaseURL?: ProviderContext | string, customBaseURL?: string): [ctx: ProviderContext, customBaseURL: string | undefined];
//# sourceMappingURL=provider-args.d.ts.map