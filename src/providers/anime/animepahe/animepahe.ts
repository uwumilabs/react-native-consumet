import { AnimeParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createAnimePahe } from './create-animepahe';

export const AnimePahe = providerClass(AnimeParser, createAnimePahe);
export type AnimePahe = InstanceType<typeof AnimePahe>;
