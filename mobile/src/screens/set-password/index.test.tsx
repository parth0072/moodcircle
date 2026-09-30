import { fireEvent, waitFor } from '@testing-library/react-native';

import { setPassword } from '@/api/auth';
import { ApiError } from '@/api/errors';
import { useSessionStore } from '@/stores/session-store';
import { renderScreen } from '@/test-utils/render-screen';

import { SetPasswordScreen } from '.';

jest.mock('@/api/auth', () => ({ setPassword: jest.fn() }));
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
  hasPassword: false,
  joyActivities: [],
  joyOnboarded: false,
};

beforeEach(() => {
  jest.mocked(setPassword).mockReset();
  useSessionStore.setState({ hydrated: true, token: 'jwt', user, persistent: true });
});

const fill = async (view: Awaited<ReturnType<typeof renderScreen>>, a: string, b: string) => {
  await fireEvent.changeText(view.getByLabelText('New password'), a);
  await fireEvent.changeText(view.getByLabelText('Confirm password'), b);
};

describe('SetPasswordScreen', () => {
  it('checks length and confirmation before calling the server', async () => {
    const view = await renderScreen(<SetPasswordScreen onDone={() => {}} />);
    await fill(view, 'short', 'short');
    await fireEvent.press(view.getByRole('button', { name: 'Save password' }));
    expect(view.getByText('Password must be at least 8 characters')).toBeTruthy();

    await fill(view, 'Secret123!', 'Different1!');
    await fireEvent.press(view.getByRole('button', { name: 'Save password' }));
    expect(view.getByText('Passwords do not match')).toBeTruthy();
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('saves the password, records it on the stored user and closes', async () => {
    jest.mocked(setPassword).mockResolvedValue({ message: 'Password set', hasPassword: true });
    const onDone = jest.fn();
    const view = await renderScreen(<SetPasswordScreen onDone={onDone} />);
    await fill(view, 'Secret123!', 'Secret123!');
    await fireEvent.press(view.getByRole('button', { name: 'Save password' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(setPassword).toHaveBeenCalledWith('Secret123!');
    expect(useSessionStore.getState().user?.hasPassword).toBe(true);
  });

  it('stays open and shows the reason when saving fails', async () => {
    jest.mocked(setPassword).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Password too weak',
      }),
    );
    const onDone = jest.fn();
    const view = await renderScreen(<SetPasswordScreen onDone={onDone} />);
    await fill(view, 'Secret123!', 'Secret123!');
    await fireEvent.press(view.getByRole('button', { name: 'Save password' }));

    await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Password too weak'));
    expect(onDone).not.toHaveBeenCalled();
    expect(view.getByLabelText('New password').props.value).toBe('Secret123!');
  });

  it('can always be skipped', async () => {
    const onDone = jest.fn();
    const view = await renderScreen(<SetPasswordScreen onDone={onDone} />);
    await fireEvent.press(view.getByRole('button', { name: 'Not now' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(setPassword).not.toHaveBeenCalled();
  });
});
