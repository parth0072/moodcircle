import { fireEvent, waitFor } from '@testing-library/react-native';

import { updateProfile } from '@/api/profile';
import { useSessionStore } from '@/stores/session-store';
import { renderScreen } from '@/test-utils/render-screen';

import { ProfileSetupScreen } from '.';

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
  name: null,
  username: null,
  avatar: null,
  isPremium: false,
  hasPassword: true,
  joyActivities: [],
  joyOnboarded: false,
};

beforeEach(() => {
  jest.mocked(updateProfile).mockReset();
  useSessionStore.setState({ hydrated: true, token: 'jwt', user, persistent: true });
});

describe('ProfileSetupScreen', () => {
  it('needs a name', async () => {
    const view = await renderScreen(<ProfileSetupScreen mode="setup" />);
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    expect(view.getByText('Enter your name')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('saves the trimmed name and merges the answer, keeping the email and password flag', async () => {
    jest
      .mocked(updateProfile)
      .mockResolvedValue({ ...user, name: 'Asha', email: undefined, hasPassword: undefined });
    const view = await renderScreen(<ProfileSetupScreen mode="setup" />);
    await fireEvent.changeText(view.getByLabelText('Your name'), '  Asha ');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(useSessionStore.getState().user?.name).toBe('Asha'));
    expect(updateProfile).toHaveBeenCalledWith({ name: 'Asha' });
    expect(useSessionStore.getState().user).toMatchObject({ email: 'a@b.co', hasPassword: true });
  });

  it('starts from the stored name when editing, and closes after saving', async () => {
    useSessionStore.setState({ user: { ...user, name: 'Asha' } });
    jest
      .mocked(updateProfile)
      .mockResolvedValue({ ...user, name: 'Asha K', email: undefined, hasPassword: undefined });
    const onSaved = jest.fn();
    const view = await renderScreen(<ProfileSetupScreen mode="edit" onSaved={onSaved} />);
    expect(view.getByLabelText('Your name').props.value).toBe('Asha');

    await fireEvent.changeText(view.getByLabelText('Your name'), 'Asha K');
    await fireEvent.press(view.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(useSessionStore.getState().user?.name).toBe('Asha K');
  });

  it('keeps the typed name and says so when saving fails', async () => {
    jest.mocked(updateProfile).mockRejectedValue(new Error('offline'));
    const view = await renderScreen(<ProfileSetupScreen mode="setup" />);
    await fireEvent.changeText(view.getByLabelText('Your name'), 'Asha');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent('Could not save your name'),
    );
    expect(view.getByLabelText('Your name').props.value).toBe('Asha');
  });
});
