import { fireEvent, waitFor } from '@testing-library/react-native';

import { updateProfile } from '@/api/profile';
import { useSessionStore } from '@/stores/session-store';
import { renderScreen } from '@/test-utils/render-screen';

import { JoySetupScreen } from '.';

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
  username: 'asha',
  avatar: null,
  isPremium: false,
  hasPassword: true,
  joyActivities: [] as string[],
  joyOnboarded: false,
};

beforeEach(() => {
  jest.mocked(updateProfile).mockReset();
  jest.mocked(updateProfile).mockImplementation(async (patch) => ({
    ...user,
    joyActivities: patch.joyActivities ?? [],
    joyOnboarded: true,
    email: undefined,
    hasPassword: undefined,
  }));
  useSessionStore.setState({ hydrated: true, token: 'jwt', user });
});

describe('JoySetupScreen', () => {
  it('selects and deselects suggestions', async () => {
    const view = await renderScreen(<JoySetupScreen onDone={() => {}} />);
    const chip = () => view.getByRole('checkbox', { name: 'Dancing' });
    expect(chip().props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(chip());
    expect(chip().props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByText('✓ Dancing')).toBeTruthy();
    await fireEvent.press(chip());
    expect(chip().props.accessibilityState).toMatchObject({ checked: false });
  });

  it('adds a custom activity, shows it as a removable chip, and removes it', async () => {
    const view = await renderScreen(<JoySetupScreen onDone={() => {}} />);
    await fireEvent.changeText(view.getByLabelText('Add your own'), '  Long baths ');
    await fireEvent.press(view.getByRole('button', { name: 'Add' }));
    expect(view.getByText('Long baths')).toBeTruthy();
    expect(view.getByLabelText('Add your own').props.value).toBe('');
    await fireEvent.press(view.getByRole('button', { name: 'Remove Long baths' }));
    expect(view.queryByText('Long baths')).toBeNull();
  });

  it('ignores an empty custom entry', async () => {
    const view = await renderScreen(<JoySetupScreen onDone={() => {}} />);
    await fireEvent.changeText(view.getByLabelText('Add your own'), '   ');
    await fireEvent.press(view.getByRole('button', { name: 'Add' }));
    expect(view.queryByRole('button', { name: /Remove/ })).toBeNull();
  });

  it('stops at twelve and says so', async () => {
    useSessionStore.setState({
      user: { ...user, joyActivities: Array.from({ length: 12 }, (_, i) => `Thing ${i + 1}`) },
    });
    const view = await renderScreen(<JoySetupScreen onDone={() => {}} />);
    await fireEvent.press(view.getByRole('checkbox', { name: 'Dancing' }));
    expect(view.getByRole('alert')).toHaveTextContent('You can add up to 12');
    expect(view.getByRole('checkbox', { name: 'Dancing' }).props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('saves the chosen list, merges it into the stored user, and closes', async () => {
    const onDone = jest.fn();
    const view = await renderScreen(<JoySetupScreen onDone={onDone} />);
    await fireEvent.press(view.getByRole('checkbox', { name: 'Dancing' }));
    await fireEvent.changeText(view.getByLabelText('Add your own'), 'Long baths');
    await fireEvent.press(view.getByRole('button', { name: 'Add' }));
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith({ joyActivities: ['Dancing', 'Long baths'] });
    expect(useSessionStore.getState().user).toMatchObject({
      joyOnboarded: true,
      joyActivities: ['Dancing', 'Long baths'],
      email: 'a@b.co',
    });
  });

  it('"Skip for now" saves too, so the step is marked done and not asked again', async () => {
    const onDone = jest.fn();
    const view = await renderScreen(<JoySetupScreen onDone={onDone} />);
    await fireEvent.press(view.getByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(updateProfile).toHaveBeenCalledWith({ joyActivities: [] });
    expect(useSessionStore.getState().user?.joyOnboarded).toBe(true);
  });

  it('stays open, with the choices intact, when saving fails', async () => {
    jest.mocked(updateProfile).mockRejectedValue(new Error('boom'));
    const onDone = jest.fn();
    const view = await renderScreen(<JoySetupScreen onDone={onDone} />);
    await fireEvent.press(view.getByRole('checkbox', { name: 'Reading' }));
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(onDone).not.toHaveBeenCalled();
    expect(view.getByRole('checkbox', { name: 'Reading' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });
});
