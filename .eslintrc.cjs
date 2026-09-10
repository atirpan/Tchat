/** Root ESLint config. Shared rules across the monorepo. */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    // MASTER_SYSTEM 2.3: no behavioral tracking / logging in production.
    // console.warn and console.error are allowed for intentional, terse
    // failure reporting that does NOT contain user data. console.log is
    // forbidden everywhere.
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    /* --------------------------------------------------------------------- */
    /* Anonym Messenger guardrails                                           */
    /* --------------------------------------------------------------------- */

    // Block analytics / tracking / crash reporters sending user data.
    // MASTER_SYSTEM 2.3, 2.7.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '*sentry*',
              '*datadog*',
              '*mixpanel*',
              '*amplitude*',
              '*google-analytics*',
              '*segment*',
              '*posthog*',
              '*hotjar*',
              '*fullstory*',
            ],
            message:
              'Analytics / tracking / crash reporters sending user data are forbidden by MASTER_SYSTEM 2.3 and 2.7.',
          },
        ],
      },
    ],

    // Forbid direct access to browser storage and identifiable globals.
    // Persistence must go through packages/security -> SafeStorage (Phase 2+).
    // MASTER_SYSTEM 2.2, 5.
    'no-restricted-globals': [
      'error',
      {
        name: 'localStorage',
        message:
          'Direct localStorage usage is forbidden. Use SafeStorage from @anonym-messenger/security (Phase 2+).',
      },
      {
        name: 'sessionStorage',
        message:
          'Direct sessionStorage usage is forbidden. Use SafeStorage from @anonym-messenger/security (Phase 2+).',
      },
      {
        name: 'indexedDB',
        message:
          'Direct indexedDB usage is forbidden. Use SafeStorage from @anonym-messenger/security (Phase 2+).',
      },
    ],

    // Deny specific unsafe globals at the syntax level (catches window.x.y).
    // MASTER_SYSTEM 2.2, 5, 6.
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "MemberExpression[object.name='window'][property.name=/^(localStorage|sessionStorage|indexedDB)$/]",
        message:
          'Direct browser storage is forbidden. Use SafeStorage from @anonym-messenger/security (Phase 2+).',
      },
      {
        selector: "MemberExpression[object.name='Math'][property.name='random']",
        message:
          'Math.random is not a cryptographic PRNG. Use crypto.getRandomValues / crypto.randomBytes via @anonym-messenger/security (MASTER_SYSTEM 2.5, 5).',
      },
      {
        selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
        message:
          'Date.now is not a controlled clock. Receive a Clock from @anonym-messenger/utils (MASTER_SYSTEM 6). Avoids timing side-channels and behavioral fingerprints.',
      },
      {
        selector: "NewExpression[callee.name='Date'][arguments.length=0]",
        message:
          'Unparameterized `new Date()` reads the wall clock uncontrollably. Receive a Clock from @anonym-messenger/utils, or accept a Timestamp argument (MASTER_SYSTEM 6).',
      },
      {
        selector: "CallExpression[callee.object.name='performance'][callee.property.name='now']",
        message:
          'performance.now() is an uncontrolled high-resolution clock and a fingerprinting surface. Receive a Clock from @anonym-messenger/utils (MASTER_SYSTEM 6).',
      },
      {
        selector: "MemberExpression[object.name='document'][property.name='cookie']",
        message:
          'document.cookie is forbidden. No cookie-based tracking. MASTER_SYSTEM 2.3, 2.4.',
      },
    ],

    // Defense-in-depth against stray `any`, non-null assertions, and eval-ish
    // patterns that could introduce sensitive data leaks.
    '@typescript-eslint/no-non-null-assertion': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },

  overrides: [
    {
      // The restricted-syntax file itself needs to reference these names.
      files: [
        'packages/security/**/*.ts',
        'packages/utils/**/*.ts',
        'apps/api/test/**/*.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
      rules: {
        'no-restricted-syntax': 'off',
        'no-restricted-globals': 'off',
      },
    },
  ],

  ignorePatterns: ['dist', 'build', '.next', '.turbo', 'coverage', 'node_modules'],
};
