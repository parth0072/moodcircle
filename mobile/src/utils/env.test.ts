import { resolveApiUrl, resolveLegalUrl } from './env';

describe('resolveApiUrl', () => {
  it('requires a value', () => {
    expect(() => resolveApiUrl(undefined, false)).toThrow('EXPO_PUBLIC_API_URL is not set');
  });

  it('strips trailing slashes', () => {
    expect(resolveApiUrl('https://example.com/moodcircle/api//', false)).toBe(
      'https://example.com/moodcircle/api',
    );
  });

  it('rejects a relative URL on native but allows it on web', () => {
    expect(() => resolveApiUrl('/api', false)).toThrow('absolute');
    expect(resolveApiUrl('/api', true)).toBe('/api');
  });
});

describe('resolveLegalUrl', () => {
  it('accepts an http(s) address and trims it', () => {
    expect(resolveLegalUrl('  https://example.com/privacy ')).toBe('https://example.com/privacy');
  });

  it('is null when unset, blank or not a web address, so the app never shows a dead link', () => {
    expect(resolveLegalUrl(undefined)).toBeNull();
    expect(resolveLegalUrl('   ')).toBeNull();
    expect(resolveLegalUrl('javascript:alert(1)')).toBeNull();
    expect(resolveLegalUrl('example.com/privacy')).toBeNull();
  });
});
