import { fireEvent, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { joinGroup, previewGroup } from '@/api/groups';
import type { GroupPreview } from '@/api/schemas/group';
import { group } from '@/test-utils/groups';
import { renderScreen } from '@/test-utils/render-screen';

import { JoinGroupScreen } from '.';

jest.mock('@/api/groups', () => ({ previewGroup: jest.fn(), joinGroup: jest.fn() }));
// The code is looked up once typing pauses; the tests do not wait for that.
jest.mock('@/hooks/use-debounced', () => ({ useDebounced: (value: unknown) => value }));

const preview = (overrides: Partial<GroupPreview> = {}): GroupPreview => ({
  id: null,
  name: 'Sunday Circle',
  color: 'pink',
  showNotes: true,
  createdByName: 'Kabir',
  memberCount: 6,
  isMember: false,
  ...overrides,
});

const setup = async () => {
  const handlers = { onBack: jest.fn(), onJoined: jest.fn() };
  const view = await renderScreen(<JoinGroupScreen {...handlers} />);
  return { view, ...handlers };
};
type View = Awaited<ReturnType<typeof setup>>['view'];
const enterCode = (view: View, text: string) =>
  fireEvent.changeText(view.getByLabelText('Invite code'), text);

beforeEach(() => {
  jest.mocked(previewGroup).mockReset();
  jest.mocked(joinGroup).mockReset();
});

describe('JoinGroupScreen', () => {
  it('waits for a whole code before looking anything up', async () => {
    const { view } = await setup();
    await enterCode(view, 'ab');
    expect(previewGroup).not.toHaveBeenCalled();
    expect(view.getByRole('button', { name: 'Join group' }).props.accessibilityState).toMatchObject(
      {
        disabled: true,
      },
    );
  });

  it('shows whose group a code opens, and offers to join it', async () => {
    jest.mocked(previewGroup).mockResolvedValue(preview());
    const { view } = await setup();

    await enterCode(view, 'a1b 2c3');

    await waitFor(() => expect(view.getByText('Group found')).toBeTruthy());
    expect(previewGroup).toHaveBeenCalledWith('A1B2C3');
    expect(view.getByText('Sunday Circle')).toBeTruthy();
    expect(view.getByText('Created by Kabir · 6 members')).toBeTruthy();
    expect(
      view.getByText("Members see each other's mood and notes. Posts stay inside the group."),
    ).toBeTruthy();
    expect(view.getByText('Each daily mood posts automatically')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Join Sunday Circle' })).toBeTruthy();
  });

  it('says when a group hides notes, and copes with a creator who has no name', async () => {
    jest.mocked(previewGroup).mockResolvedValue(preview({ showNotes: false, createdByName: null }));
    const { view } = await setup();
    await enterCode(view, 'A1B2C3');
    await waitFor(() => expect(view.getByText('Created by a member · 6 members')).toBeTruthy());
    expect(
      view.getByText(
        "Members see each other's mood, not their notes. Posts stay inside the group.",
      ),
    ).toBeTruthy();
  });

  it('says so when no group has the code, and does not offer to join', async () => {
    jest.mocked(previewGroup).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 404,
        code: 'INVALID_INVITE_CODE',
        message: 'Invalid invite code',
      }),
    );
    const { view } = await setup();
    await enterCode(view, 'ZZZZZZ');
    await waitFor(() => expect(view.getByText('No group has this code.')).toBeTruthy());
    expect(view.getByRole('button', { name: 'Join group' }).props.accessibilityState).toMatchObject(
      {
        disabled: true,
      },
    );
  });

  it('joins, sharing check-ins by default, then moves on to the group', async () => {
    jest.mocked(previewGroup).mockResolvedValue(preview());
    jest.mocked(joinGroup).mockResolvedValue(group({ id: 'g9' }));
    const { view, onJoined } = await setup();
    await enterCode(view, 'A1B2C3');
    await waitFor(() => expect(view.getByText('Group found')).toBeTruthy());

    await fireEvent.press(view.getByRole('button', { name: 'Join Sunday Circle' }));

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith('g9'));
    expect(joinGroup).toHaveBeenCalledWith({ inviteCode: 'A1B2C3', autoShare: true });
  });

  it('joins without sharing when the switch is turned off', async () => {
    jest.mocked(previewGroup).mockResolvedValue(preview());
    jest.mocked(joinGroup).mockResolvedValue(group({ id: 'g9' }));
    const { view, onJoined } = await setup();
    await enterCode(view, 'A1B2C3');
    await waitFor(() => expect(view.getByText('Group found')).toBeTruthy());

    await fireEvent(
      view.getByRole('switch', { name: 'Share my check-ins with this group' }),
      'valueChange',
      false,
    );
    expect(view.getByText('You choose what to post')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Join Sunday Circle' }));

    await waitFor(() => expect(onJoined).toHaveBeenCalled());
    expect(joinGroup).toHaveBeenCalledWith({ inviteCode: 'A1B2C3', autoShare: false });
  });

  it('opens the group instead when the person is already in it', async () => {
    jest.mocked(previewGroup).mockResolvedValue(preview({ isMember: true, id: 'g1' }));
    const { view, onJoined } = await setup();
    await enterCode(view, 'A1B2C3');
    await waitFor(() => expect(view.getByText("You're already in this group")).toBeTruthy());
    expect(view.queryByRole('switch')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Open Sunday Circle' }));

    expect(onJoined).toHaveBeenCalledWith('g1');
    expect(joinGroup).not.toHaveBeenCalled();
  });

  it('shows why joining failed and stays on the screen', async () => {
    jest.mocked(previewGroup).mockResolvedValue(preview());
    jest.mocked(joinGroup).mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 409,
        code: 'ALREADY_MEMBER',
        message: 'You are already a member of this group',
      }),
    );
    const { view, onJoined } = await setup();
    await enterCode(view, 'A1B2C3');
    await waitFor(() => expect(view.getByText('Group found')).toBeTruthy());

    await fireEvent.press(view.getByRole('button', { name: 'Join Sunday Circle' }));

    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent('You are already a member of this group'),
    );
    expect(onJoined).not.toHaveBeenCalled();
  });

  it('goes back', async () => {
    const { view, onBack } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
