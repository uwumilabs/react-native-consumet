const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

const config = getConfig(getDefaultConfig(__dirname), {
  root,
  pkg,
  project: __dirname,
});

// Release builds drop console output (README: the Manga tab's call log).
const { minifierConfig } = config.transformer;
config.transformer.minifierConfig = {
  ...minifierConfig,
  compress: { ...minifierConfig.compress, drop_console: true },
};

module.exports = config;
