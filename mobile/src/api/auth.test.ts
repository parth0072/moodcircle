import { api } from '@/api';

import { passwordLogin, requestOtp, setPassword, verifyOtp } from './auth';

jest.mock('@/api', () => ({ api: { post: jest.fn(), patch: jest.fn(), get: jest.fn() } }));

const post = api.post as jest.Mock;

const user = {
  id: 'u1',
  email: 'a@b.co',
  name: null,
  username: null,
  avatar: null,
  isPremium: false,
  hasPassword: false,
  joyActivities: [],
  joyOnboarded: false,
  phone: 'legacy-field',
};

beforeEach(() => post.mockReset());

describe('auth api', () => {
  it('requests a code without a token and never exposes the dev-only otp', async () => {
    post.mockResolvedValue({ message: 'OTP sent', otp: '123456' });
    const result = await requestOtp('a@b.co');
    expect(post).toHaveBeenCalledWith('/auth/otp/request', { email: 'a@b.co' }, { auth: false });
    expect(result).toEqual({ message: 'OTP sent' });
    expect(result).not.toHaveProperty('otp');
  });

  it('verifies a code as a string, without a token, and strips unknown user fields', async () => {
    post.mockResolvedValue({ token: 'jwt', user });
    const result = await verifyOtp('a@b.co', '012345');
    expect(post).toHaveBeenCalledWith(
      '/auth/otp/verify',
      { email: 'a@b.co', otp: '012345' },
      { auth: false },
    );
    expect(result.token).toBe('jwt');
    expect(result.user).not.toHaveProperty('phone');
  });

  it('signs in with a password without a token (a 401 there is not a sign-out)', async () => {
    post.mockResolvedValue({ token: 'jwt', user: { ...user, hasPassword: true } });
    const result = await passwordLogin('a@b.co', 'secret1');
    expect(post).toHaveBeenCalledWith(
      '/auth/password/login',
      { email: 'a@b.co', password: 'secret1' },
      { auth: false },
    );
    expect(result.user.hasPassword).toBe(true);
  });

  it('sets a password WITH the session token', async () => {
    post.mockResolvedValue({ message: 'Password set', hasPassword: true });
    await setPassword('secret1');
    expect(post).toHaveBeenCalledWith('/auth/password/set', { password: 'secret1' });
  });

  it('sets a password with an explicit token, right after a code was confirmed', async () => {
    post.mockResolvedValue({ message: 'Password set', hasPassword: true });
    await setPassword('secret1', 'fresh-token');
    expect(post).toHaveBeenCalledWith(
      '/auth/password/set',
      { password: 'secret1' },
      { token: 'fresh-token' },
    );
  });

  it('turns a malformed answer into an invalid-response error', async () => {
    post.mockResolvedValue({ token: 'jwt' });
    await expect(verifyOtp('a@b.co', '123456')).rejects.toMatchObject({ kind: 'invalid-response' });
  });
});
