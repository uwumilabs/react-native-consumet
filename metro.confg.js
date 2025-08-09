const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};
config.transformer.minifierConfig = {
    compress: {
      drop_console: true,
      // Enable all unsafe optimizations.
      unsafe: true,
      unsafe_arrows: true,
      unsafe_comps: true,
      unsafe_Function: true,
      unsafe_math: true,
      unsafe_symbols: true,
      unsafe_methods: true,
      unsafe_proto: true,
      unsafe_regexp: true,
      unsafe_undefined: true,
      unused: true,
    },
  };

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
