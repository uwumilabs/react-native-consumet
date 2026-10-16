import type { ProviderContext } from '../models';
import { createProviderContext } from '../utils/create-provider-context';

/**
 * Reads the arguments of a provider class wrapper. Wrappers take `(ctx?, customBaseURL?)`, the
 * order of the factories they wrap, or the older `(customBaseURL?)`. Without a context they get
 * `createProviderContext()`.
 */
export function providerArgs(
  ctxOrBaseURL?: ProviderContext | string,
  customBaseURL?: string
): [ctx: ProviderContext, customBaseURL: string | undefined] {
  if (typeof ctxOrBaseURL === 'string') return [createProviderContext(), ctxOrBaseURL];
  return [ctxOrBaseURL ?? createProviderContext(), customBaseURL];
}
