// Root ESLint configuration for NudeCollection monorepo
// Unifies linting across NudeShared, NudeFlow, NudeForge, NudeAdmin
// Keep lightweight; per-package specific globs can extend if necessary.
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-console': ['off'],
      'prefer-const': ['warn']
    }
  },
  {
    files: ['**/*.test.mjs', '**/test/**/*.mjs'],
    languageOptions: {
      globals: {
        // Vitest globals
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly'
      }
    },
    rules: {
      'no-unused-expressions': 'off'
    }
  }
];
