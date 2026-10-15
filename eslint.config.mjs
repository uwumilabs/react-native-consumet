import { fixupConfigRules } from '@eslint/compat';
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
  {
    ignores: [
      // Development Dependencies
      'node_modules/',
      '.claude/',
      '.expo/',
      '.expo-shared/',
      '.vscode/',
      '.android/',
      '.yarn/',
      'android/**/*',
      'ios/**/*',
      '.ios/',
      '.github/',
      'apps/**/*',

      // Build and Output
      'lib/',
      'dist/',
      // Published copies of dist/ bundles (scripts/prepare-registry.js)
      'registry/',
      'build/',
      'web-build/',
      '*.jsbundle',
      '*.bundle',

      // Testing and Coverage
      '__tests__/',
      'test/',
      'jest.setup.*',
      'coverage/',
      'jest.config.*',

      // Configuration Files
      '*.config.*',
      'metro.config.js',
      'babel.config.js',
      'tscconfig.json',
      'app.json',
      'expo-env.d.ts',
      '.env*',

      // Documentation and Info
      'README.md',
      '*.md',

      // Media and Assets
      'assets/',
      '*.svg',
      '*.png',
      '*.jpg',
      '*.jpeg',
      '*.gif',
      '*.ico',

      // Cache and System Files
      '.cache/',
      '*.log',
      '.DS_Store',
      'temp/',
      '*.tmp',

      // Package Management
      'package.json',
      'package-lock.json',
      'yarn.lock',

      // Auto-generated
      '*.generated.*',
      '*.auto.*',
      '*.d.ts',

      // IDE specific
      '.idea/',
      '*.sublime-*',
      '*.swp',
    ],
  },
]);
