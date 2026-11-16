import { AnimeParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createAniNeko } from './create-anineko';

export const AniNeko = providerClass(AnimeParser, createAniNeko);
export type AniNeko = InstanceType<typeof AniNeko>;
