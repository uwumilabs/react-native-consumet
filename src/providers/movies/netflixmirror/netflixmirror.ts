import { MovieParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createDisneyMirror, createNetflixMirror, createPrimeMirror } from './create-netflixmirror';

export const NetflixMirror = providerClass(MovieParser, createNetflixMirror);
export type NetflixMirror = InstanceType<typeof NetflixMirror>;
export const PrimeMirror = providerClass(MovieParser, createPrimeMirror);
export type PrimeMirror = InstanceType<typeof PrimeMirror>;
export const DisneyMirror = providerClass(MovieParser, createDisneyMirror);
export type DisneyMirror = InstanceType<typeof DisneyMirror>;
