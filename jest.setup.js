// Mock the TurboModuleRegistry
jest.mock('react-native', () => {
  // Create a mock object instead of requiring the actual RN
  const mockRN = {
    // Mock basic RN components and APIs that might be used
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    Platform: {
      OS: 'android',
      select: jest.fn((obj) => obj.android || obj.default),
    },
    // Add the TurboModuleRegistry mock: every NativeConsumet method rejects unless a test overrides it,
    // so unit tests never depend on the native module or the network.
    TurboModuleRegistry: {
      getEnforcing: jest.fn((name) => {
        if (name === 'Consumet') {
          const unavailable = (method) =>
            jest.fn(() => Promise.reject(new Error(`NativeConsumet.${method} is not available in tests`)));
          return {
            getDdosGuardCookiesWithWebView: unavailable('getDdosGuardCookiesWithWebView'),
            makeGetRequestWithWebView: unavailable('makeGetRequestWithWebView'),
            makePostRequestWithWebView: unavailable('makePostRequestWithWebView'),
            makePostRequest: unavailable('makePostRequest'),
            bypassDdosGuard: unavailable('bypassDdosGuard'),
            deobfuscateScript: unavailable('deobfuscateScript'),
            multiply: jest.fn((a, b) => a * b),
          };
        }
        throw new Error(`Module ${name} not found`);
      }),
    },
  };

  return mockRN;
});

// Mock any other modules you need
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
