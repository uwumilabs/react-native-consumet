import { MovieParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createMultiStream } from './create-multistream';

/** `new MOVIES.MultiStream(ctx?, customBaseURL?, apiKey?)`: pass your TMDB API key; without one a shared key is used, with a warning. */
export const MultiStream = providerClass(MovieParser, createMultiStream);
export type MultiStream = InstanceType<typeof MultiStream>;
