import { fireEvent, waitFor } from '@testing-library/react-native';

import { passwordLogin, requestOtp } from '@/api/auth';
import { ApiError } from '@/api/errors';
import { useSessionStore } from '@/stores/session-store';
import { renderScreen } from '@/test-utils/render-screen';

import { LogInScreen } from '.';

jest.mock('@/api/auth', () => ({ passwordLogin: jest.fn(), requestOtp: jest.fn() }));
jest.mock('@/api/profile', () => ({ updateProfile: jest.fn() }));
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
  username: null,
  avatar: null,
  isPremium: false,
  hasPassword: true,
  joyActivities: [],
  joyOnboarded: false,
};

const setup = async () => {
  const handlers = { onBack: jest.fn(), onSignUp: jest.fn(), onForgotCodeSent: jest.fn() };
  const view = await renderScreen(<LogInScreen {...handlers} />);
  const type = (label: string, value: string) =>
    fireEvent.changeText(view.getByLabelText(label), value);
  return { view, type, ...handlers };
};

beforeEach(() => {
  jest.mocked(passwordLogin).mockReset();
  jest.mocked(requestOtp).mockReset();
  useSessionStore.setState({ hydrated: true, token: null, user: null, persistent: true });
});

describe('LogInScreen', () => {
  it('needs an email and a password', async () => {
    const { view } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Log in' }));
    expect(view.getByText('Enter a valid email address')).toBeTruthy();
    expect(view.getByText('Enter your password')).toBeTruthy();
    expect(passwordLogin).not.toHaveBeenCalled();
  });

  it('logs in with the tidied address and remembers the session by default', async () => {
    jest.mocked(passwordLogin).mockResolvedValue({ token: 'jwt', user });
    const { view, type } = await setup();
    await type('Email', '  A@B.co ');
    await type('Password', 'secret123');
    await fireEvent.press(view.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(useSessionStore.getState().token).toBe('jwt'));
    expect(passwordLogin).toHaveBeenCalledWith('a@b.co', 'secret123');
    expect(useSessionStore.getState().persistent).toBe(true);
  });

  it('does not keep the session when "Remember me" is switched off', async () => {
    jest.mocked(passwordLogin).mockResolvedValue({ token: 'jwt', user });
    const { view, type } = await setup();
    await type('Email', 'a@b.co');
    await type('Password', 'secret123');
    await fireEvent.press(view.getByRole('checkbox', { name: 'Remember me' }));
    await fireEvent.press(view.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(useSessionStore.getState().token).toBe('jwt'));
    expect(useSessionStore.getState().persistent).toBe(false);
  });

  it('keeps both fields and shows the server message after a wrong password', async () => {
    jest.mocked(passwordLogin).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      }),
    );
    const { view, type } = await setup();
    await type('Email', 'a@b.co');
    await type('Password', 'wrong-one');
    await fireEvent.press(view.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent('Invalid email or password'),
    );
    expect(view.getByLabelText('Email').props.value).toBe('a@b.co');
    expect(view.getByLabelText('Password').props.value).toBe('wrong-one');
    expect(useSessionStore.getState().token).toBeNull();
  });

  it('drops the server message as soon as either field is edited', async () => {
    jest.mocked(passwordLogin).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      }),
    );
    const { view, type } = await setup();
    await type('Email', 'a@b.co');
    await type('Password', 'wrong-one');
    await fireEvent.press(view.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());

    await type('Password', 'wrong-one!');
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('"Forgot password?" needs an email first', async () => {
    const { view } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Forgot password?' }));
    expect(view.getByText(/Enter your email first/)).toBeTruthy();
    expect(requestOtp).not.toHaveBeenCalled();
  });

  it('"Forgot password?" emails a code and opens the code screen', async () => {
    jest.mocked(requestOtp).mockResolvedValue({ message: 'OTP sent' });
    const { view, type, onForgotCodeSent } = await setup();
    await type('Email', 'A@B.co');
    await fireEvent.press(view.getByRole('button', { name: 'Forgot password?' }));
    await waitFor(() => expect(onForgotCodeSent).toHaveBeenCalledWith('a@b.co'));
    expect(requestOtp).toHaveBeenCalledWith('a@b.co');
  });

  it('has a way back and a way to create an account', async () => {
    const { view, onBack, onSignUp } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    await fireEvent.press(view.getByRole('button', { name: 'Create an account' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSignUp).toHaveBeenCalledTimes(1);
  });
});
