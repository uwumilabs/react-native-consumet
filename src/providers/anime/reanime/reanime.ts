import { AnimeParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createReanime } from './create-reanime';

export const ReAnime = providerClass(AnimeParser, createReanime);
export type ReAnime = InstanceType<typeof ReAnime>;
