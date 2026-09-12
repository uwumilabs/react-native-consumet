// import DramaCool from './dramacool';
import MultiMovies from './multimovies/multimovies';
import { createMultiMovies } from './multimovies/create-multimovies';
import NetflixMirror from './netflixmirror/netflixmirror';
import { createNetflixMirror } from './netflixmirror/create-netflixmirror';
import MultiStream from './multistream';
import HiMovies from './himovies/himovies';
import { createHiMovies } from './himovies/create-himovies';
import YFlix from './yflix/yflix';
import { createYFlix } from './yflix/create-yflix';
import VegaMovies from './vegamovies/vegamovies';
import { createVegaMovies } from './vegamovies/create-vegamovies';

export default {
  // DramaCool,
  MultiMovies,
  NetflixMirror,
  HiMovies,
  YFlix,
  VegaMovies,
  MultiStream,
  createHiMovies,
  createMultiMovies,
  createNetflixMirror,
  createYFlix,
  createVegaMovies,
};

export { VegaMovies, createVegaMovies } from './vegamovies/vegamovies';
