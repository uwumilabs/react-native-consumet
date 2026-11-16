/**
 * Module names registry bundles require from the runtime: scripts/build-extensions.js keeps
 * imports of src/models and the context files external under these names, and the managers
 * resolve them (src/utils/extension-modules.ts). No imports, so the scripts can load its build.
 */
export const MODELS_MODULE = 'react-native-consumet/models';
export const UTILS_MODULE = 'react-native-consumet/utils';
