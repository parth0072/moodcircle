/**
 * The one place that reads process.env. EXPO_PUBLIC_* values are inlined at build time (use
 * dot access, not destructuring or dynamic keys) and are visible inside the shipped app, so
 * never put a secret in one.
 */
export function resolveApiUrl(value: string | undefined, isWeb: boolean): string {
  if (!value) throw new Error('EXPO_PUBLIC_API_URL is not set (copy mobile/.env.example to .env)');
  const url = value.replace(/\/+$/, '');
  // A relative URL only works in a browser; scripts/verify-web.mjs builds with "/api".
  if (!isWeb && !/^https?:\/\//.test(url)) {
    throw new Error(`EXPO_PUBLIC_API_URL must be an absolute URL on native, got "${value}"`);
  }
  return url;
}

export function getApiUrl(): string {
  return resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, process.env.EXPO_OS === 'web');
}
