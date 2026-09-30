import { fireEvent, waitFor } from '@testing-library/react-native';

import { listEntries } from '@/api/entries';
import { ApiError } from '@/api/errors';
import { listGroupOverview, postGroupMood } from '@/api/groups';
import type { Entry } from '@/api/schemas/entry';
import { feedItem, overviewGroup } from '@/test-utils/groups';
import { renderScreen } from '@/test-utils/render-screen';

import { ShareMoodScreen } from '.';

jest.mock('@/api/groups', () => ({ listGroupOverview: jest.fn(), postGroupMood: jest.fn() }));
jest.mock('@/api/entries', () => ({ listEntries: jest.fn() }));

const sunday = overviewGroup({ id: 'g1', name: 'Sunday Circle', memberCount: 6 });
const family = overviewGroup({ id: 'g2', name: 'Family', memberCount: 4, color: 'sage' });

const entry = (emotion: Entry['emotion']): Entry => ({
  id: 'e1',
  emotion,
  intensity: 3,
  tags: [],
  note: 'private journal words',
  date: '2026-09-30',
  createdAt: '2026-09-30T08:00:00.000Z',
  updatedAt: '2026-09-30T08:00:00.000Z',
});

const setup = async (initialGroupId?: string) => {
  const handlers = { onClose: jest.fn(), onDone: jest.fn() };
  const view = await renderScreen(
    <ShareMoodScreen initialGroupId={initialGroupId} {...handlers} />,
  );
  return { view, ...handlers };
};
const groupRow = (view: Awaited<ReturnType<typeof setup>>['view'], name: string) =>
  view.getByRole('checkbox', { name: new RegExp(`^${name},`) });

beforeEach(() => {
  for (const fn of [listGroupOverview, postGroupMood, listEntries]) jest.mocked(fn).mockReset();
  jest.mocked(listGroupOverview).mockResolvedValue([sunday, family]);
  jest.mocked(listEntries).mockResolvedValue([]);
  jest.mocked(postGroupMood).mockResolvedValue(feedItem());
});

describe('ShareMoodScreen', () => {
  it('starts with nothing ticked when it did not come from a group', async () => {
    const { view } = await setup();
    await waitFor(() => expect(groupRow(view, 'Sunday Circle')).toBeTruthy());
    expect(groupRow(view, 'Sunday Circle').props.accessibilityState).toMatchObject({
      checked: false,
    });
    expect(
      view.getByRole('button', { name: 'Pick a group to share with' }).props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
  });

  it('ticks the group it came from and starts on Calm, as in the design', async () => {
    const { view } = await setup('g1');
    await waitFor(() =>
      expect(view.getByRole('button', { name: 'Post Calm to 1 group' })).toBeTruthy(),
    );
    expect(groupRow(view, 'Sunday Circle').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(view.getByRole('radio', { name: 'Calm' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('starts on the mood already logged today instead of Calm', async () => {
    jest.mocked(listEntries).mockResolvedValue([entry('worry')]);
    const { view } = await setup('g1');
    await waitFor(() =>
      expect(view.getByRole('button', { name: 'Post Worry to 1 group' })).toBeTruthy(),
    );
  });

  it('posts one mood and its words to every group that is ticked, then finishes', async () => {
    const { view, onDone } = await setup('g1');
    await waitFor(() => expect(groupRow(view, 'Family')).toBeTruthy());
    await fireEvent.press(view.getByRole('radio', { name: 'Anger' }));
    await fireEvent.press(groupRow(view, 'Family'));
    await fireEvent.changeText(view.getByLabelText('Add a few words'), 'Long day');
    expect(view.getByRole('button', { name: 'Post Anger to 2 groups' })).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Post Anger to 2 groups' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(postGroupMood).toHaveBeenCalledTimes(2);
    expect(postGroupMood).toHaveBeenCalledWith('g1', { emotion: 'anger', note: 'Long day' });
    expect(postGroupMood).toHaveBeenCalledWith('g2', { emotion: 'anger', note: 'Long day' });
  });

  it('keeps a group that failed ticked and says which one, so posting again only tries that one', async () => {
    jest.mocked(postGroupMood).mockImplementation(async (groupId) => {
      if (groupId === 'g2') {
        throw new ApiError({
          kind: 'http',
          status: 409,
          code: 'ALREADY_CHECKED_IN',
          message: 'You have already checked in today for this group',
        });
      }
      return feedItem();
    });
    const { view, onDone } = await setup('g1');
    await waitFor(() => expect(groupRow(view, 'Family')).toBeTruthy());
    await fireEvent.press(groupRow(view, 'Family'));

    await fireEvent.press(view.getByRole('button', { name: 'Post Calm to 2 groups' }));

    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent(
        'Family: You have already checked in today for this group',
      ),
    );
    expect(onDone).not.toHaveBeenCalled();
    expect(groupRow(view, 'Family').props.accessibilityState).toMatchObject({ checked: true });
    expect(groupRow(view, 'Sunday Circle').props.accessibilityState).toMatchObject({
      checked: false,
    });
    expect(view.getByRole('button', { name: 'Post Calm to 1 group' })).toBeTruthy();
  });

  it('says so when the person is in no group yet', async () => {
    jest.mocked(listGroupOverview).mockResolvedValue([]);
    const { view } = await setup();
    await waitFor(() => expect(view.getByText(/You are not in a group yet/)).toBeTruthy());
    expect(view.getByRole('button', { name: 'Pick a group to share with' })).toBeTruthy();
  });

  it('closes', async () => {
    const { view, onClose } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
