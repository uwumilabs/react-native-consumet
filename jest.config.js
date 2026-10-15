/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    // ts-jest emits CommonJS, which forces node10 resolution (deprecated in TS 6)
    // and conflicts with verbatimModuleSyntax from the root tsconfig.
    '^.+\\.(ts|tsx)?$': [
      'ts-jest',
      { tsconfig: { ignoreDeprecations: '6.0', verbatimModuleSyntax: false } },
    ],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@react-navigation)',
  ],
  globals: {
    __DEV__: true,
  },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/node_modules/react-native',
  },
};
