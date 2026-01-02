/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    '@electron-toolkit/eslint-config-ts/recommended',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: {
    warnOnUnsupportedTypeScriptVersion: false,
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
}
