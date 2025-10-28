const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

// Get the base config first
let config = getConfig(getDefaultConfig(__dirname), {
  root,
  pkg,
  project: __dirname,
});

// Add your minifierConfig
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

module.exports = config;
