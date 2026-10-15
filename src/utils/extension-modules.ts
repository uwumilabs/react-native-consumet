import {
  StreamingServers,
  MediaFormat,
  MediaStatus,
  SubOrDub,
  WatchListType,
  TvType,
  Genres,
  Topics,
} from '../models/types';

/** Module names registry bundles import from the runtime (see scripts/build-extensions.js). */
export const MODELS_MODULE = 'react-native-consumet/models';
export const UTILS_MODULE = 'react-native-consumet/utils';

// Paths tsc-built extensions used for the same modules, at any depth (`../models`, `../../../models/index.js`).
const LEGACY_MODELS = /^(\.\.\/)+models(\/index)?(\.js)?$/;
const LEGACY_UTILS = /^(\.\.\/)+utils(\/index|\/create-provider-context|\/create-extractor-context)?(\.js)?$/;

/** The library's enums, handed to extensions as-is so their values always match. */
export const extensionEnums = {
  StreamingServers,
  MediaFormat,
  MediaStatus,
  SubOrDub,
  WatchListType,
  TvType,
  Genres,
  Topics,
};

/**
 * Builds the `require` extension code runs with. Only the modules passed in resolve; anything
 * else throws, so a bundle that depends on a file the runtime can't provide fails at load
 * instead of getting `{}` and losing features silently.
 */
export function createExtensionRequire(extensionId: string, modules: Record<string, unknown>) {
  return (specifier: string): any => {
    const key = LEGACY_MODELS.test(specifier) ? MODELS_MODULE : LEGACY_UTILS.test(specifier) ? UTILS_MODULE : specifier;
    if (Object.prototype.hasOwnProperty.call(modules, key)) return modules[key];
    throw new Error(
      `Extension '${extensionId}' requires '${specifier}', which the extension runtime does not provide. ` +
        'Registry code must be a single-file bundle (yarn build).'
    );
  };
}
