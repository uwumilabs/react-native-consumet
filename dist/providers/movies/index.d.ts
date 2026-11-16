import { createMultiMovies } from './multimovies/create-multimovies';
import { createNetflixMirror, createPrimeMirror, createDisneyMirror } from './netflixmirror/create-netflixmirror';
import { createMultiStream } from './multistream/create-multistream';
import { createHiMovies } from './himovies/create-himovies';
import { createVegaMovies } from './vegamovies/create-vegamovies';
export declare const MOVIES: {
    MultiMovies: import("../provider-class").ProviderClass<typeof createMultiMovies, typeof import("../..").MovieParser>;
    NetflixMirror: import("../provider-class").ProviderClass<typeof createNetflixMirror, typeof import("../..").MovieParser>;
    PrimeMirror: import("../provider-class").ProviderClass<typeof createPrimeMirror, typeof import("../..").MovieParser>;
    DisneyMirror: import("../provider-class").ProviderClass<typeof createDisneyMirror, typeof import("../..").MovieParser>;
    HiMovies: import("../provider-class").ProviderClass<typeof createHiMovies, typeof import("../..").MovieParser>;
    VegaMovies: import("../provider-class").ProviderClass<typeof createVegaMovies, typeof import("../..").MovieParser>;
    MultiStream: import("../provider-class").ProviderClass<typeof createMultiStream, typeof import("../..").MovieParser>;
    createHiMovies: typeof createHiMovies;
    createMultiMovies: typeof createMultiMovies;
    createNetflixMirror: typeof createNetflixMirror;
    createPrimeMirror: typeof createPrimeMirror;
    createDisneyMirror: typeof createDisneyMirror;
    createVegaMovies: typeof createVegaMovies;
    createMultiStream: typeof createMultiStream;
};
//# sourceMappingURL=index.d.ts.map