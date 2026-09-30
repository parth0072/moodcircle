import { fireEvent, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { createGroup } from '@/api/groups';
import { group } from '@/test-utils/groups';
import { renderScreen } from '@/test-utils/render-screen';
import { shareInvite } from '@/utils/share-invite';

import { CreateGroupScreen } from '.';

jest.mock('@/api/groups', () => ({ createGroup: jest.fn() }));
jest.mock('@/utils/share-invite', () => ({ shareInvite: jest.fn() }));

const setup = async () => {
  const handlers = { onBack: jest.fn(), onCreated: jest.fn() };
  const view = await renderScreen(<CreateGroupScreen {...handlers} />);
  return { view, ...handlers };
};

beforeEach(() => {
  jest.mocked(createGroup).mockReset();
  jest.mocked(shareInvite).mockReset();
  jest.mocked(shareInvite).mockResolvedValue(undefined);
});

describe('CreateGroupScreen', () => {
  it('needs a name', async () => {
    const { view } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Create & share invite' }));
    expect(view.getByRole('alert')).toHaveTextContent('Give your group a name');
    expect(createGroup).not.toHaveBeenCalled();
  });

  it('starts blue and mood only, as in the design', async () => {
    const { view } = await setup();
    expect(view.getByRole('radio', { name: 'Blue' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(view.getByRole('radio', { name: /^Mood only/ }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(
      view.getByRole('radio', { name: /^Mood \+ notes/ }).props.accessibilityState,
    ).toMatchObject({
      checked: false,
    });
  });

  it('creates the group, offers the invite for sharing, then moves on', async () => {
    jest.mocked(createGroup).mockResolvedValue(group({ name: 'Book club', inviteCode: 'D4E5F6' }));
    const { view, onCreated } = await setup();
    await fireEvent.changeText(view.getByLabelText('Group name'), '  Book club ');

    await fireEvent.press(view.getByRole('button', { name: 'Create & share invite' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(createGroup).toHaveBeenCalledWith({
      name: 'Book club',
      color: 'blue',
      showNotes: false,
    });
    expect(shareInvite).toHaveBeenCalledWith('Book club', 'D4E5F6');
    expect(jest.mocked(shareInvite).mock.invocationCallOrder[0]).toBeLessThan(
      onCreated.mock.invocationCallOrder[0],
    );
  });

  it('sends the colour and the visibility that were chosen', async () => {
    jest.mocked(createGroup).mockResolvedValue(group());
    const { view, onCreated } = await setup();
    await fireEvent.changeText(view.getByLabelText('Group name'), 'Family');
    await fireEvent.press(view.getByRole('radio', { name: 'Sage' }));
    await fireEvent.press(view.getByRole('radio', { name: /^Mood \+ notes/ }));
    expect(view.getByRole('radio', { name: 'Sage' }).props.accessibilityState).toMatchObject({
      checked: true,
    });

    await fireEvent.press(view.getByRole('button', { name: 'Create & share invite' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(createGroup).toHaveBeenCalledWith({ name: 'Family', color: 'sage', showNotes: true });
  });

  it('keeps what was typed and says why when the group could not be created', async () => {
    jest.mocked(createGroup).mockRejectedValue(
      new ApiError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Check your connection and try again.',
      }),
    );
    const { view, onCreated } = await setup();
    await fireEvent.changeText(view.getByLabelText('Group name'), 'Book club');

    await fireEvent.press(view.getByRole('button', { name: 'Create & share invite' }));

    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent(/Could not reach the server/),
    );
    expect(view.getByLabelText('Group name').props.value).toBe('Book club');
    expect(shareInvite).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('goes back', async () => {
    const { view, onBack } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
