import { fireEvent, waitFor } from '@testing-library/react-native';

import { createEntry, listEntries, updateEntry } from '@/api/entries';
import { ApiError } from '@/api/errors';
import type { Entry } from '@/api/schemas/entry';
import { renderScreen } from '@/test-utils/render-screen';
import { localDate } from '@/utils/local-date';

import { LogMoodScreen } from '.';

jest.mock('@/api/entries', () => ({
  createEntry: jest.fn(),
  listEntries: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  getEntryStats: jest.fn(),
}));

const today = localDate();
const existing: Entry = {
  id: 'e1',
  emotion: 'joy',
  intensity: 4,
  tags: ['Friends', 'Music'],
  note: 'Coffee with Sam',
  date: today,
  createdAt: new Date(2026, 8, 30, 20, 42).toISOString(),
  updatedAt: new Date(2026, 8, 30, 20, 42).toISOString(),
};

const setup = async (props: { entryId?: string } = {}) => {
  const handlers = { onBack: jest.fn(), onSaved: jest.fn() };
  const view = await renderScreen(<LogMoodScreen {...props} {...handlers} />);
  return { view, ...handlers };
};

beforeEach(() => {
  for (const fn of [createEntry, listEntries, updateEntry]) jest.mocked(fn).mockReset();
  jest.mocked(listEntries).mockResolvedValue([existing]);
});

describe('LogMoodScreen: a new entry', () => {
  it('asks how you feel and cannot be saved before an emotion is chosen', async () => {
    const { view } = await setup();
    expect(view.getByText('How are you feeling?')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Save entry' }).props.accessibilityState).toMatchObject(
      {
        disabled: true,
      },
    );
  });

  it('logs the emotion with its strength, tags and note, then moves on', async () => {
    jest.mocked(createEntry).mockResolvedValue({ ...existing, emotion: 'calm', intensity: 5 });
    const { view, onSaved } = await setup();

    await fireEvent.press(view.getByRole('radio', { name: 'Calm' }));
    expect(view.getByRole('header', { name: 'Calm' })).toBeTruthy();
    await fireEvent.press(view.getByRole('radio', { name: '5 of 5, Very strong' }));
    expect(view.getByText('Very strong')).toBeTruthy();
    await fireEvent.press(view.getByRole('checkbox', { name: 'Sleep' }));
    await fireEvent.press(view.getByRole('checkbox', { name: 'Food' }));
    await fireEvent.press(view.getByRole('checkbox', { name: 'Food' })); // and off again
    await fireEvent.changeText(view.getByLabelText('Note'), '  slept well  ');
    await fireEvent.press(view.getByRole('button', { name: 'Save entry' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(createEntry).toHaveBeenCalledWith({
      emotion: 'calm',
      intensity: 5,
      tags: ['Sleep'],
      note: 'slept well',
      date: today,
    });
  });

  it('starts at Moderate strength', async () => {
    const { view } = await setup();
    expect(view.getByText('Moderate')).toBeTruthy();
  });

  it('keeps the draft and says why when saving fails', async () => {
    jest.mocked(createEntry).mockRejectedValue(
      new ApiError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Check your connection and try again.',
      }),
    );
    const { view, onSaved } = await setup();
    await fireEvent.press(view.getByRole('radio', { name: 'Sad' }));
    await fireEvent.changeText(view.getByLabelText('Note'), 'a long day');
    await fireEvent.press(view.getByRole('button', { name: 'Save entry' }));

    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent(/Could not reach the server/),
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(view.getByLabelText('Note').props.value).toBe('a long day');
    expect(view.getByRole('radio', { name: 'Sad' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('goes back', async () => {
    const { view, onBack } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('LogMoodScreen: adding details to an entry', () => {
  it("shows the entry's own emotion, time, strength, tags and note, without an emotion picker", async () => {
    const { view } = await setup({ entryId: 'e1' });
    await waitFor(() => expect(view.getByRole('header', { name: 'Joy' })).toBeTruthy());
    expect(view.getByText(/^Today · 8:42\s?pm$/)).toBeTruthy();
    expect(view.getByText('Strong')).toBeTruthy();
    expect(view.getByRole('checkbox', { name: 'Friends' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(view.getByRole('checkbox', { name: 'Work' }).props.accessibilityState).toMatchObject({
      checked: false,
    });
    expect(view.getByLabelText('Note').props.value).toBe('Coffee with Sam');
    expect(view.queryByRole('radio', { name: 'Calm' })).toBeNull();
  });

  it('saves the changes to that entry, not a new one', async () => {
    jest.mocked(updateEntry).mockResolvedValue({ ...existing, intensity: 2 });
    const { view, onSaved } = await setup({ entryId: 'e1' });
    await waitFor(() => expect(view.getByRole('header', { name: 'Joy' })).toBeTruthy());

    await fireEvent.press(view.getByRole('radio', { name: '2 of 5, Mild' }));
    await fireEvent.press(view.getByRole('button', { name: 'Save entry' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(updateEntry).toHaveBeenCalledWith('e1', {
      intensity: 2,
      tags: ['Friends', 'Music'],
      note: 'Coffee with Sam',
    });
    expect(createEntry).not.toHaveBeenCalled();
  });

  it('says so when the entry is gone', async () => {
    jest.mocked(listEntries).mockResolvedValue([]);
    const { view } = await setup({ entryId: 'gone' });
    await waitFor(() => expect(view.getByText('This check-in is no longer here.')).toBeTruthy());
  });

  it('offers a retry when the entries cannot be loaded', async () => {
    jest
      .mocked(listEntries)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([existing]);
    const { view } = await setup({ entryId: 'e1' });
    await waitFor(() => expect(view.getByText('Could not load this check-in.')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(view.getByRole('header', { name: 'Joy' })).toBeTruthy());
  });
});
