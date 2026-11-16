import { AnimeParser } from '../../../models';
import { providerClass } from '../../provider-class';
import { createZoro } from './create-zoro';

export const Zoro = providerClass(AnimeParser, createZoro);
export type Zoro = InstanceType<typeof Zoro>;
