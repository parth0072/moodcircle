import { fireEvent, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { getJournalEntry, listSharePeople, setJournalShares } from '@/api/journal';
import { at, journalDetail, photo, sharePerson } from '@/test-utils/journal';
import { renderScreen } from '@/test-utils/render-screen';

import { ShareEntryScreen } from '.';

jest.mock('@/api/journal', () => ({
  getJournalEntry: jest.fn(),
  listSharePeople: jest.fn(),
  setJournalShares: jest.fn(),
}));

const kabir = sharePerson();
const mei = sharePerson({ id: 'u-mei', name: 'Mei' });
const jonah = sharePerson({
  id: 'u-jonah',
  name: 'Jonah',
  groups: [
    { id: 'g1', name: 'Sunday Circle' },
    { id: 'g2', name: 'Book Club' },
  ],
});

const beach = journalDetail({
  id: 'e1',
  type: 'memory',
  emotion: 'joy',
  title: 'Beach day with Kabir',
  createdAt: at(1, 5),
  photos: [photo('a'), photo('b'), photo('c')],
  photoCount: 3,
});

const setup = async (entry = beach) => {
  jest.mocked(getJournalEntry).mockResolvedValue(entry);
  const handlers = { onBack: jest.fn(), onDone: jest.fn() };
  const view = await renderScreen(<ShareEntryScreen entryId={entry.id} {...handlers} />);
  await waitFor(() => expect(view.getByText('Kabir')).toBeTruthy());
  return { view, ...handlers };
};
const person = (view: Awaited<ReturnType<typeof setup>>['view'], name: string) =>
  view.getByRole('checkbox', { name: new RegExp(`^${name}`) });

beforeEach(() => {
  for (const fn of [getJournalEntry, listSharePeople, setJournalShares])
    jest.mocked(fn).mockReset();
  jest.mocked(listSharePeople).mockResolvedValue([kabir, mei, jonah]);
  jest.mocked(setJournalShares).mockResolvedValue([]);
});

describe('ShareEntryScreen', () => {
  it('shows the entry, and the people from your groups with nobody ticked', async () => {
    const { view } = await setup();
    expect(view.getByText('Share with a friend')).toBeTruthy();
    expect(view.getByText('Beach day with Kabir')).toBeTruthy();
    expect(view.getByText(/^Joy · 3 photos · /)).toBeTruthy();
    expect(view.getByText('0 selected')).toBeTruthy();

    expect(person(view, 'Kabir').props.accessibilityState).toMatchObject({ checked: false });
    expect(view.getAllByText('In Sunday Circle')).toHaveLength(2); // Kabir and Mei
    expect(view.getByText('In Sunday Circle and 1 more group')).toBeTruthy();
    const send = view.getByRole('button', { name: 'Pick someone to share with' });
    expect(send.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('sends to the people ticked, with the message and the photos', async () => {
    const { view, onDone } = await setup();
    await fireEvent.press(person(view, 'Kabir'));
    await fireEvent.press(person(view, 'Mei'));
    expect(view.getByText('2 selected')).toBeTruthy();
    await fireEvent.changeText(view.getByLabelText('Add a message'), '  Thought of you today… ');
    await fireEvent.press(view.getByRole('button', { name: 'Send to 2 friends' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(setJournalShares).toHaveBeenCalledWith('e1', {
      recipientIds: ['u-kabir', 'u-mei'],
      message: '  Thought of you today… ',
      includePhotos: true,
    });
  });

  it('says "1 friend" for one, and unticks again', async () => {
    const { view } = await setup();
    await fireEvent.press(person(view, 'Mei'));
    expect(view.getByRole('button', { name: 'Send to 1 friend' })).toBeTruthy();
    await fireEvent.press(person(view, 'Mei'));
    expect(view.getByRole('button', { name: 'Pick someone to share with' })).toBeTruthy();
  });

  it('can leave the photos out', async () => {
    const { view } = await setup();
    expect(view.getByText('All 3 photos will be sent')).toBeTruthy();
    await fireEvent(view.getByLabelText('Include photos'), 'valueChange', false);
    expect(view.getByText('Only your words will be sent')).toBeTruthy();
    await fireEvent.press(person(view, 'Kabir'));
    await fireEvent.press(view.getByRole('button', { name: 'Send to 1 friend' }));
    await waitFor(() =>
      expect(setJournalShares).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({ includePhotos: false }),
      ),
    );
  });

  it('does not ask about photos when there are none', async () => {
    const { view } = await setup(
      journalDetail({ id: 'e5', title: 'A note', photos: [], photoCount: 0 }),
    );
    expect(view.queryByLabelText('Include photos')).toBeNull();
  });

  it('starts with the people it is already shared with ticked, and "Stop sharing" when all are unticked', async () => {
    const shared = { ...beach, sharedWith: [{ id: 'u-kabir', name: 'Kabir' }] };
    const { view, onDone } = await setup(shared);
    expect(person(view, 'Kabir').props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByText('1 selected')).toBeTruthy();

    await fireEvent.press(person(view, 'Kabir'));
    const stop = view.getByRole('button', { name: 'Stop sharing' });
    expect(stop.props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(stop);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(setJournalShares).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ recipientIds: [] }),
    );
  });

  it('keeps the choices and says why when sharing fails', async () => {
    jest.mocked(setJournalShares).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 403,
        code: 'NOT_IN_SHARED_GROUP',
        message: 'You can only share with people who are in a group with you',
      }),
    );
    const { view, onDone } = await setup();
    await fireEvent.press(person(view, 'Kabir'));
    await fireEvent.press(view.getByRole('button', { name: 'Send to 1 friend' }));
    await waitFor(() =>
      expect(
        view.getByText('You can only share with people who are in a group with you'),
      ).toBeTruthy(),
    );
    expect(onDone).not.toHaveBeenCalled();
    expect(person(view, 'Kabir').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('explains when there is nobody to share with yet', async () => {
    jest.mocked(listSharePeople).mockResolvedValue([]);
    jest.mocked(getJournalEntry).mockResolvedValue(beach);
    const view = await renderScreen(
      <ShareEntryScreen entryId="e1" onBack={jest.fn()} onDone={jest.fn()} />,
    );
    await waitFor(() => expect(view.getByText('No one to share with yet')).toBeTruthy());
    expect(view.getByText(/in a group with you/)).toBeTruthy();
  });

  it('offers a retry when the people cannot be loaded', async () => {
    jest
      .mocked(listSharePeople)
      .mockRejectedValueOnce(
        new ApiError({ kind: 'network', code: 'NETWORK_ERROR', message: 'Offline.' }),
      )
      .mockResolvedValueOnce([kabir]);
    jest.mocked(getJournalEntry).mockResolvedValue(beach);
    const view = await renderScreen(
      <ShareEntryScreen entryId="e1" onBack={jest.fn()} onDone={jest.fn()} />,
    );
    await waitFor(() => expect(view.getByText('Offline.')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(view.getByText('Kabir')).toBeTruthy());
  });

  it('goes back', async () => {
    const { view, onBack } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
