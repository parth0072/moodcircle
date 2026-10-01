import { fireEvent, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import {
  createJournalEntry,
  deleteJournalEntry,
  getJournalEntry,
  updateJournalEntry,
  uploadJournalPhoto,
} from '@/api/journal';
import { journalDetail, photo } from '@/test-utils/journal';
import { renderScreen } from '@/test-utils/render-screen';
import { pickPhotos } from '@/utils/pick-photos';

import { WriteEntryScreen } from '.';

jest.mock('@/api/journal', () => ({
  createJournalEntry: jest.fn(),
  updateJournalEntry: jest.fn(),
  deleteJournalEntry: jest.fn(),
  getJournalEntry: jest.fn(),
  uploadJournalPhoto: jest.fn(),
}));
jest.mock('@/utils/pick-photos', () => ({ pickPhotos: jest.fn() }));

const picked = (n: number) => ({
  uri: `file:///cache/${n}.jpg`,
  width: 100,
  height: 100,
  mimeType: 'image/jpeg',
});

const setup = async (props: { entryId?: string; initialType?: 'note' | 'memory' } = {}) => {
  const handlers = {
    onClose: jest.fn(),
    onSaved: jest.fn(),
    onShare: jest.fn(),
    onChangeSharing: jest.fn(),
    onDeleted: jest.fn(),
  };
  const view = await renderScreen(<WriteEntryScreen {...props} {...handlers} />);
  return { view, ...handlers };
};
type View = Awaited<ReturnType<typeof setup>>['view'];

const write = async (view: View, title: string, body = '') => {
  await fireEvent.changeText(view.getByLabelText('Title'), title);
  if (body) await fireEvent.changeText(view.getByLabelText('Entry'), body);
};
const save = (view: View, name = 'Save note') => view.getByRole('button', { name });

beforeEach(() => {
  for (const fn of [
    createJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    getJournalEntry,
    uploadJournalPhoto,
    pickPhotos,
  ]) {
    jest.mocked(fn).mockReset();
  }
  jest.mocked(createJournalEntry).mockResolvedValue(journalDetail({ id: 'new1' }));
  jest.mocked(updateJournalEntry).mockResolvedValue(journalDetail());
  jest.mocked(deleteJournalEntry).mockResolvedValue(undefined);
});

describe('WriteEntryScreen, a new entry', () => {
  it('starts empty on a note, and will not save until there is a mood and a title', async () => {
    const { view } = await setup();
    expect(view.getByRole('radio', { name: 'Note' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(view.getByPlaceholderText('What is weighing on you?')).toBeTruthy();
    expect(save(view).props.accessibilityState).toMatchObject({ disabled: true });
    expect(view.getByText('Pick a mood and add a title to save.')).toBeTruthy();

    await write(view, 'Missing last summer');
    expect(save(view).props.accessibilityState).toMatchObject({ disabled: true }); // still no mood
    await fireEvent.press(view.getByRole('radio', { name: 'Sad' }));
    expect(save(view).props.accessibilityState).toMatchObject({ disabled: false });
    expect(view.queryByText('Pick a mood and add a title to save.')).toBeNull();
  });

  it('switches to a memory: the label and the question change', async () => {
    const { view } = await setup();
    await fireEvent.press(view.getByRole('radio', { name: 'Memory' }));
    expect(view.getByPlaceholderText('What do you want to remember?')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Save memory' })).toBeTruthy();
  });

  it('can start as a memory', async () => {
    const { view } = await setup({ initialType: 'memory' });
    expect(view.getByRole('radio', { name: 'Memory' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('saves a private note and goes back', async () => {
    const { view, onSaved, onShare } = await setup();
    await fireEvent.press(view.getByRole('radio', { name: 'Calm' }));
    await write(view, '  Slow Sunday ', ' Tea and rain. ');
    await fireEvent.press(save(view));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('new1'));
    expect(createJournalEntry).toHaveBeenCalledWith({
      type: 'note',
      emotion: 'calm',
      title: '  Slow Sunday ',
      body: ' Tea and rain. ',
      photoIds: [],
    });
    expect(onShare).not.toHaveBeenCalled();
  });

  it('adds a writing prompt on a new line', async () => {
    const { view } = await setup();
    await write(view, 'T', 'It was a long day.');
    await fireEvent.press(view.getByRole('button', { name: 'What happened?' }));
    expect(view.getByLabelText('Entry').props.value).toBe('It was a long day.\n\nWhat happened? ');
    await fireEvent.press(view.getByRole('button', { name: 'What would help right now?' }));
    expect(view.getByLabelText('Entry').props.value).toBe(
      'It was a long day.\n\nWhat happened?\n\nWhat would help right now? ',
    );
  });

  it('offers "Tell a friend" after a heavy mood, and goes on to choose friends', async () => {
    const { view, onSaved, onShare } = await setup();
    expect(view.queryByText('Heavy day? It can help to let someone close know.')).toBeNull();
    await fireEvent.press(view.getByRole('radio', { name: 'Worry' }));
    expect(view.getByText('Heavy day? It can help to let someone close know.')).toBeTruthy();
    await fireEvent.press(view.getByRole('radio', { name: 'Joy' }));
    expect(view.queryByText('Heavy day? It can help to let someone close know.')).toBeNull();
    await fireEvent.press(view.getByRole('radio', { name: 'Sad' }));

    await fireEvent.press(view.getByRole('button', { name: 'Tell a friend' }));
    expect(view.getByText('Choose who sees it next')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Tell a friend' })).toBeNull();

    await write(view, 'Rough week');
    await fireEvent.press(view.getByRole('button', { name: 'Next: choose friends' }));
    await waitFor(() => expect(onShare).toHaveBeenCalledWith('new1'));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('goes on to choose friends when the privacy switch is turned on', async () => {
    const { view, onShare } = await setup();
    expect(view.getByText('Only me')).toBeTruthy();
    await fireEvent(view.getByLabelText('Share with friends'), 'valueChange', true);
    expect(view.getByText('Share with friends')).toBeTruthy();
    await fireEvent.press(view.getByRole('radio', { name: 'Joy' }));
    await write(view, 'Good news');
    await fireEvent.press(view.getByRole('button', { name: 'Next: choose friends' }));
    await waitFor(() => expect(onShare).toHaveBeenCalledWith('new1'));
  });

  it('keeps the draft and says why when saving fails', async () => {
    jest.mocked(createJournalEntry).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Title must be 1–80 characters',
      }),
    );
    const { view, onSaved } = await setup();
    await fireEvent.press(view.getByRole('radio', { name: 'Calm' }));
    await write(view, 'Slow Sunday', 'Tea and rain.');
    await fireEvent.press(save(view));
    await waitFor(() => expect(view.getByText('Title must be 1–80 characters')).toBeTruthy());
    expect(onSaved).not.toHaveBeenCalled();
    expect(view.getByLabelText('Title').props.value).toBe('Slow Sunday');
    expect(view.getByLabelText('Entry').props.value).toBe('Tea and rain.');
  });

  it('closes at once when nothing was written, and asks first when something was', async () => {
    const first = await setup();
    await fireEvent.press(first.view.getByRole('button', { name: 'Close' }));
    expect(first.onClose).toHaveBeenCalledTimes(1);

    const { view, onClose } = await setup();
    await write(view, 'Half a thought');
    await fireEvent.press(view.getByRole('button', { name: 'Close' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(view.getByText('Discard what you wrote?')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Keep writing' }));
    expect(view.queryByText('Discard what you wrote?')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Close' }));
    await fireEvent.press(view.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('WriteEntryScreen, photos', () => {
  it('uploads a chosen photo, shows it, and saves its id', async () => {
    jest.mocked(pickPhotos).mockResolvedValue([picked(1)]);
    jest.mocked(uploadJournalPhoto).mockResolvedValue(photo('p1'));
    const { view, onSaved } = await setup({ initialType: 'memory' });
    await fireEvent.press(view.getByRole('radio', { name: 'Joy' }));
    await write(view, 'Beach day');

    await fireEvent.press(view.getByRole('button', { name: 'Add photo' }));
    await waitFor(() => expect(view.getByLabelText('Photo 1')).toBeTruthy());
    expect(pickPhotos).toHaveBeenCalledWith(6);
    expect(uploadJournalPhoto).toHaveBeenCalledWith(picked(1));

    await fireEvent.press(view.getByRole('button', { name: 'Save memory' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('new1'));
    expect(createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'memory', photoIds: ['p1'] }),
    );
  });

  it('does not save while a photo is still uploading', async () => {
    jest.mocked(pickPhotos).mockResolvedValue([picked(1)]);
    let finish: (p: ReturnType<typeof photo>) => void = () => undefined;
    jest.mocked(uploadJournalPhoto).mockImplementation(() => new Promise((r) => (finish = r)));
    const { view } = await setup();
    await fireEvent.press(view.getByRole('radio', { name: 'Joy' }));
    await write(view, 'Beach day');
    await fireEvent.press(view.getByRole('button', { name: 'Add photo' }));

    await waitFor(() => expect(view.getByLabelText('Uploading photo')).toBeTruthy());
    expect(save(view).props.accessibilityState).toMatchObject({ disabled: true });
    finish(photo('p1'));
    await waitFor(() =>
      expect(save(view).props.accessibilityState).toMatchObject({ disabled: false }),
    );
  });

  it('lets a failed upload be retried or removed, and blocks saving until then', async () => {
    jest.mocked(pickPhotos).mockResolvedValue([picked(1)]);
    jest
      .mocked(uploadJournalPhoto)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(photo('p1'));
    const { view } = await setup();
    await fireEvent.press(view.getByRole('radio', { name: 'Joy' }));
    await write(view, 'Beach day');
    await fireEvent.press(view.getByRole('button', { name: 'Add photo' }));

    await waitFor(() => expect(view.getByRole('button', { name: 'Retry upload' })).toBeTruthy());
    expect(view.getByText('A photo did not upload. Retry it or remove it to save.')).toBeTruthy();
    expect(save(view).props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(view.getByRole('button', { name: 'Retry upload' }));
    await waitFor(() =>
      expect(save(view).props.accessibilityState).toMatchObject({ disabled: false }),
    );
    expect(uploadJournalPhoto).toHaveBeenCalledTimes(2);
  });

  it('removes a photo, and hides "Add photo" when six are on', async () => {
    jest.mocked(pickPhotos).mockResolvedValue([1, 2, 3, 4, 5, 6].map(picked));
    jest.mocked(uploadJournalPhoto).mockImplementation(async (p) => photo(p.uri));
    const { view } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Add photo' }));
    await waitFor(() =>
      expect(view.getAllByRole('button', { name: 'Remove photo' })).toHaveLength(6),
    );
    expect(view.queryByRole('button', { name: 'Add photo' })).toBeNull();

    await fireEvent.press(view.getAllByRole('button', { name: 'Remove photo' })[0]);
    expect(view.getAllByRole('button', { name: 'Remove photo' })).toHaveLength(5);
    expect(view.getByRole('button', { name: 'Add photo' })).toBeTruthy();
  });

  it('says so when the photo library cannot be opened', async () => {
    jest.mocked(pickPhotos).mockRejectedValue(new Error('no'));
    const { view } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Add photo' }));
    await waitFor(() =>
      expect(view.getByText('Could not open your photos. Please try again.')).toBeTruthy(),
    );
  });
});

describe('WriteEntryScreen, an existing entry', () => {
  const existing = journalDetail({
    id: 'e9',
    type: 'memory',
    emotion: 'joy',
    title: 'Beach day',
    body: 'We stayed until sunset.',
    photos: [photo('a'), photo('b')],
    photoCount: 2,
  });

  it('loads it into the form and saves only as a change', async () => {
    jest.mocked(getJournalEntry).mockResolvedValue(existing);
    jest.mocked(updateJournalEntry).mockResolvedValue(existing);
    const { view, onSaved } = await setup({ entryId: 'e9' });
    await waitFor(() => expect(view.getByLabelText('Title').props.value).toBe('Beach day'));
    expect(getJournalEntry).toHaveBeenCalledWith('e9');
    expect(view.getByLabelText('Entry').props.value).toBe('We stayed until sunset.');
    expect(view.getByRole('radio', { name: 'Joy' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(view.getByRole('radio', { name: 'Memory' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(view.getAllByRole('button', { name: 'Remove photo' })).toHaveLength(2);

    await fireEvent.changeText(view.getByLabelText('Title'), 'Beach day with Kabir');
    await fireEvent.press(view.getAllByRole('button', { name: 'Remove photo' })[1]);
    await fireEvent.press(view.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('e9'));
    expect(updateJournalEntry).toHaveBeenCalledWith('e9', {
      type: 'memory',
      emotion: 'joy',
      title: 'Beach day with Kabir',
      body: 'We stayed until sunset.',
      photoIds: ['a'],
    });
    expect(createJournalEntry).not.toHaveBeenCalled();
  });

  it('shows a spinner while loading, and offers a retry when it cannot be loaded', async () => {
    let fail: (error: unknown) => void = () => undefined;
    jest
      .mocked(getJournalEntry)
      .mockImplementationOnce(() => new Promise((_resolve, reject) => (fail = reject)))
      .mockResolvedValueOnce(existing);
    const { view } = await setup({ entryId: 'e9' });
    expect(view.getByLabelText('Loading the entry')).toBeTruthy();

    fail(new ApiError({ kind: 'network', code: 'NETWORK_ERROR', message: 'Offline.' }));
    await waitFor(() => expect(view.getByText('Offline.')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(view.getByLabelText('Title').props.value).toBe('Beach day'));
  });

  it('closes without asking when nothing changed', async () => {
    jest.mocked(getJournalEntry).mockResolvedValue(existing);
    const { view, onClose } = await setup({ entryId: 'e9' });
    await waitFor(() => expect(view.getByLabelText('Title').props.value).toBe('Beach day'));
    await fireEvent.press(view.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('deletes it after a confirmation', async () => {
    jest.mocked(getJournalEntry).mockResolvedValue(existing);
    const { view, onDeleted } = await setup({ entryId: 'e9' });
    await waitFor(() => expect(view.getByLabelText('Title').props.value).toBe('Beach day'));

    await fireEvent.press(view.getByRole('button', { name: 'Delete entry' }));
    expect(deleteJournalEntry).not.toHaveBeenCalled();
    expect(view.getByText(/^Delete this entry\?/)).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Keep it' }));
    expect(view.getByRole('button', { name: 'Delete entry' })).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Delete entry' }));
    await fireEvent.press(view.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(deleteJournalEntry).toHaveBeenCalledWith('e9');
  });

  it('shows who an entry is shared with, and lets that be changed without saving first', async () => {
    jest.mocked(getJournalEntry).mockResolvedValue({
      ...existing,
      sharedWith: [{ id: 'u-kabir', name: 'Kabir' }],
    });
    const { view, onChangeSharing } = await setup({ entryId: 'e9' });
    await waitFor(() => expect(view.getByText('Shared with Kabir')).toBeTruthy());
    expect(view.queryByLabelText('Share with friends')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Change' }));
    expect(onChangeSharing).toHaveBeenCalledWith('e9');
  });
});
