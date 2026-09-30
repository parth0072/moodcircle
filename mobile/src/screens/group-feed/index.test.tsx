import { fireEvent, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { addHug, getGroupDetail, getGroupFeed, removeHug } from '@/api/groups';
import type { FeedItem } from '@/api/schemas/mood';
import { usePrefsStore } from '@/stores/prefs-store';
import { useSessionStore } from '@/stores/session-store';
import { feedItem, group, minutesAgo, signedInUser } from '@/test-utils/groups';
import { renderScreen } from '@/test-utils/render-screen';
import { shareInvite } from '@/utils/share-invite';

import { GroupFeedScreen } from '.';

jest.mock('@/api/groups', () => ({
  getGroupDetail: jest.fn(),
  getGroupFeed: jest.fn(),
  addHug: jest.fn(),
  removeHug: jest.fn(),
}));
jest.mock('@/utils/share-invite', () => ({ shareInvite: jest.fn() }));
jest.mock('@/utils/secure-storage', () => ({
  secureStorage: {
    get: async () => null,
    set: async () => undefined,
    remove: async () => undefined,
  },
}));

const members = [
  { id: 'me', name: 'Aria', username: null, avatar: null },
  { id: 'u-kabir', name: 'Kabir', username: null, avatar: null },
  { id: 'u-sam', name: 'Sam', username: null, avatar: null },
];
const todayFeed = (feed: FeedItem[]) => ({
  feed,
  vibeScore: null,
  checkedIn: feed.length,
  totalMembers: 3,
});

const kabirPost = feedItem({
  id: 'p1',
  emotion: 'joy',
  note: 'Shipped it!',
  createdAt: minutesAgo(12),
  reactions: [{ id: 'r-sam', type: 'sending_love', userId: 'u-sam', createdAt: minutesAgo(5) }],
});
const myPost = feedItem({
  id: 'p2',
  user: { id: 'me', name: 'Aria', username: null, avatar: null },
  isOwn: true,
  emotion: 'calm',
  note: '',
  createdAt: minutesAgo(90),
});

const setup = async () => {
  const handlers = { onBack: jest.fn(), onShare: jest.fn() };
  const view = await renderScreen(<GroupFeedScreen groupId="g1" {...handlers} />);
  return { view, ...handlers };
};

beforeEach(() => {
  for (const fn of [getGroupDetail, getGroupFeed, addHug, removeHug, shareInvite])
    jest.mocked(fn).mockReset();
  jest
    .mocked(getGroupDetail)
    .mockResolvedValue({ group: group({ name: 'Sunday Circle', inviteCode: 'A1B2C3' }), members });
  jest.mocked(getGroupFeed).mockResolvedValue(todayFeed([myPost, kabirPost]));
  useSessionStore.setState({ hydrated: true, token: 'jwt', user: signedInUser, persistent: true });
  usePrefsStore.setState({ groupSeen: {} });
});

describe('GroupFeedScreen', () => {
  it("shows the group's name and code, and how everyone feels right now", async () => {
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('3 members · code A1B2C3')).toBeTruthy());
    expect(view.getByText('Sunday Circle')).toBeTruthy();
    expect(view.getByLabelText('You, Calm')).toBeTruthy();
    expect(view.getByLabelText('Kabir, Joy')).toBeTruthy();
    expect(view.getByLabelText('Sam, Not yet')).toBeTruthy();
  });

  it("lists today's posts newest first, with the mood, the time and the words", async () => {
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Shipped it!')).toBeTruthy());
    expect(view.getByText('12 min ago')).toBeTruthy();
    expect(view.getByText('1 hr ago')).toBeTruthy();
    expect(view.getAllByText('Kabir').length).toBeGreaterThan(0);
    expect(view.getAllByText('You').length).toBeGreaterThan(0);
    expect(view.getByText('A mix of moods')).toBeTruthy();
  });

  it('sends a hug, and shows it as sent once the server has it', async () => {
    jest.mocked(addHug).mockResolvedValue({
      id: 'r-me',
      type: 'sending_love',
      userId: 'me',
      createdAt: minutesAgo(0),
    } as never);
    const hugged = feedItem({
      ...kabirPost,
      reactions: [
        ...kabirPost.reactions,
        { id: 'r-me', type: 'sending_love', userId: 'me', createdAt: minutesAgo(0) },
      ],
    });
    const { view } = await setup();
    await waitFor(() => expect(view.getByRole('button', { name: 'Send a hug · 1' })).toBeTruthy());
    jest.mocked(getGroupFeed).mockResolvedValue(todayFeed([myPost, hugged]));

    await fireEvent.press(view.getByRole('button', { name: 'Send a hug · 1' }));

    await waitFor(() => expect(view.getByRole('button', { name: 'Send a hug · 2' })).toBeTruthy());
    expect(addHug).toHaveBeenCalledWith('p1');
    expect(
      view.getByRole('button', { name: 'Send a hug · 2' }).props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
  });

  it('takes a hug back when it is pressed again', async () => {
    const hugged = feedItem({
      ...kabirPost,
      reactions: [{ id: 'r-me', type: 'sending_love', userId: 'me', createdAt: minutesAgo(1) }],
    });
    jest.mocked(getGroupFeed).mockResolvedValue(todayFeed([hugged]));
    jest.mocked(removeHug).mockResolvedValue(undefined);
    const { view } = await setup();
    await waitFor(() => expect(view.getByRole('button', { name: 'Send a hug · 1' })).toBeTruthy());

    await fireEvent.press(view.getByRole('button', { name: 'Send a hug · 1' }));

    await waitFor(() => expect(removeHug).toHaveBeenCalledWith('p1', 'r-me'));
  });

  it('says why a hug could not be sent', async () => {
    jest.mocked(addHug).mockRejectedValue(
      new ApiError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Check your connection and try again.',
      }),
    );
    const { view } = await setup();
    await waitFor(() => expect(view.getByRole('button', { name: 'Send a hug · 1' })).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Send a hug · 1' }));
    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent(/Could not reach the server/),
    );
  });

  it('shares the invitation from the invite button', async () => {
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('3 members · code A1B2C3')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Invite people' }));
    expect(shareInvite).toHaveBeenCalledWith('Sunday Circle', 'A1B2C3');
  });

  it('opens the share screen for this group, and goes back', async () => {
    const { view, onShare, onBack } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Share how you feel' }));
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onShare).toHaveBeenCalledWith('g1');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('remembers the newest post looked at, which clears the new badge on the groups list', async () => {
    await setup();
    await waitFor(() => expect(usePrefsStore.getState().groupSeen.g1).toBe(kabirPost.createdAt));
  });

  it('invites the first post when nobody has shared yet', async () => {
    jest.mocked(getGroupFeed).mockResolvedValue(todayFeed([]));
    const { view } = await setup();
    await waitFor(() => expect(view.getByText(/Nobody has shared yet today/)).toBeTruthy());
  });

  it('offers a retry when the group cannot be loaded', async () => {
    jest.mocked(getGroupDetail).mockRejectedValueOnce(
      new ApiError({
        kind: 'http',
        status: 403,
        code: 'NOT_MEMBER',
        message: 'You are not a member of this group',
      }),
    );
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('You are not a member of this group')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(view.getByText('3 members · code A1B2C3')).toBeTruthy());
  });
});
