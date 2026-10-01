import { fireEvent, waitFor } from '@testing-library/react-native';

import { listJournal } from '@/api/journal';
import { ApiError } from '@/api/errors';
import { at, journalEntry, photo } from '@/test-utils/journal';
import { renderScreen } from '@/test-utils/render-screen';

import { JournalScreen } from '.';

jest.mock('@/api/journal', () => ({ listJournal: jest.fn() }));

const page = (entries: ReturnType<typeof journalEntry>[], nextBefore: string | null = null) => ({
  entries,
  nextBefore,
});

const beach = journalEntry({
  id: 'm1',
  type: 'memory',
  emotion: 'joy',
  title: 'Beach day with Kabir',
  excerpt: '',
  createdAt: at(1, 5),
  photos: [photo('a'), photo('b'), photo('c')],
  photoCount: 3,
  sharedWith: [{ id: 'u-kabir', name: 'Kabir' }],
});
const sleepless = journalEntry({ id: 'n1', title: 'Couldn’t sleep again' });
const hike = journalEntry({
  id: 'm2',
  type: 'memory',
  emotion: 'calm',
  title: 'First hike of autumn',
  excerpt: '',
  createdAt: at(1, 3),
  photos: [photo('d')],
  photoCount: 1,
});

const setup = async () => {
  const handlers = { onBack: jest.fn(), onWrite: jest.fn(), onOpen: jest.fn() };
  const view = await renderScreen(<JournalScreen {...handlers} />);
  return { view, ...handlers };
};

beforeEach(() => {
  jest.mocked(listJournal).mockReset();
  jest.mocked(listJournal).mockResolvedValue(page([beach, sleepless, hike]));
});

describe('JournalScreen', () => {
  it('shows the title and the entries in the design’s three shapes', async () => {
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Beach day with Kabir')).toBeTruthy());
    expect(view.getByRole('header', { name: 'Journal' })).toBeTruthy();
    expect(view.getByText('Notes for hard days, memories for good ones.')).toBeTruthy();

    // big picture: the memory with several photos, who it is shared with
    expect(view.getByText(/^Memory · .* · 3 photos$/)).toBeTruthy();
    expect(view.getByText('Shared with Kabir')).toBeTruthy();
    // a note: its excerpt, and "Private" for a screen reader
    expect(view.getByText(/Kept replaying the meeting/)).toBeTruthy();
    expect(view.getByText(/^Note · /)).toBeTruthy();
    expect(
      view.getByRole('button', { name: /^Couldn’t sleep again\. Sad note\..*\. Private$/ }),
    ).toBeTruthy();
    // a thumbnail: just the day, and "Private"
    expect(view.getByText('First hike of autumn')).toBeTruthy();
  });

  it('opens an entry, and writes a new one', async () => {
    const { view, onOpen, onWrite, onBack } = await setup();
    await waitFor(() => expect(view.getByText('Beach day with Kabir')).toBeTruthy());
    await fireEvent.press(view.getByText('Couldn’t sleep again'));
    expect(onOpen).toHaveBeenCalledWith('n1');
    await fireEvent.press(view.getByText('Beach day with Kabir'));
    expect(onOpen).toHaveBeenLastCalledWith('m1');
    await fireEvent.press(view.getByRole('button', { name: 'Write it down' }));
    expect(onWrite).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('marks what a friend shared with you', async () => {
    jest.mocked(listJournal).mockResolvedValue(
      page([
        journalEntry({
          id: 'n2',
          isMine: false,
          title: 'A hard week',
          owner: { id: 'u-kabir', name: 'Kabir' },
        }),
      ]),
    );
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('A hard week')).toBeTruthy());
    expect(view.getByText('From Kabir')).toBeTruthy();
  });

  it('filters to notes or memories', async () => {
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Beach day with Kabir')).toBeTruthy());
    expect(listJournal).toHaveBeenLastCalledWith({ type: undefined, q: undefined }, undefined);
    expect(view.getByRole('radio', { name: 'All' }).props.accessibilityState).toMatchObject({
      checked: true,
    });

    await fireEvent.press(view.getByRole('radio', { name: 'Notes' }));
    await waitFor(() =>
      expect(listJournal).toHaveBeenLastCalledWith({ type: 'note', q: undefined }, undefined),
    );
    expect(view.getByRole('radio', { name: 'Notes' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    await fireEvent.press(view.getByRole('radio', { name: 'Memories' }));
    await waitFor(() =>
      expect(listJournal).toHaveBeenLastCalledWith({ type: 'memory', q: undefined }, undefined),
    );
  });

  it('searches once the person stops typing, and can be closed', async () => {
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Beach day with Kabir')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Search entries' }));
    expect(view.queryByText('Notes for hard days, memories for good ones.')).toBeNull();

    jest.mocked(listJournal).mockResolvedValue(page([hike]));
    await fireEvent.changeText(view.getByLabelText('Search your journal'), ' hike ');
    await waitFor(() =>
      expect(listJournal).toHaveBeenLastCalledWith({ type: undefined, q: 'hike' }, undefined),
    );
    await waitFor(() => expect(view.queryByText('Beach day with Kabir')).toBeNull());
    expect(view.getByText('First hike of autumn')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Close search' }));
    expect(view.getByText('Notes for hard days, memories for good ones.')).toBeTruthy();
    await waitFor(() =>
      expect(listJournal).toHaveBeenLastCalledWith({ type: undefined, q: undefined }, undefined),
    );
  });

  it('says so when a search finds nothing', async () => {
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Beach day with Kabir')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Search entries' }));
    jest.mocked(listJournal).mockResolvedValue(page([]));
    await fireEvent.changeText(view.getByLabelText('Search your journal'), 'zebra');
    await waitFor(() => expect(view.getByText('Nothing found')).toBeTruthy());
    expect(view.getByText('No entry matches “zebra”.')).toBeTruthy();
  });

  it('loads older entries a page at a time', async () => {
    jest
      .mocked(listJournal)
      .mockResolvedValueOnce(page([beach], at(1, 5)))
      .mockResolvedValueOnce(page([hike]));
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Beach day with Kabir')).toBeTruthy());
    expect(view.queryByText('First hike of autumn')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Show older entries' }));
    await waitFor(() => expect(view.getByText('First hike of autumn')).toBeTruthy());
    expect(listJournal).toHaveBeenLastCalledWith({ type: undefined, q: undefined }, at(1, 5));
    expect(view.queryByRole('button', { name: 'Show older entries' })).toBeNull(); // no more pages
  });

  it('invites the first entry when the journal is empty, and says what a filter lacks', async () => {
    jest.mocked(listJournal).mockResolvedValue(page([]));
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Nothing here yet')).toBeTruthy());
    expect(
      view.getByText('Write a note for a hard day, or keep a memory of a good one.'),
    ).toBeTruthy();

    await fireEvent.press(view.getByRole('radio', { name: 'Memories' }));
    await waitFor(() =>
      expect(
        view.getByText('No memories yet. Keep one of a good day, with its photos.'),
      ).toBeTruthy(),
    );
  });

  it('offers a retry when the journal cannot be loaded', async () => {
    jest
      .mocked(listJournal)
      .mockRejectedValueOnce(
        new ApiError({ kind: 'network', code: 'NETWORK_ERROR', message: 'Offline.' }),
      );
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Offline.')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(view.getByText('Beach day with Kabir')).toBeTruthy());
  });
});
