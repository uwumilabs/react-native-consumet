import { AnimeParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createAniKoto } from './create-anikoto';

export const AniKoto = providerClass(AnimeParser, createAniKoto);
export type AniKoto = InstanceType<typeof AniKoto>;
