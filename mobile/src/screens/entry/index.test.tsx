import { fireEvent, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import {
  addJournalReply,
  deleteJournalReply,
  getJournalEntry,
  setJournalLove,
} from '@/api/journal';
import { at, journalDetail, photo } from '@/test-utils/journal';
import { renderScreen } from '@/test-utils/render-screen';

import { EntryScreen } from '.';

jest.mock('@/api/journal', () => ({
  getJournalEntry: jest.fn(),
  setJournalLove: jest.fn(),
  addJournalReply: jest.fn(),
  deleteJournalReply: jest.fn(),
}));

const kabirReply = {
  id: 'r1',
  body: 'Best day in ages. Same time next month?',
  createdAt: at(1, 5, 18, 0),
  author: { id: 'u-kabir', name: 'Kabir' },
  isMine: false,
};
const myReply = {
  id: 'r2',
  body: 'Yes please!',
  createdAt: at(1, 5, 19, 0),
  author: { id: 'me', name: 'Aria' },
  isMine: true,
};

const memory = journalDetail({
  id: 'e1',
  type: 'memory',
  emotion: 'joy',
  title: 'Beach day with Kabir',
  body: 'We stayed until the sun went down.',
  createdAt: at(1, 5),
  photos: [photo('a'), photo('b'), photo('c')],
  photoCount: 3,
  sharedWith: [{ id: 'u-kabir', name: 'Kabir' }],
  loves: { count: 1, mine: false },
  replyCount: 1,
  replies: [kabirReply],
});

const sharedWithMe = journalDetail({
  id: 'e2',
  type: 'note',
  title: 'A hard week',
  body: 'It has been a lot.',
  isMine: false,
  owner: { id: 'u-kabir', name: 'Kabir' },
  sharedMessage: 'Thought of you.',
  replies: [kabirReply, myReply],
  replyCount: 2,
});

const setup = async (entry = memory) => {
  jest.mocked(getJournalEntry).mockResolvedValue(entry);
  const handlers = { onBack: jest.fn(), onEdit: jest.fn(), onShare: jest.fn() };
  const view = await renderScreen(<EntryScreen entryId={entry.id} {...handlers} />);
  await waitFor(() => expect(view.getByRole('header', { name: entry.title })).toBeTruthy());
  return { view, ...handlers };
};

beforeEach(() => {
  for (const fn of [getJournalEntry, setJournalLove, addJournalReply, deleteJournalReply]) {
    jest.mocked(fn).mockReset();
  }
  jest.mocked(setJournalLove).mockResolvedValue({ count: 2, mine: true });
  jest.mocked(addJournalReply).mockResolvedValue({ ...myReply, id: 'r3' });
  jest.mocked(deleteJournalReply).mockResolvedValue(undefined);
});

describe('EntryScreen, the owner’s view', () => {
  it('shows the memory: photos, title, words, what Kabir said, and who it is shared with', async () => {
    const { view } = await setup();
    expect(view.getByText(/^Memory · \w{3} \d{1,2} \w{3}$/)).toBeTruthy();
    expect(view.getByText('We stayed until the sun went down.')).toBeTruthy();
    expect(view.getByLabelText('Photo 1 of 3')).toBeTruthy();
    expect(view.getByText('Best day in ages. Same time next month?')).toBeTruthy();
    expect(view.getByText('Kabir')).toBeTruthy();
    expect(view.getByText('Shared with Kabir')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Love · 1' })).toBeTruthy();
  });

  it('has a dot for each photo', async () => {
    const { view } = await setup();
    expect(
      view.getByRole('button', { name: 'Show photo 1' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
    await fireEvent.press(view.getByRole('button', { name: 'Show photo 3' }));
    expect(
      view.getByRole('button', { name: 'Show photo 3' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      view.getByRole('button', { name: 'Show photo 1' }).props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('opens the editor and the share screen', async () => {
    const { view, onEdit, onShare, onBack } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Edit entry' }));
    expect(onEdit).toHaveBeenCalledWith('e1');
    await fireEvent.press(view.getByRole('button', { name: 'Share entry' }));
    await fireEvent.press(view.getByRole('button', { name: 'Share' }));
    expect(onShare).toHaveBeenCalledTimes(2);
    expect(onShare).toHaveBeenLastCalledWith('e1');
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('loves it, and the count follows', async () => {
    const { view } = await setup();
    jest.mocked(getJournalEntry).mockResolvedValue({ ...memory, loves: { count: 2, mine: true } });
    await fireEvent.press(view.getByRole('button', { name: 'Love · 1' }));
    expect(setJournalLove).toHaveBeenCalledWith('e1', true);
    await waitFor(() => expect(view.getByRole('button', { name: 'Loved · 2' })).toBeTruthy());

    jest.mocked(setJournalLove).mockResolvedValue({ count: 1, mine: false });
    jest.mocked(getJournalEntry).mockResolvedValue(memory);
    await fireEvent.press(view.getByRole('button', { name: 'Loved · 2' }));
    expect(setJournalLove).toHaveBeenLastCalledWith('e1', false);
    await waitFor(() => expect(view.getByRole('button', { name: 'Love · 1' })).toBeTruthy());
  });

  it('says "Love" with no number when nobody has', async () => {
    const { view } = await setup({ ...memory, loves: { count: 0, mine: false } });
    expect(view.getByRole('button', { name: 'Love' })).toBeTruthy();
  });

  it('writes a reply', async () => {
    const { view } = await setup();
    expect(view.queryByLabelText('Your reply')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Reply' }));
    expect(view.getByRole('button', { name: 'Send reply' }).props.accessibilityState).toMatchObject(
      { disabled: true },
    );

    await fireEvent.changeText(view.getByLabelText('Your reply'), '  Same time! ');
    jest.mocked(getJournalEntry).mockResolvedValue({
      ...memory,
      replies: [kabirReply, { ...myReply, id: 'r3', body: 'Same time!' }],
      replyCount: 2,
    });
    await fireEvent.press(view.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(addJournalReply).toHaveBeenCalledWith('e1', '  Same time! '));
    await waitFor(() => expect(view.getByText('Same time!')).toBeTruthy());
    expect(view.queryByLabelText('Your reply')).toBeNull(); // the composer closed
  });

  it('keeps what was typed when a reply cannot be sent', async () => {
    jest.mocked(addJournalReply).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 404,
        code: 'JOURNAL_NOT_FOUND',
        message: 'Entry not found',
      }),
    );
    const { view } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Reply' }));
    await fireEvent.changeText(view.getByLabelText('Your reply'), 'Hello');
    await fireEvent.press(view.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(view.getByText('Entry not found')).toBeTruthy());
    expect(view.getByLabelText('Your reply').props.value).toBe('Hello');
  });

  it('can delete any reply on its own entry', async () => {
    const { view } = await setup({ ...memory, replies: [kabirReply, myReply], replyCount: 2 });
    expect(view.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
    jest
      .mocked(getJournalEntry)
      .mockResolvedValue({ ...memory, replies: [myReply], replyCount: 1 });
    await fireEvent.press(view.getAllByRole('button', { name: 'Delete' })[0]);
    expect(deleteJournalReply).toHaveBeenCalledWith('e1', 'r1');
    await waitFor(() =>
      expect(view.queryByText('Best day in ages. Same time next month?')).toBeNull(),
    );
  });

  it('says when an entry is private, and works without photos', async () => {
    const { view } = await setup(
      journalDetail({ id: 'e3', title: 'Quiet night', photos: [], sharedWith: [] }),
    );
    expect(view.getByText('Private to you')).toBeTruthy();
    expect(view.getByText(/^Note · \w{3} \d{1,2} \w{3}, \d{1,2}:\d{2} ?[ap]m$/)).toBeTruthy();
    expect(view.queryByRole('button', { name: /^Show photo/ })).toBeNull();
  });
});

describe('EntryScreen, an entry shared with the person', () => {
  it('shows who sent it and what they said, and offers no editing or sharing', async () => {
    const { view } = await setup(sharedWithMe);
    expect(view.getByText('From Kabir')).toBeTruthy();
    expect(view.getByText('Thought of you.')).toBeTruthy();
    expect(view.getByText('It has been a lot.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Edit entry' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Share entry' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Share' })).toBeNull();
  });

  it('can love it and reply, and delete only their own reply', async () => {
    const { view } = await setup(sharedWithMe);
    expect(view.getByText('You')).toBeTruthy(); // their own reply is "You"
    expect(view.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);

    await fireEvent.press(view.getByRole('button', { name: 'Love' }));
    expect(setJournalLove).toHaveBeenCalledWith('e2', true);
    await fireEvent.press(view.getByRole('button', { name: 'Reply' }));
    await fireEvent.changeText(view.getByLabelText('Your reply'), 'Thank you');
    await fireEvent.press(view.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(addJournalReply).toHaveBeenCalledWith('e2', 'Thank you'));
  });
});

describe('EntryScreen, when it cannot be shown', () => {
  it('says it is gone when it was deleted or unshared', async () => {
    jest.mocked(getJournalEntry).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 404,
        code: 'JOURNAL_NOT_FOUND',
        message: 'Entry not found',
      }),
    );
    const onBack = jest.fn();
    const view = await renderScreen(
      <EntryScreen entryId="e9" onBack={onBack} onEdit={jest.fn()} onShare={jest.fn()} />,
    );
    await waitFor(() => expect(view.getByText(/^This entry is no longer here/)).toBeTruthy());
    expect(view.queryByRole('button', { name: 'Try again' })).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('offers a retry for a connection problem', async () => {
    jest
      .mocked(getJournalEntry)
      .mockRejectedValueOnce(
        new ApiError({ kind: 'network', code: 'NETWORK_ERROR', message: 'Offline.' }),
      )
      .mockResolvedValueOnce(memory);
    const view = await renderScreen(
      <EntryScreen entryId="e1" onBack={jest.fn()} onEdit={jest.fn()} onShare={jest.fn()} />,
    );
    await waitFor(() => expect(view.getByText('Offline.')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(view.getByRole('header', { name: 'Beach day with Kabir' })).toBeTruthy(),
    );
  });
});
