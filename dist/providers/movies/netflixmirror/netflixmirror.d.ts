import { MovieParser } from '../../../models';
import { createDisneyMirror, createNetflixMirror, createPrimeMirror } from './create-netflixmirror';
export declare const NetflixMirror: import("../../provider-class").ProviderClass<typeof createNetflixMirror, typeof MovieParser>;
export type NetflixMirror = InstanceType<typeof NetflixMirror>;
export declare const PrimeMirror: import("../../provider-class").ProviderClass<typeof createPrimeMirror, typeof MovieParser>;
export type PrimeMirror = InstanceType<typeof PrimeMirror>;
export declare const DisneyMirror: import("../../provider-class").ProviderClass<typeof createDisneyMirror, typeof MovieParser>;
export type DisneyMirror = InstanceType<typeof DisneyMirror>;
//# sourceMappingURL=netflixmirror.d.ts.map