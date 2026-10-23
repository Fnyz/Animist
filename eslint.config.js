// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'docs/*', '.expo/*', 'node_modules/*'],
  },
  {
    // Command-line helpers run in Node.js, not in the app.
    files: ['scripts/**/*.js', 'eslint.config.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', process: 'readonly', require: 'readonly', module: 'writable', console: 'readonly' },
    },
  },
]);
