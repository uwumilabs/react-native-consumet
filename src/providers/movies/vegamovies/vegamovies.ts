import { MovieParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createVegaMovies } from './create-vegamovies';

export const VegaMovies = providerClass(MovieParser, createVegaMovies);
export type VegaMovies = InstanceType<typeof VegaMovies>;
