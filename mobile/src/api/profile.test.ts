import { api } from '@/api';

import { updateProfile } from './profile';

jest.mock('@/api', () => ({ api: { patch: jest.fn() } }));

const patch = api.patch as jest.Mock;
const answer = {
  user: {
    id: 'u1',
    name: 'Asha',
    username: null,
    avatar: null,
    isPremium: false,
    joyActivities: [],
    joyOnboarded: false,
  },
};

beforeEach(() => patch.mockReset());

describe('profile api', () => {
  it('patches with the session token', async () => {
    patch.mockResolvedValue(answer);
    const user = await updateProfile({ name: 'Asha' });
    expect(patch).toHaveBeenCalledWith('/profile', { name: 'Asha' });
    expect(user.name).toBe('Asha');
  });

  it('patches with an explicit token, right after a code was confirmed', async () => {
    patch.mockResolvedValue(answer);
    await updateProfile({ name: 'Asha' }, 'fresh-token');
    expect(patch).toHaveBeenCalledWith('/profile', { name: 'Asha' }, { token: 'fresh-token' });
  });

  it('answers without email or hasPassword, so it must be merged rather than replace the user', async () => {
    patch.mockResolvedValue(answer);
    const user = await updateProfile({ name: 'Asha' });
    expect(user.email).toBeUndefined();
    expect(user.hasPassword).toBeUndefined();
  });
});
