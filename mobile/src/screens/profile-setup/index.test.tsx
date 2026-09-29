import { fireEvent, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { updateProfile } from '@/api/profile';
import { useSessionStore } from '@/stores/session-store';
import { selectNextPrompt, useUiStore } from '@/stores/ui-store';
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

const newUser = {
  id: 'u1',
  email: 'asha@example.com',
  name: null,
  username: null,
  avatar: null,
  isPremium: false,
  hasPassword: true,
  joyActivities: [],
  joyOnboarded: false,
};
const saved = { ...newUser, name: 'Asha', username: 'asha_k', avatar: '🦊' };

beforeEach(() => {
  jest.mocked(updateProfile).mockReset();
  useSessionStore.setState({ hydrated: true, token: 'jwt', user: newUser });
  useUiStore.setState({ prompts: [] });
});

describe('ProfileSetupScreen', () => {
  it('needs a display name', async () => {
    const view = await renderScreen(<ProfileSetupScreen firstSetup />);
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    expect(view.getByRole('alert')).toHaveTextContent('Enter your display name');
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('keeps usernames to lower-case letters, digits and underscores', async () => {
    const view = await renderScreen(<ProfileSetupScreen firstSetup />);
    await fireEvent.changeText(view.getByLabelText('Username'), 'Asha_K!! Smith-9');
    expect(view.getByLabelText('Username').props.value).toBe('asha_ksmith9');
  });

  it('rejects a username shorter than three characters', async () => {
    const view = await renderScreen(<ProfileSetupScreen firstSetup />);
    await fireEvent.changeText(view.getByLabelText('Display name'), 'Asha');
    await fireEvent.changeText(view.getByLabelText('Username'), 'ab');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    expect(view.getByRole('alert')).toHaveTextContent('Username must be at least 3 characters');
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('saves name, username and the chosen avatar, merges the answer, and queues the joy prompt', async () => {
    jest
      .mocked(updateProfile)
      .mockResolvedValue({ ...saved, email: undefined, hasPassword: undefined });
    const onSaved = jest.fn();
    const view = await renderScreen(<ProfileSetupScreen firstSetup onSaved={onSaved} />);
    await fireEvent.press(view.getByRole('radio', { name: 'Avatar 🦊' }));
    expect(view.getByLabelText('Chosen avatar 🦊')).toBeTruthy();
    await fireEvent.changeText(view.getByLabelText('Display name'), '  Asha ');
    await fireEvent.changeText(view.getByLabelText('Username'), 'asha_k');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith({ name: 'Asha', username: 'asha_k', avatar: '🦊' });
    // Merged, not replaced: the profile answer has no email, the stored user keeps it.
    expect(useSessionStore.getState().user).toMatchObject({
      name: 'Asha',
      email: 'asha@example.com',
      hasPassword: true,
    });
    expect(selectNextPrompt(useUiStore.getState())).toBe('joy');
  });

  it('leaves the username out of the request when it is empty', async () => {
    jest.mocked(updateProfile).mockResolvedValue({ ...saved, username: null });
    const view = await renderScreen(<ProfileSetupScreen firstSetup />);
    await fireEvent.changeText(view.getByLabelText('Display name'), 'Asha');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith({ name: 'Asha', username: undefined, avatar: '😊' });
  });

  it('does not queue the joy prompt when the account already answered it', async () => {
    jest.mocked(updateProfile).mockResolvedValue({ ...saved, joyOnboarded: true });
    const view = await renderScreen(<ProfileSetupScreen firstSetup />);
    await fireEvent.changeText(view.getByLabelText('Display name'), 'Asha');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(useSessionStore.getState().user?.name).toBe('Asha'));
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
  });

  it('shows a taken username on the username field', async () => {
    jest.mocked(updateProfile).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 409,
        code: 'USERNAME_TAKEN',
        message: 'Username already taken',
      }),
    );
    const view = await renderScreen(<ProfileSetupScreen firstSetup />);
    await fireEvent.changeText(view.getByLabelText('Display name'), 'Asha');
    await fireEvent.changeText(view.getByLabelText('Username'), 'asha');
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent('That username is taken'),
    );
    expect(useSessionStore.getState().user?.name).toBeNull();
  });

  it('starts from the stored profile when editing', async () => {
    useSessionStore.setState({ user: { ...saved, joyOnboarded: true } });
    const view = await renderScreen(<ProfileSetupScreen />);
    expect(view.getByLabelText('Display name').props.value).toBe('Asha');
    expect(view.getByLabelText('Username').props.value).toBe('asha_k');
    expect(view.getByLabelText('Chosen avatar 🦊')).toBeTruthy();
  });
});
