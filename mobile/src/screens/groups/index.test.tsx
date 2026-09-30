import { fireEvent, waitFor } from '@testing-library/react-native';

import { listGroupOverview } from '@/api/groups';
import { usePrefsStore } from '@/stores/prefs-store';
import { useSessionStore } from '@/stores/session-store';
import { minutesAgo, overviewGroup, signedInUser } from '@/test-utils/groups';
import { renderScreen } from '@/test-utils/render-screen';

import { GroupsScreen } from '.';

jest.mock('@/api/groups', () => ({ listGroupOverview: jest.fn() }));
jest.mock('@/utils/secure-storage', () => ({
  secureStorage: {
    get: async () => null,
    set: async () => undefined,
    remove: async () => undefined,
  },
}));

const setup = async () => {
  const handlers = {
    onBack: jest.fn(),
    onJoin: jest.fn(),
    onCreate: jest.fn(),
    onOpenGroup: jest.fn(),
  };
  const view = await renderScreen(<GroupsScreen {...handlers} />);
  return { view, ...handlers };
};

const sunday = overviewGroup({
  id: 'g1',
  name: 'Sunday Circle',
  color: 'blue',
  memberCount: 6,
  today: [
    { userId: 'u1', emotion: 'calm', createdAt: minutesAgo(50) },
    { userId: 'u2', emotion: 'calm', createdAt: minutesAgo(40) },
    { userId: 'me', emotion: 'joy', createdAt: minutesAgo(30) },
    { userId: null, emotion: 'sad', createdAt: minutesAgo(20) },
  ],
});
const family = overviewGroup({
  id: 'g2',
  name: 'Family',
  color: 'sage',
  memberCount: 4,
  today: [{ userId: 'u3', emotion: 'joy', createdAt: minutesAgo(10) }],
});

beforeEach(() => {
  jest.mocked(listGroupOverview).mockReset();
  jest.mocked(listGroupOverview).mockResolvedValue([sunday, family]);
  useSessionStore.setState({ hydrated: true, token: 'jwt', user: signedInUser, persistent: true });
  usePrefsStore.setState({ groupSeen: {} });
});

describe('GroupsScreen', () => {
  it('lists each circle with its size, its posts and how it feels today', async () => {
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Sunday Circle')).toBeTruthy());
    expect(view.getByText('6 members · 4 posts today')).toBeTruthy();
    expect(view.getByText('Mostly calm today')).toBeTruthy();
    expect(view.getByText('Family')).toBeTruthy();
    expect(view.getByText('4 members · 1 post today')).toBeTruthy();
    expect(view.getByText("3 haven't checked in")).toBeTruthy();
  });

  it('counts the posts by other people that came in since the group was last opened', async () => {
    const { view } = await setup();
    // Three of the four posts today are not the person's own.
    await waitFor(() =>
      expect(view.getByRole('button', { name: /^Sunday Circle\..*3 new$/ })).toBeTruthy(),
    );
    expect(view.getByRole('button', { name: /^Family\..*1 new$/ })).toBeTruthy();

    // Once the newest post has been looked at, nothing is new.
    usePrefsStore.setState({ groupSeen: { g1: sunday.today[3].createdAt } });
    await waitFor(() =>
      expect(view.queryByRole('button', { name: /^Sunday Circle\..*new$/ })).toBeNull(),
    );
  });

  it('opens a circle when its card is tapped', async () => {
    const { view, onOpenGroup } = await setup();
    await waitFor(() => expect(view.getByText('Family')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: /^Family\./ }));
    expect(onOpenGroup).toHaveBeenCalledWith('g2');
  });

  it('offers to join with a code, to create a group, and to go back', async () => {
    const { view, onJoin, onCreate, onBack } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Join with code' }));
    await fireEvent.press(view.getByRole('button', { name: 'Create a group' }));
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('says so when the person is in no circle yet', async () => {
    jest.mocked(listGroupOverview).mockResolvedValue([]);
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('No circles yet')).toBeTruthy());
  });

  it('offers a retry when the circles cannot be loaded', async () => {
    jest
      .mocked(listGroupOverview)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([family]);
    const { view } = await setup();
    await waitFor(() => expect(view.getByText('Could not load your circles.')).toBeTruthy());
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(view.getByText('Family')).toBeTruthy());
  });
});
