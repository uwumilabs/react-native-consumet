const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');


/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const blacklist = require('metro-config/src/defaults/exclusionList');
const config = {
    resolver: {
        blacklistRE: blacklist([
            /\/nodejs-assets\/.*/
        ]),
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
