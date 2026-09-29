import { fireEvent, waitFor } from '@testing-library/react-native';

import { setPassword } from '@/api/auth';
import { ApiError } from '@/api/errors';
import { useSessionStore } from '@/stores/session-store';
import { renderScreen } from '@/test-utils/render-screen';

import { SetPasswordScreen } from '.';

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
  hasPassword: false,
  joyActivities: [],
  joyOnboarded: true,
};

beforeEach(() => {
  jest.mocked(setPassword).mockReset();
  useSessionStore.setState({ hydrated: true, token: 'jwt', user });
});

describe('SetPasswordScreen', () => {
  it('offers to set a password the first time, with a way to skip', async () => {
    const onDone = jest.fn();
    const view = await renderScreen(<SetPasswordScreen firstTime onDone={onDone} />);
    expect(view.getByText('Set a quick-login password')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Skip for now' }));
    expect(onDone).toHaveBeenCalled();
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('is a plain change-password form afterwards, without a skip button', async () => {
    const view = await renderScreen(<SetPasswordScreen firstTime={false} onDone={() => {}} />);
    expect(view.getByText('Change password')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Skip for now' })).toBeNull();
  });

  it('checks length and confirmation before calling the server', async () => {
    const view = await renderScreen(<SetPasswordScreen firstTime onDone={() => {}} />);
    await fireEvent.changeText(view.getByLabelText('New password'), '123');
    await fireEvent.press(view.getByRole('button', { name: 'Set Password' }));
    expect(view.getByRole('alert')).toHaveTextContent('Password must be at least 6 characters');

    await fireEvent.changeText(view.getByLabelText('New password'), 'secret1');
    await fireEvent.changeText(view.getByLabelText('Confirm password'), 'secret2');
    await fireEvent.press(view.getByRole('button', { name: 'Set Password' }));
    expect(view.getByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('saves the password, records it on the stored user and closes', async () => {
    jest.mocked(setPassword).mockResolvedValue({ message: 'Password set', hasPassword: true });
    const onDone = jest.fn();
    const view = await renderScreen(<SetPasswordScreen firstTime onDone={onDone} />);
    await fireEvent.changeText(view.getByLabelText('New password'), 'secret1');
    await fireEvent.changeText(view.getByLabelText('Confirm password'), 'secret1');
    await fireEvent.press(view.getByRole('button', { name: 'Set Password' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(setPassword).toHaveBeenCalledWith('secret1');
    expect(useSessionStore.getState().user?.hasPassword).toBe(true);
  });

  it('keeps the sheet open and shows the reason when saving fails', async () => {
    jest.mocked(setPassword).mockRejectedValue(
      new ApiError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Check your connection and try again.',
      }),
    );
    const onDone = jest.fn();
    const view = await renderScreen(<SetPasswordScreen firstTime onDone={onDone} />);
    await fireEvent.changeText(view.getByLabelText('New password'), 'secret1');
    await fireEvent.changeText(view.getByLabelText('Confirm password'), 'secret1');
    await fireEvent.press(view.getByRole('button', { name: 'Set Password' }));
    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent(/Could not reach the server/),
    );
    expect(onDone).not.toHaveBeenCalled();
    expect(view.getByLabelText('New password').props.value).toBe('secret1');
  });
});
