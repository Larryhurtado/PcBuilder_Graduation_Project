import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'storage/**',
      'docs/**',
      'apps/web/public/mockServiceWorker.js',
    ],
  },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Backend, paquetes y archivos de configuración: Node.js
  {
    files: ['apps/api/**/*.js', 'packages/**/*.js', '*.js', 'apps/web/*.js', 'tools/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  // Frontend: navegador y React
  {
    files: ['apps/web/src/**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  // Las pruebas de Node dentro de src del frontend (setup y mocks de MSW) también usan Node
  {
    files: ['apps/web/src/test/**/*.js', 'apps/web/src/mocks/node.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  prettier,
];
