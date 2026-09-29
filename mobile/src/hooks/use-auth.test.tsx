import { act, renderHook } from '@testing-library/react-native';

import { passwordLogin, setPassword, verifyOtp } from '@/api/auth';
import { selectNextPrompt, useUiStore } from '@/stores/ui-store';
import { useSessionStore } from '@/stores/session-store';
import { createQueryWrapper } from '@/test-utils/query-wrapper';

import { usePasswordLogin, useSetPassword, useVerifyOtp } from './use-auth';

jest.mock('@/api/auth', () => ({
  requestOtp: jest.fn(),
  verifyOtp: jest.fn(),
  passwordLogin: jest.fn(),
  setPassword: jest.fn(),
}));
jest.mock('@/utils/secure-storage', () => ({
  secureStorage: {
    get: async () => null,
    set: async () => undefined,
    remove: async () => undefined,
  },
}));

const baseUser = {
  id: 'u1',
  email: 'a@b.co',
  name: null,
  username: null,
  avatar: null,
  isPremium: false,
  hasPassword: false,
  joyActivities: [],
  joyOnboarded: false,
};

beforeEach(() => {
  jest.mocked(verifyOtp).mockReset();
  jest.mocked(passwordLogin).mockReset();
  jest.mocked(setPassword).mockReset();
  useSessionStore.setState({ hydrated: true, token: null, user: null });
  useUiStore.setState({ prompts: [] });
});

describe('auth hooks', () => {
  it('a verified code signs in and queues the quick-login password prompt for accounts without one', async () => {
    jest.mocked(verifyOtp).mockResolvedValue({ token: 'jwt', user: baseUser });
    const view = await renderHook(() => useVerifyOtp(), { wrapper: createQueryWrapper() });
    await act(async () => {
      await view.result.current.mutateAsync({ email: 'a@b.co', otp: '123456' });
    });
    expect(useSessionStore.getState()).toMatchObject({ token: 'jwt', user: { id: 'u1' } });
    expect(selectNextPrompt(useUiStore.getState())).toBe('password');
  });

  it('does not queue the password prompt when the account already has one', async () => {
    jest
      .mocked(verifyOtp)
      .mockResolvedValue({ token: 'jwt', user: { ...baseUser, hasPassword: true } });
    const view = await renderHook(() => useVerifyOtp(), { wrapper: createQueryWrapper() });
    await act(async () => {
      await view.result.current.mutateAsync({ email: 'a@b.co', otp: '123456' });
    });
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
  });

  it('a wrong code leaves the user signed out and queues nothing', async () => {
    jest.mocked(verifyOtp).mockRejectedValue(new Error('Invalid OTP'));
    const view = await renderHook(() => useVerifyOtp(), { wrapper: createQueryWrapper() });
    await act(async () => {
      await view.result.current
        .mutateAsync({ email: 'a@b.co', otp: '000000' })
        .catch(() => undefined);
    });
    expect(useSessionStore.getState().token).toBeNull();
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
  });

  it('a password login signs in without any prompt (joy is never asked at login)', async () => {
    jest
      .mocked(passwordLogin)
      .mockResolvedValue({ token: 'jwt', user: { ...baseUser, name: 'Asha', hasPassword: true } });
    const view = await renderHook(() => usePasswordLogin(), { wrapper: createQueryWrapper() });
    await act(async () => {
      await view.result.current.mutateAsync({ email: 'a@b.co', password: 'secret1' });
    });
    expect(useSessionStore.getState().token).toBe('jwt');
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
  });

  it('setting a password records it on the stored user', async () => {
    useSessionStore.setState({ token: 'jwt', user: baseUser });
    jest.mocked(setPassword).mockResolvedValue({ message: 'Password set', hasPassword: true });
    const view = await renderHook(() => useSetPassword(), { wrapper: createQueryWrapper() });
    await act(async () => {
      await view.result.current.mutateAsync('secret1');
    });
    expect(useSessionStore.getState().user?.hasPassword).toBe(true);
  });
});
