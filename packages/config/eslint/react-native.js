/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    './base.js',
    '@react-native-community',
  ],
  env: {
    'react-native/react-native': true,
  },
  rules: {
    'react-native/no-inline-styles': 'warn',
    'react-native/no-unused-styles': 'warn',
    'react-native/no-color-literals': 'warn',
  },
};
