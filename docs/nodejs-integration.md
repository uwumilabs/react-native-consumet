# Optional Node.js Runtime Integration

`react-native-consumet` supports optional integration with `nodejs-mobile-react-native` for advanced provider execution capabilities.

## Overview

By default, the library works without any additional dependencies. However, if you want to execute complex provider code from GitHub URLs with full Node.js capabilities, you can optionally install `nodejs-mobile-react-native`.

## Default Behavior (No Additional Setup)

```typescript
import { createProviderFromURL } from 'react-native-consumet';

// This will work with basic provider functionality
// but may have limitations with complex provider code
const provider = await createProviderFromURL(url, factoryName);
```

## Enhanced Node.js Runtime (Optional)

For full provider execution capabilities with Node.js modules:

### 1. Install nodejs-mobile-react-native

```bash
npm install nodejs-mobile-react-native
```

### 2. Follow Platform Setup

**iOS:**
```bash
cd ios && pod install
```

**Android:**
Follow the [nodejs-mobile-react-native Android setup guide](https://github.com/JaneaSystems/nodejs-mobile-react-native#android).

### 3. Copy nodejs-assets (Example Available)

The `nodejs-assets` folder is available in our example app. Copy it to your project root:

```bash
# From our bare example
cp -r node_modules/react-native-consumet/apps/bare-example/nodejs-assets ./
```

### 4. Enable Node.js Runtime

```typescript
import { createProviderFromURL, createProviderContext } from 'react-native-consumet';

// Enable Node.js runtime with full capabilities
const provider = await createProviderFromURL(
  'https://raw.githubusercontent.com/user/repo/main/provider.js',
  'createAnimeProvider',
  {
    context: createProviderContext(),
    useNodeJS: true  // Enable Node.js runtime
  }
);
```

## Benefits of Node.js Runtime

With `nodejs-mobile-react-native` installed:

- ✅ **Full Node.js Environment**: Access to complete Node.js modules
- ✅ **Native Fetch**: Better HTTP request handling
- ✅ **Complex Providers**: Execute sophisticated provider code
- ✅ **Sandboxed Execution**: Safe execution environment
- ✅ **Better Performance**: Native execution speed

## When to Use Node.js Runtime

**Use Node.js Runtime when:**
- Loading complex providers from GitHub
- Providers require Node.js-specific modules
- Need maximum compatibility
- Want native fetch performance

**Standard library is sufficient when:**
- Using simple, built-in providers
- Basic media information retrieval
- Want minimal dependencies
- App size is a concern

## Example Projects

Check our example apps to see both approaches:

- **`apps/bare-example`**: Shows Node.js runtime integration
- **`apps/expo-example`**: Shows standard library usage

## Configuration

The library automatically detects if `nodejs-mobile-react-native` is available and adjusts behavior accordingly. No additional configuration is required beyond setting `useNodeJS: true` in your config.

## Troubleshooting

### "nodejs-mobile-react-native is not available"

This is expected if you haven't installed the optional dependency. The library will work with basic functionality.

### Node.js Runtime Not Starting

1. Ensure `nodejs-assets` folder exists in your project root
2. Verify platform-specific setup is complete
3. Check React Native linking: `npx react-native info`
4. Try cleaning and rebuilding your project

## Migration

**From Full Node.js to Optional:**
- Node.js runtime is now opt-in with `useNodeJS: true`
- Basic functionality works without additional setup
- Enhanced features require explicit configuration

**From Other Libraries:**
- Install `nodejs-mobile-react-native` for maximum compatibility
- Copy `nodejs-assets` from our example
- Enable with `useNodeJS: true` in config
