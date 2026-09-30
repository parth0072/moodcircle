import { fireEvent, waitFor } from '@testing-library/react-native';

import { endSession } from '@/api';
import { getEntryStats } from '@/api/entries';
import type { EntryStats } from '@/api/schemas/entry';
import { useSessionStore } from '@/stores/session-store';
import { renderScreen } from '@/test-utils/render-screen';
import { isReminderOn, turnReminderOff, turnReminderOn } from '@/utils/reminder';

import { ProfileScreen } from '.';

jest.mock('@/api', () => ({ endSession: jest.fn() }));
jest.mock('@/api/entries', () => ({
  createEntry: jest.fn(),
  listEntries: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  getEntryStats: jest.fn(),
}));
jest.mock('@/utils/reminder', () => ({
  REMINDER_LABEL: 'Every day at 8:30 pm',
  isReminderOn: jest.fn(),
  turnReminderOn: jest.fn(),
  turnReminderOff: jest.fn(),
}));

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

const stats = (overrides: Partial<EntryStats> = {}): EntryStats => ({
  total: 12,
  currentStreak: 4,
  topEmotion: 'calm',
  firstEntryDate: `${new Date().getFullYear()}-03-02`,
  ...overrides,
});

const setup = async () => {
  const handlers = { onBack: jest.fn(), onEdit: jest.fn() };
  const view = await renderScreen(<ProfileScreen {...handlers} />);
  return { view, ...handlers };
};
const reminderSwitch = (view: Awaited<ReturnType<typeof renderScreen>>) =>
  view.getByRole('switch', { name: 'Daily reminder' });

beforeEach(() => {
  for (const fn of [endSession, getEntryStats, isReminderOn, turnReminderOn, turnReminderOff]) {
    jest.mocked(fn).mockReset();
  }
  jest.mocked(getEntryStats).mockResolvedValue(stats());
  jest.mocked(isReminderOn).mockResolvedValue(false);
  jest.mocked(turnReminderOff).mockResolvedValue(undefined);
  jest.mocked(endSession).mockResolvedValue(undefined);
  useSessionStore.setState({ hydrated: true, token: 'jwt', user, persistent: true });
});

describe('ProfileScreen', () => {
  it('shows who you are, since when, and the three totals', async () => {
    const { view } = await setup();
    expect(view.getByText('Aria')).toBeTruthy();
    expect(view.getByLabelText('Avatar for Aria')).toHaveTextContent('A');

    await waitFor(() => expect(view.getByLabelText('4 Day streak')).toBeTruthy());
    expect(view.getByLabelText('12 Check-ins')).toBeTruthy();
    expect(view.getByLabelText('Calm Top mood')).toBeTruthy();
    expect(view.getByText(/^Checking in since /)).toBeTruthy();
    expect(getEntryStats).toHaveBeenCalledTimes(1);
  });

  it('shows dashes while loading, and a fresh account as just getting started', async () => {
    jest
      .mocked(getEntryStats)
      .mockResolvedValue(
        stats({ total: 0, currentStreak: 0, topEmotion: null, firstEntryDate: null }),
      );
    const { view } = await setup();
    expect(view.getByLabelText('– Day streak')).toBeTruthy();

    await waitFor(() => expect(view.getByText('Just getting started')).toBeTruthy());
    expect(view.getByLabelText('0 Day streak')).toBeTruthy();
    expect(view.getByLabelText('0 Check-ins')).toBeTruthy();
    expect(view.getByLabelText('– Top mood')).toBeTruthy();
  });

  it('offers a retry when the totals cannot be loaded', async () => {
    jest
      .mocked(getEntryStats)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(stats());
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Could not load your totals.')).toBeTruthy());

    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(view.getByLabelText('12 Check-ins')).toBeTruthy());
    expect(view.queryByText('Could not load your totals.')).toBeNull();
  });

  it('turns the daily reminder on and off', async () => {
    jest.mocked(turnReminderOn).mockResolvedValue('on');
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Off')).toBeTruthy());

    await fireEvent(reminderSwitch(view), 'valueChange', true);
    await waitFor(() => expect(view.getByText('Every day at 8:30 pm')).toBeTruthy());
    expect(turnReminderOn).toHaveBeenCalledTimes(1);

    await fireEvent(reminderSwitch(view), 'valueChange', false);
    await waitFor(() => expect(view.getByText('Off')).toBeTruthy());
    expect(turnReminderOff).toHaveBeenCalledTimes(1);
  });

  it('shows the reminder as on when it was already turned on', async () => {
    jest.mocked(isReminderOn).mockResolvedValue(true);
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Every day at 8:30 pm')).toBeTruthy());
    expect(reminderSwitch(view).props.value).toBe(true);
  });

  it('says where to allow notifications when they are refused, and stays off', async () => {
    jest.mocked(turnReminderOn).mockResolvedValue('denied');
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Off')).toBeTruthy());

    await fireEvent(reminderSwitch(view), 'valueChange', true);

    await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent(/Settings/));
    expect(view.getByText('Off')).toBeTruthy();
    expect(reminderSwitch(view).props.value).toBe(false);
  });

  it('says so when the reminder could not be changed', async () => {
    jest.mocked(turnReminderOn).mockRejectedValue(new Error('boom'));
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Off')).toBeTruthy());

    await fireEvent(reminderSwitch(view), 'valueChange', true);

    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent(
        'Could not change the reminder. Please try again.',
      ),
    );
  });

  it("logs out: cancels this phone's reminder, then ends the session", async () => {
    const calls: string[] = [];
    jest.mocked(turnReminderOff).mockImplementation(async () => void calls.push('reminder'));
    jest.mocked(endSession).mockImplementation(async () => void calls.push('session'));
    const { view } = await setup();

    await fireEvent.press(view.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(calls).toEqual(['reminder', 'session']));
  });

  it('still logs out when the reminder cannot be cancelled', async () => {
    jest.mocked(turnReminderOff).mockRejectedValue(new Error('no permission'));
    const { view } = await setup();

    await fireEvent.press(view.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(endSession).toHaveBeenCalledTimes(1));
  });

  it('goes back and opens the name editor', async () => {
    const { view, onBack, onEdit } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    await fireEvent.press(view.getByRole('button', { name: 'Edit profile' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
