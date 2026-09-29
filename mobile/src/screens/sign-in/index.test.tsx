import { fireEvent, waitFor } from '@testing-library/react-native';

import { passwordLogin, requestOtp } from '@/api/auth';
import { ApiError } from '@/api/errors';
import { useSessionStore } from '@/stores/session-store';
import { renderScreen } from '@/test-utils/render-screen';

import { SignInScreen } from '.';

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

const user = {
  id: 'u1',
  email: 'a@b.co',
  name: 'Asha',
  username: 'asha',
  avatar: null,
  isPremium: false,
  hasPassword: true,
  joyActivities: [],
  joyOnboarded: true,
};

beforeEach(() => {
  jest.mocked(requestOtp).mockReset();
  jest.mocked(passwordLogin).mockReset();
  useSessionStore.setState({ hydrated: true, token: null, user: null });
});

describe('SignInScreen', () => {
  it('starts in code mode and explains it', async () => {
    const view = await renderScreen(<SignInScreen onCodeRequested={() => {}} />);
    expect(view.getByText("We'll email you a one-time code. No passwords.")).toBeTruthy();
    expect(view.getByRole('button', { name: 'Continue' })).toBeTruthy();
    expect(view.queryByLabelText('Password')).toBeNull();
  });

  it('toggles to password mode and back', async () => {
    const view = await renderScreen(<SignInScreen onCodeRequested={() => {}} />);
    await fireEvent.press(view.getByRole('button', { name: 'Sign in with password instead' }));
    expect(view.getByLabelText('Password')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Sign In' })).toBeTruthy();
    expect(view.getByText('Sign in with your password.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Use OTP instead' }));
    expect(view.queryByLabelText('Password')).toBeNull();
  });

  it('rejects an address without @ before calling the server', async () => {
    const view = await renderScreen(<SignInScreen onCodeRequested={() => {}} />);
    await fireEvent.changeText(view.getByLabelText('Email address'), 'not-an-email');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    expect(view.getByRole('alert')).toHaveTextContent('Enter a valid email address');
    expect(requestOtp).not.toHaveBeenCalled();
  });

  it('emails a code for the trimmed, lower-cased address and moves on', async () => {
    jest.mocked(requestOtp).mockResolvedValue({ message: 'OTP sent' });
    const onCodeRequested = jest.fn();
    const view = await renderScreen(<SignInScreen onCodeRequested={onCodeRequested} />);
    await fireEvent.changeText(view.getByLabelText('Email address'), '  Asha@Example.COM ');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onCodeRequested).toHaveBeenCalledWith('asha@example.com'));
    expect(requestOtp).toHaveBeenCalledWith('asha@example.com');
  });

  it('shows a server message inline and stays usable', async () => {
    jest.mocked(requestOtp).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Valid email required',
      }),
    );
    const onCodeRequested = jest.fn();
    const view = await renderScreen(<SignInScreen onCodeRequested={onCodeRequested} />);
    await fireEvent.changeText(view.getByLabelText('Email address'), 'a@b');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Valid email required'));
    expect(onCodeRequested).not.toHaveBeenCalled();
    expect(view.getByRole('button', { name: 'Continue' }).props.accessibilityState).toMatchObject({
      disabled: false,
    });
  });

  it('a wrong password shows the message, keeps what was typed, and does not sign out or in', async () => {
    jest.mocked(passwordLogin).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      }),
    );
    const view = await renderScreen(<SignInScreen onCodeRequested={() => {}} />);
    await fireEvent.press(view.getByRole('button', { name: 'Sign in with password instead' }));
    await fireEvent.changeText(view.getByLabelText('Email address'), 'a@b.co');
    await fireEvent.changeText(view.getByLabelText('Password'), 'nope');
    await fireEvent.press(view.getByRole('button', { name: 'Sign In' }));
    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent('Invalid email or password'),
    );
    expect(view.getByLabelText('Email address').props.value).toBe('a@b.co');
    expect(view.getByLabelText('Password').props.value).toBe('nope');
    expect(useSessionStore.getState().token).toBeNull();
  });

  it('a correct password signs in', async () => {
    jest.mocked(passwordLogin).mockResolvedValue({ token: 'jwt', user });
    const view = await renderScreen(<SignInScreen onCodeRequested={() => {}} />);
    await fireEvent.press(view.getByRole('button', { name: 'Sign in with password instead' }));
    await fireEvent.changeText(view.getByLabelText('Email address'), 'A@B.co');
    await fireEvent.changeText(view.getByLabelText('Password'), 'secret1');
    await fireEvent.press(view.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(useSessionStore.getState().token).toBe('jwt'));
    expect(passwordLogin).toHaveBeenCalledWith('a@b.co', 'secret1');
  });

  it('a network failure says so instead of pretending the password was wrong', async () => {
    jest.mocked(requestOtp).mockRejectedValue(
      new ApiError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Check your connection and try again.',
      }),
    );
    const view = await renderScreen(<SignInScreen onCodeRequested={() => {}} />);
    await fireEvent.changeText(view.getByLabelText('Email address'), 'a@b.co');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent(/Could not reach the server/),
    );
  });
});
