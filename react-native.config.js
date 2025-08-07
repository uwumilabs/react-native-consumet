/**
 * @type {import('@react-native-community/cli-types').UserDependencyConfig}
 */
module.exports = {
  dependency: {
    platforms: {
      android: {
        cmakeListsPath: 'generated/jni/CMakeLists.txt',
      },
    },
  },
  dependencies: {
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
