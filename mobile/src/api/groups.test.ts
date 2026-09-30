import { api } from '@/api';

import {
  addHug,
  createGroup,
  getGroupDetail,
  getGroupFeed,
  joinGroup,
  listGroupOverview,
  postGroupMood,
  previewGroup,
  removeHug,
} from './groups';

jest.mock('@/api', () => ({
  api: { post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const post = api.post as jest.Mock;
const get = api.get as jest.Mock;
const del = api.delete as jest.Mock;

const group = {
  id: 'g1',
  name: 'Sunday Circle',
  inviteCode: 'A1B2C3',
  createdBy: 'u1',
  memberCount: 2,
  isAdmin: true,
  color: 'pink',
  showNotes: false,
  autoShare: true,
  createdAt: '2026-09-30T06:00:00.000Z',
  internal: 'must-not-leak',
};

const item = {
  id: 'p1',
  user: { id: 'u2', name: 'Kabir', username: null, avatar: null, phone: 'legacy' },
  isOwn: false,
  level: 4,
  emotion: 'calm',
  note: 'Morning run',
  isAnonymous: false,
  date: '2026-09-30',
  createdAt: '2026-09-30T08:00:00.000Z',
  reactions: [
    { id: 'r1', type: 'sending_love', userId: 'u1', createdAt: '2026-09-30T08:05:00.000Z' },
  ],
};

beforeEach(() => {
  for (const fn of [post, get, del]) fn.mockReset();
});

describe('groups api', () => {
  it('lists the groups with their members and what was posted today', async () => {
    get.mockResolvedValue({
      groups: [
        {
          ...group,
          members: [{ id: 'u1', name: 'Aria', username: null }],
          today: [{ userId: null, emotion: 'joy', createdAt: '2026-09-30T08:00:00.000Z' }],
        },
      ],
    });
    const [first] = await listGroupOverview();
    expect(get).toHaveBeenCalledWith('/groups/overview');
    expect(first.today[0]).toEqual({
      userId: null,
      emotion: 'joy',
      createdAt: '2026-09-30T08:00:00.000Z',
    });
    expect(first).not.toHaveProperty('internal');
  });

  it('previews a code with the code safely encoded', async () => {
    get.mockResolvedValue({
      group: {
        id: null,
        name: 'Sunday Circle',
        color: 'blue',
        showNotes: true,
        createdByName: null,
        memberCount: 6,
        isMember: false,
      },
    });
    const preview = await previewGroup('A B&1');
    expect(get).toHaveBeenCalledWith('/groups/preview?code=A%20B%261');
    expect(preview).toMatchObject({ id: null, createdByName: null, isMember: false });
  });

  it('lets a wrong code through as the error it is', async () => {
    const failure = new Error('Invalid invite code');
    get.mockRejectedValue(failure);
    await expect(previewGroup('ZZZZZZ')).rejects.toBe(failure);
  });

  it('creates a group with its colour and what members can see', async () => {
    post.mockResolvedValue({ group });
    const created = await createGroup({ name: 'Sunday Circle', color: 'pink', showNotes: false });
    expect(post).toHaveBeenCalledWith('/groups', {
      name: 'Sunday Circle',
      color: 'pink',
      showNotes: false,
    });
    expect(created.color).toBe('pink');
    expect(created).not.toHaveProperty('internal');
  });

  it('joins with a code and the choice to share check-ins', async () => {
    post.mockResolvedValue({ group });
    await joinGroup({ inviteCode: 'A1B2C3', autoShare: true });
    expect(post).toHaveBeenCalledWith('/groups/join', { inviteCode: 'A1B2C3', autoShare: true });
  });

  it('reads a group with its members, leaving the legacy phone out', async () => {
    get.mockResolvedValue({
      group,
      members: [{ id: 'u1', name: 'Aria', username: null, avatar: null, phone: 'legacy' }],
    });
    const detail = await getGroupDetail('g1');
    expect(get).toHaveBeenCalledWith('/groups/g1');
    expect(detail.members[0]).not.toHaveProperty('phone');
  });

  it("reads today's feed with emotions and who reacted", async () => {
    get.mockResolvedValue({ feed: [item], vibeScore: 4, checkedIn: 1, totalMembers: 2 });
    const feed = await getGroupFeed('g1');
    expect(get).toHaveBeenCalledWith('/groups/g1/moods/today');
    expect(feed.feed[0].emotion).toBe('calm');
    expect(feed.feed[0].reactions).toHaveLength(1);
  });

  it('posts an emotion, sending the words only when there are some', async () => {
    post.mockResolvedValue({ mood: item });
    await postGroupMood('g1', { emotion: 'calm', note: '  Morning run  ' });
    expect(post).toHaveBeenLastCalledWith('/groups/g1/moods', {
      emotion: 'calm',
      note: 'Morning run',
    });
    await postGroupMood('g1', { emotion: 'calm', note: '   ' });
    expect(post).toHaveBeenLastCalledWith('/groups/g1/moods', { emotion: 'calm' });
    await postGroupMood('g1', { emotion: 'joy' });
    expect(post).toHaveBeenLastCalledWith('/groups/g1/moods', { emotion: 'joy' });
  });

  it('sends a hug as the sending_love reaction, and takes it back', async () => {
    post.mockResolvedValue({
      reaction: {
        id: 'r9',
        moodId: 'p1',
        userId: 'u1',
        type: 'sending_love',
        createdAt: '2026-09-30T09:00:00.000Z',
      },
    });
    del.mockResolvedValue({ message: 'Reaction removed' });
    const reaction = await addHug('p1');
    expect(post).toHaveBeenCalledWith('/moods/p1/reactions', { type: 'sending_love' });
    expect(reaction.id).toBe('r9');
    await removeHug('p1', 'r9');
    expect(del).toHaveBeenCalledWith('/moods/p1/reactions/r9');
  });

  it('refuses an answer that is not what the app expects', async () => {
    get.mockResolvedValue({ groups: [{ id: 1 }] });
    await expect(listGroupOverview()).rejects.toMatchObject({ kind: 'invalid-response' });
  });
});
