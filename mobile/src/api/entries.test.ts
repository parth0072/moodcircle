import { api } from '@/api';

import { createEntry, deleteEntry, getEntryStats, listEntries, updateEntry } from './entries';

jest.mock('@/api', () => ({
  api: { post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const post = api.post as jest.Mock;
const get = api.get as jest.Mock;
const patch = api.patch as jest.Mock;
const del = api.delete as jest.Mock;

const entry = {
  id: '6f1c2c1e-6c1a-4b8e-9d55-2f4d1f0c9a10',
  emotion: 'joy',
  intensity: 4,
  tags: ['Friends'],
  note: 'Coffee',
  date: '2026-09-30',
  createdAt: '2026-09-30T15:12:00.000Z',
  updatedAt: '2026-09-30T15:12:00.000Z',
  userId: 'must-not-leak',
};

beforeEach(() => {
  for (const fn of [post, get, patch, del]) fn.mockReset();
});

describe('entries api', () => {
  it('creates an entry with the session token and returns the parsed entry', async () => {
    post.mockResolvedValue({ entry });
    const result = await createEntry({ emotion: 'joy', intensity: 4, date: '2026-09-30' });
    expect(post).toHaveBeenCalledWith('/entries', {
      emotion: 'joy',
      intensity: 4,
      date: '2026-09-30',
    });
    expect(result.emotion).toBe('joy');
    expect(result).not.toHaveProperty('userId');
  });

  it('lists a range by local days', async () => {
    get.mockResolvedValue({ entries: [entry] });
    const result = await listEntries('2026-09-24', '2026-09-30');
    expect(get).toHaveBeenCalledWith('/entries?from=2026-09-24&to=2026-09-30');
    expect(result).toHaveLength(1);
  });

  it('updates and deletes by id', async () => {
    patch.mockResolvedValue({ entry: { ...entry, intensity: 2 } });
    del.mockResolvedValue({ message: 'Entry deleted' });
    expect((await updateEntry(entry.id, { intensity: 2 })).intensity).toBe(2);
    expect(patch).toHaveBeenCalledWith(`/entries/${entry.id}`, { intensity: 2 });
    await deleteEntry(entry.id);
    expect(del).toHaveBeenCalledWith(`/entries/${entry.id}`);
  });

  it("reads the profile stats for the user's own today", async () => {
    get.mockResolvedValue({
      stats: { total: 148, currentStreak: 12, topEmotion: 'calm', firstEntryDate: '2026-03-04' },
    });
    const stats = await getEntryStats('2026-09-30');
    expect(get).toHaveBeenCalledWith('/entries/stats?date=2026-09-30');
    expect(stats).toEqual({
      total: 148,
      currentStreak: 12,
      topEmotion: 'calm',
      firstEntryDate: '2026-03-04',
    });
  });

  it('turns an unknown emotion or a malformed answer into an invalid-response error', async () => {
    post.mockResolvedValue({ entry: { ...entry, emotion: 'ecstatic' } });
    await expect(
      createEntry({ emotion: 'joy', intensity: 4, date: '2026-09-30' }),
    ).rejects.toMatchObject({
      kind: 'invalid-response',
    });
    get.mockResolvedValue({ entries: 'nope' });
    await expect(listEntries('2026-09-24', '2026-09-30')).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });
});
