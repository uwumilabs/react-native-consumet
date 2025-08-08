const path = require('path');
const pkg = require('../../package.json');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  dependencies: {
    [pkg.name]: {
      root: path.join(__dirname, '../..'),
      platforms: {
        // Codegen script incorrectly fails without this
        // So we explicitly specify the platforms with empty object
        ios: {},
        android: {},
      },
    },
    'nodejs-mobile-react-native': {
      platforms: {
        android: {
          sourceDir: '../node_modules/nodejs-mobile-react-native/android',
          cmakeListsPath: '../node_modules/nodejs-mobile-react-native/android/CMakeLists.txt',
        },
        ios: {
          podspecPath: '../node_modules/nodejs-mobile-react-native/ios/NodeMobile.podspec',
        },
      },
    },
  },
};
