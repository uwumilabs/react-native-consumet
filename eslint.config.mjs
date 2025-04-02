import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import unusedImports from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    extends: fixupConfigRules(compat.extends('@react-native', 'prettier')),
    plugins: { prettier, "unused-imports": unusedImports, },
    rules: {
      'react/react-in-jsx-scope': 'off',
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
      "no-new-wrappers": "off",
      "no-eval": [
        "warn",
        {
          "allowIndirect": true
        }
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          "vars": "all",
          "varsIgnorePattern": "^_",
          "args": "after-used",
          "argsIgnorePattern": "^_"
        }
      ],
    },
  },
  {
    ignores: [
      // Development Dependencies
      'node_modules/',
      '.expo/',
      '.expo-shared/',
      '.vscode/',
      '.android/',
      'android/**/*',
      'ios/**/*',
      '.ios/',
      '.github/',
      "example/",
      
      // Build and Output
      'lib/',
      'dist/',
      'build/',
      'web-build/',
      '*.jsbundle',
      '*.bundle',
      
      // Testing and Coverage
      '__tests__/',
      'test/',
      'coverage/',
      'jest.config.*',
      
      // Configuration Files
      '*.config.js',
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
      '*.swp'
    ],
  },
]);
