import { act, renderHook } from '@testing-library/react-native';

import { passwordLogin, setPassword, verifyOtp } from '@/api/auth';
import { updateProfile } from '@/api/profile';
import { selectStatus, useSessionStore } from '@/stores/session-store';
import { selectNextPrompt, useUiStore } from '@/stores/ui-store';
import { createQueryWrapper } from '@/test-utils/query-wrapper';

import { usePasswordLogin, useSetPassword, useVerifyOtp } from './use-auth';

jest.mock('@/api/auth', () => ({
  requestOtp: jest.fn(),
  verifyOtp: jest.fn(),
  passwordLogin: jest.fn(),
  setPassword: jest.fn(),
}));
jest.mock('@/api/profile', () => ({ updateProfile: jest.fn() }));

const mockMemory = new Map<string, string>();
jest.mock('@/utils/secure-storage', () => ({
  secureStorage: {
    get: async (key: string) => mockMemory.get(key) ?? null,
    set: async (key: string, value: string) => void mockMemory.set(key, value),
    remove: async (key: string) => void mockMemory.delete(key),
  },
}));

const newAccount = {
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
const named = { ...newAccount, name: 'Asha' };
const draft = { name: 'Asha', password: 'Secret123!' };

const verify = async (flow: 'signup' | 'forgot' = 'signup') => {
  const view = await renderHook(() => useVerifyOtp(flow), { wrapper: createQueryWrapper() });
  await act(async () => {
    await view.result.current
      .mutateAsync({ email: 'a@b.co', otp: '123456' })
      .catch(() => undefined);
  });
};

beforeEach(() => {
  mockMemory.clear();
  jest.mocked(verifyOtp).mockReset();
  jest.mocked(passwordLogin).mockReset();
  jest.mocked(setPassword).mockReset();
  jest.mocked(updateProfile).mockReset();
  useSessionStore.setState({ hydrated: true, token: null, user: null, persistent: true });
  useUiStore.getState().reset();
});

describe('verifying a code to create an account', () => {
  it('saves the name and password typed on the sign-up form, with the fresh token, before signing in', async () => {
    useUiStore.getState().setSignupDraft(draft);
    jest.mocked(verifyOtp).mockResolvedValue({ token: 'jwt', user: newAccount });
    jest
      .mocked(updateProfile)
      .mockResolvedValue({ ...named, email: undefined, hasPassword: undefined });
    jest.mocked(setPassword).mockResolvedValue({ message: 'Password set', hasPassword: true });

    await verify();

    expect(updateProfile).toHaveBeenCalledWith({ name: 'Asha' }, 'jwt');
    expect(setPassword).toHaveBeenCalledWith('Secret123!', 'jwt');
    const state = useSessionStore.getState();
    expect(state.token).toBe('jwt');
    // The stored user has everything at once, so the app never shows a "what is your name?" screen.
    expect(state.user).toMatchObject({ email: 'a@b.co', name: 'Asha', hasPassword: true });
    expect(selectStatus(state)).toBe('ready');
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
    expect(useUiStore.getState().signupDraft).toBeNull();
  });

  it('signs in an email that already has an account without touching its name or password', async () => {
    useUiStore.getState().setSignupDraft(draft);
    jest
      .mocked(verifyOtp)
      .mockResolvedValue({ token: 'jwt', user: { ...named, hasPassword: true } });

    await verify();

    expect(updateProfile).not.toHaveBeenCalled();
    expect(setPassword).not.toHaveBeenCalled();
    expect(useSessionStore.getState().user).toMatchObject({ name: 'Asha', hasPassword: true });
    expect(useUiStore.getState().notice).toMatch(/already had an account/);
    expect(useUiStore.getState().signupDraft).toBeNull();
  });

  it('still signs in when the name cannot be saved: the profile screen asks for it again', async () => {
    useUiStore.getState().setSignupDraft(draft);
    jest.mocked(verifyOtp).mockResolvedValue({ token: 'jwt', user: newAccount });
    jest.mocked(updateProfile).mockRejectedValue(new Error('offline'));
    jest.mocked(setPassword).mockResolvedValue({ message: 'Password set', hasPassword: true });

    await verify();

    expect(selectStatus(useSessionStore.getState())).toBe('needsProfile');
    expect(useSessionStore.getState().user?.hasPassword).toBe(true);
  });

  it('still signs in when the password cannot be saved, and offers the password sheet', async () => {
    useUiStore.getState().setSignupDraft(draft);
    jest.mocked(verifyOtp).mockResolvedValue({ token: 'jwt', user: newAccount });
    jest
      .mocked(updateProfile)
      .mockResolvedValue({ ...named, email: undefined, hasPassword: undefined });
    jest.mocked(setPassword).mockRejectedValue(new Error('offline'));

    await verify();

    expect(selectStatus(useSessionStore.getState())).toBe('ready');
    expect(useSessionStore.getState().user?.hasPassword).toBe(false);
    expect(selectNextPrompt(useUiStore.getState())).toBe('password');
  });

  it('a wrong code leaves the user signed out, keeps the draft and queues nothing', async () => {
    useUiStore.getState().setSignupDraft(draft);
    jest.mocked(verifyOtp).mockRejectedValue(new Error('Invalid OTP'));

    await verify();

    expect(useSessionStore.getState().token).toBeNull();
    expect(useUiStore.getState().signupDraft).toEqual(draft);
    expect(updateProfile).not.toHaveBeenCalled();
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
  });
});

describe('verifying a code after "Forgot password?"', () => {
  it('signs in, leaves the account alone and offers the password sheet', async () => {
    jest
      .mocked(verifyOtp)
      .mockResolvedValue({ token: 'jwt', user: { ...named, hasPassword: true } });

    await verify('forgot');

    expect(updateProfile).not.toHaveBeenCalled();
    expect(setPassword).not.toHaveBeenCalled();
    expect(useSessionStore.getState().token).toBe('jwt');
    expect(selectNextPrompt(useUiStore.getState())).toBe('password');
  });
});

describe('password login', () => {
  const loggedIn = { token: 'jwt', user: { ...named, hasPassword: true } };

  it('signs in and remembers the session by default', async () => {
    jest.mocked(passwordLogin).mockResolvedValue(loggedIn);
    const view = await renderHook(() => usePasswordLogin(), { wrapper: createQueryWrapper() });
    await act(async () => {
      await view.result.current.mutateAsync({
        email: 'a@b.co',
        password: 'secret1',
        remember: true,
      });
    });
    expect(useSessionStore.getState()).toMatchObject({ token: 'jwt', persistent: true });
    expect(mockMemory.get('mc.token')).toBe('jwt');
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
  });

  it('without "Remember me" the session lives in memory only', async () => {
    jest.mocked(passwordLogin).mockResolvedValue(loggedIn);
    const view = await renderHook(() => usePasswordLogin(), { wrapper: createQueryWrapper() });
    await act(async () => {
      await view.result.current.mutateAsync({
        email: 'a@b.co',
        password: 'secret1',
        remember: false,
      });
    });
    expect(useSessionStore.getState()).toMatchObject({ token: 'jwt', persistent: false });
    expect(mockMemory.size).toBe(0);
  });

  it('a wrong password leaves the user signed out', async () => {
    jest.mocked(passwordLogin).mockRejectedValue(new Error('Invalid credentials'));
    const view = await renderHook(() => usePasswordLogin(), { wrapper: createQueryWrapper() });
    await act(async () => {
      await view.result.current
        .mutateAsync({ email: 'a@b.co', password: 'nope', remember: true })
        .catch(() => undefined);
    });
    expect(useSessionStore.getState().token).toBeNull();
  });
});

describe('setting a password', () => {
  it('records it on the stored user', async () => {
    useSessionStore.setState({ token: 'jwt', user: named });
    jest.mocked(setPassword).mockResolvedValue({ message: 'Password set', hasPassword: true });
    const view = await renderHook(() => useSetPassword(), { wrapper: createQueryWrapper() });
    await act(async () => {
      await view.result.current.mutateAsync('Secret123!');
    });
    expect(useSessionStore.getState().user?.hasPassword).toBe(true);
  });
});
