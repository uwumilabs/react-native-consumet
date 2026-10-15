/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Offline unit tests by default; suites that hit live sites run with `yarn test:live`.
  testMatch: process.env.LIVE_TESTS === '1' ? ['**/test/**/*.test.ts'] : ['**/test/unit/**/*.test.ts'],
  // Git worktrees under .claude/ hold copies of the repo.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
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
