import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { listEntries } from '@/api/entries';
import type { Entry } from '@/api/schemas/entry';
import { renderScreen } from '@/test-utils/render-screen';
import { addDays, localDate } from '@/utils/local-date';

import { InsightsScreen } from '.';

jest.mock('@/api/entries', () => ({
  createEntry: jest.fn(),
  listEntries: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  getEntryStats: jest.fn(),
}));

const today = localDate();
const daysAgo = (n: number) => addDays(today, -n);
const entry = (emotion: Entry['emotion'], ago: number): Entry => ({
  id: `${emotion}-${ago}`,
  emotion,
  intensity: 3,
  tags: [],
  note: '',
  date: daysAgo(ago),
  createdAt: `${daysAgo(ago)}T12:00:00.000Z`,
  updatedAt: `${daysAgo(ago)}T12:00:00.000Z`,
});

const open = (onBack = jest.fn()) => renderScreen(<InsightsScreen onBack={onBack} />);

beforeEach(() => {
  jest.mocked(listEntries).mockReset();
});

describe('InsightsScreen', () => {
  it('shows a spinner while loading, then a gentle empty state', async () => {
    let finish!: (rows: Entry[]) => void;
    jest.mocked(listEntries).mockReturnValue(
      new Promise<Entry[]>((resolve) => {
        finish = resolve;
      }),
    );
    const view = await open();
    expect(view.getByLabelText('Loading your moods')).toBeTruthy();

    await act(async () => finish([]));

    await waitFor(() =>
      expect(
        view.getByText('No check-ins yet this week. Log how you feel to see your moods here.'),
      ).toBeTruthy(),
    );
    expect(view.getByText('Check in on a few more days to see it')).toBeTruthy();
    expect(view.queryByRole('summary')).toBeNull(); // no bubbles without a single check-in
  });

  it('sums up the week: sentence, bubbles, the seven days and the balance', async () => {
    jest
      .mocked(listEntries)
      .mockResolvedValue([entry('joy', 2), entry('calm', 1), entry('joy', 0)]);
    const view = await open();

    await waitFor(() =>
      expect(
        view.getByText('You checked in 3 of 7 days this week. Joy showed up most.'),
      ).toBeTruthy(),
    );
    expect(view.getByRole('summary', { name: 'Joy, 2 days. Calm, 1 day' })).toBeTruthy();
    expect(view.getAllByLabelText(/: no check-in$/)).toHaveLength(4);
    expect(view.getByLabelText(/, today: Joy$/)).toBeTruthy();
    // joy, calm, joy: two one-step swings, so 100 - 1 x 25.
    expect(view.getByLabelText(/^Your balance score: 75\./)).toBeTruthy();
    expect(view.getByText('Your first week of data')).toBeTruthy();
  });

  it('compares this week with the one before', async () => {
    jest.mocked(listEntries).mockResolvedValue([
      entry('joy', 12), // last week swung from joy to anger: the widest swing, score 0
      entry('anger', 11),
      entry('calm', 2), // this week stayed level: score 100
      entry('calm', 1),
    ]);
    const view = await open();

    await waitFor(() => expect(view.getByText('Steadier than last week')).toBeTruthy());
    expect(view.getByLabelText(/^Your balance score: 100\./)).toBeTruthy();
  });

  it('switches to the month, asking for both periods in one request', async () => {
    jest
      .mocked(listEntries)
      .mockResolvedValue([entry('joy', 20), entry('calm', 3), entry('joy', 0)]);
    const view = await open();
    await waitFor(() => expect(listEntries).toHaveBeenCalledWith(daysAgo(13), today));

    await fireEvent.press(view.getByRole('radio', { name: 'Month' }));

    await waitFor(() => expect(listEntries).toHaveBeenCalledWith(daysAgo(59), today));
    await waitFor(() =>
      expect(
        view.getByText('You checked in 3 days this month. Joy and Calm led the way.'),
      ).toBeTruthy(),
    );
    expect(view.getByRole('radio', { name: 'Month' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(view.getByRole('radio', { name: 'Week' }).props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('offers a retry when the moods cannot be loaded', async () => {
    jest.mocked(listEntries).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    const view = await open();
    await waitFor(() => expect(view.getByText('Could not load your moods.')).toBeTruthy());

    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(view.getByText(/^No check-ins yet this week/)).toBeTruthy());
  });

  it('goes back', async () => {
    jest.mocked(listEntries).mockResolvedValue([]);
    const onBack = jest.fn();
    const view = await open(onBack);
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
