import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { createEntry, deleteEntry, listEntries, updateEntry } from '@/api/entries';
import { ApiError } from '@/api/errors';
import type { Entry } from '@/api/schemas/entry';
import { useSessionStore } from '@/stores/session-store';
import { useUiStore } from '@/stores/ui-store';
import { renderScreen } from '@/test-utils/render-screen';
import { localDate } from '@/utils/local-date';

import { HomeScreen } from '.';

jest.mock('@/api/entries', () => ({
  createEntry: jest.fn(),
  listEntries: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  getEntryStats: jest.fn(),
}));

const today = localDate();
const entry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'e1',
  emotion: 'joy',
  intensity: 3,
  tags: [],
  note: '',
  date: today,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const user = {
  id: 'u1',
  email: 'asha@example.com',
  name: 'Aria',
  username: null,
  avatar: null,
  isPremium: false,
  hasPassword: true,
  joyActivities: [],
  joyOnboarded: false,
};

const setup = async () => {
  const handlers = { onOpenProfile: jest.fn(), onOpenInsights: jest.fn(), onOpenLog: jest.fn() };
  const view = await renderScreen(<HomeScreen {...handlers} />);
  return { view, ...handlers };
};
const pill = (view: Awaited<ReturnType<typeof renderScreen>>, label: string) =>
  view.getByRole('radio', { name: label });

beforeEach(() => {
  for (const fn of [createEntry, listEntries, updateEntry, deleteEntry])
    jest.mocked(fn).mockReset();
  jest.mocked(listEntries).mockResolvedValue([]);
  useSessionStore.setState({ hydrated: true, token: 'jwt', user, persistent: true });
  useUiStore.getState().reset();
});

describe('HomeScreen', () => {
  it('greets, asks how today felt, and offers the six emotions', async () => {
    const { view } = await setup();
    expect(view.getByText(/^Good (morning|afternoon|evening)!$/)).toBeTruthy();
    expect(view.getByText('How did today feel?')).toBeTruthy();
    expect(view.getByText('Aria')).toBeTruthy();
    for (const label of ['Joy', 'Calm', 'Sad', 'Worry', 'Anger', 'Meh']) {
      expect(pill(view, label)).toBeTruthy();
    }
  });

  it('says so when nothing is logged yet today', async () => {
    const { view } = await setup();
    await waitFor(() => expect(view.getByText(/Nothing logged yet today/)).toBeTruthy());
  });

  it("logs an emotion on tap, and shows it in today's list", async () => {
    jest.mocked(createEntry).mockResolvedValue(entry());
    jest.mocked(listEntries).mockResolvedValueOnce([]).mockResolvedValue([entry()]);
    const { view } = await setup();
    await waitFor(() => expect(view.getByText(/Nothing logged yet today/)).toBeTruthy());

    await fireEvent.press(pill(view, 'Joy'));

    await waitFor(() => expect(view.getByText('Logged: Joy · tap again to undo')).toBeTruthy());
    expect(createEntry).toHaveBeenCalledWith({ emotion: 'joy', intensity: 3, date: today });
    expect(pill(view, 'Joy').props.accessibilityState).toMatchObject({ checked: true });
    await waitFor(() => expect(view.getByRole('button', { name: /^Joy, Moderate/ })).toBeTruthy());
  });

  it('undoes the log when the chosen emotion is tapped again', async () => {
    jest.mocked(createEntry).mockResolvedValue(entry());
    jest.mocked(deleteEntry).mockResolvedValue(undefined);
    const { view } = await setup();
    await fireEvent.press(pill(view, 'Joy'));
    await waitFor(() => expect(view.getByText(/Logged: Joy/)).toBeTruthy());

    await fireEvent.press(pill(view, 'Joy'));

    await waitFor(() => expect(view.getByText('How did today feel?')).toBeTruthy());
    expect(deleteEntry).toHaveBeenCalledWith('e1');
    expect(pill(view, 'Joy').props.accessibilityState).toMatchObject({ checked: false });
  });

  it('corrects the same entry when another emotion is tapped, rather than adding a second', async () => {
    jest.mocked(createEntry).mockResolvedValue(entry());
    jest.mocked(updateEntry).mockResolvedValue(entry({ emotion: 'calm' }));
    const { view } = await setup();
    await fireEvent.press(pill(view, 'Joy'));
    await waitFor(() => expect(view.getByText(/Logged: Joy/)).toBeTruthy());

    await fireEvent.press(pill(view, 'Calm'));

    await waitFor(() => expect(view.getByText('Logged: Calm · tap again to undo')).toBeTruthy());
    expect(updateEntry).toHaveBeenCalledWith('e1', { emotion: 'calm' });
    expect(createEntry).toHaveBeenCalledTimes(1);
  });

  it('shows why nothing was saved, and keeps nothing selected', async () => {
    jest.mocked(createEntry).mockRejectedValue(
      new ApiError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Check your connection and try again.',
      }),
    );
    const { view } = await setup();
    await fireEvent.press(pill(view, 'Sad'));

    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent(/Could not reach the server/),
    );
    expect(pill(view, 'Sad').props.accessibilityState).toMatchObject({ checked: false });
    expect(view.getByText('How did today feel?')).toBeTruthy();
  });

  it("lists today's check-ins newest first and opens one to add details", async () => {
    const older = entry({ id: 'a', emotion: 'calm', createdAt: '2026-09-30T08:00:00.000Z' });
    const newer = entry({
      id: 'b',
      emotion: 'worry',
      tags: ['Work'],
      createdAt: '2026-09-30T20:00:00.000Z',
    });
    jest.mocked(listEntries).mockResolvedValue([older, newer]);
    const { view, onOpenLog } = await setup();
    await waitFor(() => expect(view.getAllByRole('button', { name: /Edit$/ })).toHaveLength(2));
    const rows = view.getAllByRole('button', { name: /Edit$/ });
    expect(rows[0].props.accessibilityLabel).toMatch(/^Worry/);
    expect(view.getByText('Work')).toBeTruthy();

    await fireEvent.press(rows[1]);
    expect(onOpenLog).toHaveBeenCalledWith('a');
  });

  it("offers a retry when today's list cannot be loaded", async () => {
    jest.mocked(listEntries).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    const { view } = await setup();
    await waitFor(() => expect(view.getByText(/Could not load today's check-ins/)).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(view.getByText(/Nothing logged yet today/)).toBeTruthy());
  });

  it('opens the profile, the insights, and the log (with the entry just made)', async () => {
    jest.mocked(createEntry).mockResolvedValue(entry());
    const { view, onOpenProfile, onOpenInsights, onOpenLog } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Profile' }));
    await fireEvent.press(view.getByRole('button', { name: 'Mood insights' }));
    await fireEvent.press(view.getByRole('button', { name: 'Log a mood' }));
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
    expect(onOpenInsights).toHaveBeenCalledTimes(1);
    expect(onOpenLog).toHaveBeenLastCalledWith(undefined);

    await fireEvent.press(pill(view, 'Joy'));
    await waitFor(() => expect(view.getByText(/Logged: Joy/)).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Log a mood' }));
    expect(onOpenLog).toHaveBeenLastCalledWith('e1');
  });

  it('shows a notice once and lets it be dismissed', async () => {
    useUiStore.getState().setNotice('You already had an account, so we signed you in.');
    const { view } = await setup();
    expect(view.getByText('You already had an account, so we signed you in.')).toBeTruthy();
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'Got it' }));
    });
    expect(view.queryByText(/already had an account/)).toBeNull();
    expect(useUiStore.getState().notice).toBeNull();
  });
});
