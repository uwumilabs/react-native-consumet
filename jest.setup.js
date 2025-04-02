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
      select: jest.fn(obj => obj.android || obj.default),
    },
    // Add the TurboModuleRegistry mock
    TurboModuleRegistry: {
      getEnforcing: jest.fn((name) => {
        if (name === 'Consumet') {
          return {
            getSources: jest.fn((xrax) => Promise.resolve('mocked sources')),
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