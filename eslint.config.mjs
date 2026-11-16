import { fileURLToPath } from 'node:url';
import { fixupConfigRules, includeIgnoreFile } from '@eslint/compat';
import reactNativeConfig from '@react-native/eslint-config/flat';
import prettierConfig from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig } from 'eslint/config';

// The flat export loads its plugins from @react-native/eslint-config's own dependencies, so plugins
// Yarn keeps nested under it (eslint-plugin-ft-flow) still resolve. The legacy config, loaded through
// FlatCompat, resolved them from the repo root and failed to start.
export default defineConfig([
  ...fixupConfigRules(reactNativeConfig),
  prettierConfig,
  {
    plugins: { prettier, 'unused-imports': unusedImports },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'radix': 'off',
      'no-bitwise': 'off',
      'prettier/prettier': [
        'warn',
        {
          quoteProps: 'consistent',
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'es5',
          useTabs: false,
        },
      ],
      'no-new-wrappers': 'off',
      'no-new-func': 'off',
      'no-eval': [
        'warn',
        {
          allowIndirect: true,
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  includeIgnoreFile(fileURLToPath(new URL('.prettierignore', import.meta.url)), '.prettierignore'),
  // ESLint also skips the example app (lint it with npx eslint --no-ignore) and config files.
  { ignores: ['apps/**/*', '*.config.*'] },
]);
