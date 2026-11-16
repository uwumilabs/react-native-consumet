import { MovieParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createMultiMovies } from './create-multimovies';

export const MultiMovies = providerClass(MovieParser, createMultiMovies);
export type MultiMovies = InstanceType<typeof MultiMovies>;
