import { MultiMovies } from './multimovies/multimovies';
import { createMultiMovies } from './multimovies/create-multimovies';
import { NetflixMirror, PrimeMirror, DisneyMirror } from './netflixmirror/netflixmirror';
import { createNetflixMirror, createPrimeMirror, createDisneyMirror } from './netflixmirror/create-netflixmirror';
import { MultiStream } from './multistream/multistream';
import { createMultiStream } from './multistream/create-multistream';
import { HiMovies } from './himovies/himovies';
import { createHiMovies } from './himovies/create-himovies';
import { VegaMovies } from './vegamovies/vegamovies';
import { createVegaMovies } from './vegamovies/create-vegamovies';

export const MOVIES = {
  MultiMovies,
  NetflixMirror,
  PrimeMirror,
  DisneyMirror,
  HiMovies,
  VegaMovies,
  MultiStream,
  createHiMovies,
  createMultiMovies,
  createNetflixMirror,
  createPrimeMirror,
  createDisneyMirror,
  createVegaMovies,
  createMultiStream,
};
