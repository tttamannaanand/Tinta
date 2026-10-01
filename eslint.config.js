import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['api/**/*.js', 'tests/**/*.js', '*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Plain <script> files that share one global scope in the browser:
    // lexicon.js defines helpers that palette.js uses.
    files: ['site/js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['site/js/lexicon.js'],
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Za-z_]' }] },
  },
  {
    files: ['site/js/palette.js'],
    languageOptions: {
      globals: Object.fromEntries(
        ['tokenize', 'analyzeMood', 'buildPalette', 'pickGenres', 'seededRandom'].map((n) => [
          n,
          'readonly',
        ]),
      ),
    },
  },
];
