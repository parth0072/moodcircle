// https://docs.expo.dev/guides/using-eslint/  (flat config; eslint-config-expo includes the
// React Compiler rules, so code the compiler cannot optimise fails lint, not just review)
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  { ignores: ['dist/*', '.expo/*'] },
]);
