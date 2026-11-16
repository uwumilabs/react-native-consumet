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
      // Options come from .prettierrc.
      'prettier/prettier': 'warn',
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
    // Providers and extractors run as registry bundles with the context they are given: requests go
    // through ctx.axios, extractors get the provider's context, and each module exports by name
    // (src/providers/meta follows its own pattern).
    files: ['src/extractors/**/*.ts', 'src/providers/{anime,movies,manga,light-novels,common}/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportDeclaration[source.value='axios'][importKind!='type']",
          message: 'Import axios only with `import type`; make requests through ctx.axios.',
        },
        {
          selector:
            "CallExpression[callee.property.name='extract'][callee.object.type='CallExpression'][callee.object.arguments.length=0][callee.object.callee.name=/^[A-Z]/]",
          message: 'Pass the provider context to the extractor factory: X(ctx).extract(...).',
        },
        { selector: 'ExportDefaultDeclaration', message: 'Export by name.' },
        { selector: "ExportSpecifier[exported.name='default']", message: 'Export by name.' },
      ],
    },
  },
  includeIgnoreFile(fileURLToPath(new URL('.prettierignore', import.meta.url)), '.prettierignore'),
  // ESLint also skips the example app (lint it with npx eslint --no-ignore) and config files.
  { ignores: ['apps/**/*', '*.config.*'] },
]);
