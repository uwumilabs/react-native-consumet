# This is planned haven't been implemented yet(WIP)
# Node.js Assets - Fully Automated

This library includes a complete Node.js runtime that works **out-of-the-box** with zero configuration required from developers.

## ✅ Completely Automatic

When you install `react-native-consumet`, everything is handled automatically:

1. **Node.js runtime** - Bundled with the library
2. **Provider execution environment** - Pre-configured sandbox
3. **Dependencies** - All required modules included
4. **Linking** - Automatic through React Native autolinking

## Zero Setup Required

```bash
npm install react-native-consumet
# That's it! Everything works immediately.
```

No manual steps, no configuration files, no additional setup needed.

## How It Works Behind the Scenes

Your library automatically:

1. **Bundles Node.js runtime** in the native package
2. **Includes execution sandbox** for safe provider code execution  
3. **Provides native modules** (axios, cheerio, crypto, fetch)
4. **Handles communication** between React Native and Node.js

## Example Usage

```typescript
import { loadProviderFromURL } from 'react-native-consumet';

// This just works - no setup needed!
const provider = await loadProviderFromURL(
  'https://raw.githubusercontent.com/user/repo/main/anime-provider.js',
  'createAnimeProvider'
);

const results = await provider.search('Naruto');
```

## Architecture

```text
React Native App
       ↕️ 
nodejs-mobile-react-native (bundled)
       ↕️
Node.js Runtime (bundled)
       ↕️  
Provider Code (from GitHub)
```

Everything runs inside your app - no external dependencies or setup required.
