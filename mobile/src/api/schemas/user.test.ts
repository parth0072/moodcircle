import { isProfileComplete, mergeUserFields, type User } from './user';

const user: User = {
  id: 'u1',
  email: 'a@b.co',
  name: 'Asha',
  username: null,
  avatar: null,
  isPremium: false,
  hasPassword: true,
  joyActivities: [],
  joyOnboarded: false,
};

describe('user helpers', () => {
  it('needs a display name to be complete, and nothing else', () => {
    expect(isProfileComplete({ name: 'Asha' })).toBe(true);
    expect(isProfileComplete({ name: null })).toBe(false);
    expect(isProfileComplete({ name: '' })).toBe(false);
  });

  it('merges a profile answer without dropping what it left out', () => {
    expect(
      mergeUserFields(user, { name: 'Asha K', email: undefined, hasPassword: undefined }),
    ).toMatchObject({
      name: 'Asha K',
      email: 'a@b.co',
      hasPassword: true,
    });
  });

  it('lets a patch clear a field with null', () => {
    expect(mergeUserFields(user, { name: null }).name).toBeNull();
  });
});
