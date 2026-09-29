import { resolveApiUrl } from './env';

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
