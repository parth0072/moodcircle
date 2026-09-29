import type { SecureStorage } from './secure-storage';

// expo-secure-store has no web implementation (its web module is an empty object), so this
// localStorage stand-in exists only for the web export that scripts/verify-web.mjs drives.
// It is NOT secure: any script on the origin can read it.
export const secureStorage: SecureStorage = {
  get: async (key) => localStorage.getItem(key),
  set: async (key, value) => localStorage.setItem(key, value),
  remove: async (key) => localStorage.removeItem(key),
};
