import type { BaseParser, ProviderContext } from '../models';
import { createProviderContext } from '../utils/create-provider-context';

type ProviderFactory = (ctx: ProviderContext, customBaseURL?: string, ...rest: any[]) => object;
type ParserClass = abstract new () => BaseParser;
/** What a factory takes after `(ctx, customBaseURL)`, e.g. MultiStream's TMDB key. */
type ExtraArgs<F> = F extends (ctx: any, customBaseURL?: any, ...rest: infer R) => any ? R : [];

/** A provider class built from its factory: an instance is the factory's output on the category's base parser. */
export interface ProviderClass<F extends ProviderFactory, B extends ParserClass> {
  /**
   * @param ctx provider context; requests and extractors come from it (default: `createProviderContext()`)
   * @param customBaseURL site URL to use instead of the default
   */
  new (ctx?: ProviderContext, customBaseURL?: string, ...rest: ExtraArgs<F>): ReturnType<F> & InstanceType<B>;
  /** The older form, without a context. */
  new (customBaseURL?: string): ReturnType<F> & InstanceType<B>;
  readonly prototype: InstanceType<B>;
}

/**
 * The class form of a provider factory, e.g. `providerClass(AnimeParser, createZoro)` for `new ANIME.Zoro()`.
 * Registry code only has the factory; the class exists so bundled providers keep `new` and `instanceof`.
 */
export function providerClass<F extends ProviderFactory, B extends ParserClass>(
  Base: B,
  factory: F
): ProviderClass<F, B> {
  const Parser = Base as unknown as new () => object;
  class Provider extends Parser {
    constructor(ctxOrBaseURL?: ProviderContext | string, customBaseURL?: string, ...rest: unknown[]) {
      super();
      const ctx = typeof ctxOrBaseURL === 'string' || !ctxOrBaseURL ? createProviderContext() : ctxOrBaseURL;
      const baseURL = typeof ctxOrBaseURL === 'string' ? ctxOrBaseURL : customBaseURL;
      Object.assign(this, factory(ctx, baseURL, ...rest));
    }
  }
  return Provider as unknown as ProviderClass<F, B>;
}
