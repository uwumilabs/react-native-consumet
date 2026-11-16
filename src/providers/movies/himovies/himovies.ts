import { MovieParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createHiMovies } from './create-himovies';

export const HiMovies = providerClass(MovieParser, createHiMovies);
export type HiMovies = InstanceType<typeof HiMovies>;
