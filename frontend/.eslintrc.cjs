module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', '*.config.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
};
