process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test';

// `supabase.ts` imports AsyncStorage for its auth storage adapter; the native module isn't
// available under Jest, so use the package's own mock (see async-storage's Jest integration docs).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
