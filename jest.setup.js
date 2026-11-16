// The library's only react-native import is TurboModuleRegistry. Every NativeConsumet method rejects
// unless a test overrides it, so unit tests never depend on the native module or the network. The
// mock has exactly the methods of the Spec in src/NativeConsumet.ts (test/unit/native-contract.test.ts).
jest.mock('react-native', () => ({
  TurboModuleRegistry: {
    getEnforcing: jest.fn((name) => {
      if (name !== 'Consumet') throw new Error(`Module ${name} not found`);
      const unavailable = (method) =>
        jest.fn(() => Promise.reject(new Error(`NativeConsumet.${method} is not available in tests`)));
      return {
        makeGetRequestWithWebView: unavailable('makeGetRequestWithWebView'),
        makePostRequestWithWebView: unavailable('makePostRequestWithWebView'),
        makePostRequest: unavailable('makePostRequest'),
        deobfuscateScript: unavailable('deobfuscateScript'),
      };
    }),
  },
}));
