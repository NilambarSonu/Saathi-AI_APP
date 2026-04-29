module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@exponent/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|axios|expo-notifications|expo-device|expo-constants|expo-web-browser)',
  ],
  moduleNameMapper: {
    '^expo$': '<rootDir>/node_modules/expo/index.js',
  },
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
};

