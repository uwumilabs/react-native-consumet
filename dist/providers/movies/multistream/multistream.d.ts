import { MovieParser } from '../../../models';
import { createMultiStream } from './create-multistream';
/** `new MOVIES.MultiStream(ctx?, customBaseURL?, apiKey?)`: pass your TMDB API key; without one a shared key is used, with a warning. */
export declare const MultiStream: import("../../provider-class").ProviderClass<typeof createMultiStream, typeof MovieParser>;
export type MultiStream = InstanceType<typeof MultiStream>;
//# sourceMappingURL=multistream.d.ts.map