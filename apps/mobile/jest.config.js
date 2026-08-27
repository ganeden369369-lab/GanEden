const jestExpoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    // Our own allow-list (adds nativewind/css-interop on top of jest-expo's defaults, which
    // already prefix-match react-native-* and expo-* packages).
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|expo-linear-gradient))',
    // Keep jest-expo's own literal ignore entries (reanimated's babel plugin dir, @react-native's
    // babel preset) — these are narrow, path-scoped ignores that our allow-list above doesn't cover.
    ...jestExpoPreset.transformIgnorePatterns.slice(1),
  ],
};
