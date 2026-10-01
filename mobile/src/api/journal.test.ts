import { api } from '@/api';
import { readPhotoBytes } from '@/utils/photo-bytes';

import {
  addJournalReply,
  createJournalEntry,
  deleteJournalEntry,
  deleteJournalReply,
  getJournalEntry,
  listJournal,
  listSharePeople,
  setJournalLove,
  setJournalShares,
  updateJournalEntry,
  uploadJournalPhoto,
} from './journal';

jest.mock('@/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    postBytes: jest.fn(),
  },
}));
jest.mock('@/utils/env', () => ({ getApiUrl: () => 'https://api.test/api' }));
jest.mock('@/utils/photo-bytes', () => ({ readPhotoBytes: jest.fn() }));

const get = api.get as jest.Mock;
const post = api.post as jest.Mock;
const patch = api.patch as jest.Mock;
const put = api.put as jest.Mock;
const del = api.delete as jest.Mock;
const postBytes = api.postBytes as jest.Mock;

const photo = {
  id: 'ph1',
  url: '/journal/photos/ph1/file?e=1&s=abc',
  width: 4032,
  height: 3024,
  internal: 'must-not-leak',
};

const entry = {
  id: 'e1',
  type: 'memory',
  emotion: 'joy',
  title: 'Beach day',
  excerpt: 'We stayed until…',
  createdAt: '2026-09-27T15:12:00.000Z',
  updatedAt: '2026-09-27T15:12:00.000Z',
  isMine: true,
  owner: { id: 'u1', name: 'Aria' },
  photos: [photo],
  photoCount: 1,
  sharedWith: [{ id: 'u2', name: 'Kabir' }],
  sharedMessage: null,
  loves: { count: 1, mine: false },
  replyCount: 1,
};

const detail = {
  ...entry,
  body: 'We stayed until the sun went down.',
  replies: [
    {
      id: 'r1',
      body: 'Best day in ages.',
      createdAt: '2026-09-27T16:00:00.000Z',
      author: { id: 'u2', name: 'Kabir' },
      isMine: false,
    },
  ],
};

afterEach(() => jest.clearAllMocks());

describe('journal API', () => {
  it('lists entries, makes photo links whole, and passes the filter and cursor along', async () => {
    get.mockResolvedValue({ entries: [entry], nextBefore: '2026-09-27T15:12:00.000Z' });
    const page = await listJournal(
      { type: 'memory', q: ' beach & sun ' },
      '2026-09-28T00:00:00.000Z',
    );

    expect(get).toHaveBeenCalledWith(
      '/journal?type=memory&q=beach%20%26%20sun&before=2026-09-28T00%3A00%3A00.000Z',
    );
    expect(page.nextBefore).toBe('2026-09-27T15:12:00.000Z');
    expect(page.entries[0].photos[0].url).toBe(
      'https://api.test/api/journal/photos/ph1/file?e=1&s=abc',
    );
    expect(page.entries[0].photos[0]).not.toHaveProperty('internal'); // the schema strips what it does not know
  });

  it('asks for the plain list when there is no filter', async () => {
    get.mockResolvedValue({ entries: [], nextBefore: null });
    await listJournal({});
    expect(get).toHaveBeenCalledWith('/journal');
    await listJournal({ q: '   ' });
    expect(get).toHaveBeenLastCalledWith('/journal');
  });

  it('reads one entry in full', async () => {
    get.mockResolvedValue({ entry: detail });
    const got = await getJournalEntry('e1');
    expect(get).toHaveBeenCalledWith('/journal/e1');
    expect(got.body).toBe('We stayed until the sun went down.');
    expect(got.replies[0].author.name).toBe('Kabir');
    expect(got.photos[0].url).toMatch(/^https:\/\/api\.test\/api\/journal\/photos\//);
  });

  it('writes an entry with trimmed words and the photo ids', async () => {
    post.mockResolvedValue({ entry: detail });
    await createJournalEntry({
      type: 'memory',
      emotion: 'joy',
      title: '  Beach day ',
      body: ' We stayed. ',
      photoIds: ['ph1'],
    });
    expect(post).toHaveBeenCalledWith('/journal', {
      type: 'memory',
      emotion: 'joy',
      title: 'Beach day',
      body: 'We stayed.',
      photoIds: ['ph1'],
    });
  });

  it('changes only what it is given', async () => {
    patch.mockResolvedValue({ entry: detail });
    await updateJournalEntry('e1', { title: ' New title ' });
    expect(patch).toHaveBeenCalledWith('/journal/e1', { title: 'New title' });
    await updateJournalEntry('e1', { emotion: 'calm', photoIds: [] });
    expect(patch).toHaveBeenLastCalledWith('/journal/e1', { emotion: 'calm', photoIds: [] });
  });

  it('deletes an entry', async () => {
    del.mockResolvedValue({ message: 'Entry deleted' });
    await expect(deleteJournalEntry('e1')).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith('/journal/e1');
  });

  it('uploads a photo as raw bytes with its type and size, and returns a whole link', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    (readPhotoBytes as jest.Mock).mockResolvedValue(bytes);
    postBytes.mockResolvedValue({ photo });

    const saved = await uploadJournalPhoto({
      uri: 'file:///cache/a.jpg',
      width: 4032,
      height: 3024,
      mimeType: 'image/jpeg',
    });

    expect(postBytes).toHaveBeenCalledWith(
      '/journal/photos?width=4032&height=3024',
      bytes,
      'image/jpeg',
      { timeoutMs: 60_000 },
    );
    expect(saved).toMatchObject({
      id: 'ph1',
      url: 'https://api.test/api/journal/photos/ph1/file?e=1&s=abc',
    });
  });

  it('leaves the size out when the picker did not report one the server would accept', async () => {
    (readPhotoBytes as jest.Mock).mockResolvedValue(new Uint8Array([1]));
    postBytes.mockResolvedValue({ photo });
    await uploadJournalPhoto({ uri: 'blob:x', width: 0, height: 25_000, mimeType: 'image/png' });
    expect(postBytes.mock.calls[0][0]).toBe('/journal/photos');
  });

  it('lists the people an entry can be sent to', async () => {
    get.mockResolvedValue({
      people: [
        {
          id: 'u2',
          name: 'Kabir',
          username: null,
          avatar: null,
          groups: [{ id: 'g1', name: 'Sunday Circle' }],
          email: 'must-not-leak',
        },
      ],
    });
    const people = await listSharePeople();
    expect(get).toHaveBeenCalledWith('/journal/people');
    expect(people[0].groups[0].name).toBe('Sunday Circle');
    expect(people[0]).not.toHaveProperty('email');
  });

  it('shares with exactly the people given', async () => {
    put.mockResolvedValue({ sharedWith: [{ id: 'u2', name: 'Kabir' }] });
    const sharedWith = await setJournalShares('e1', {
      recipientIds: ['u2'],
      message: '  Thought of you  ',
      includePhotos: false,
    });
    expect(put).toHaveBeenCalledWith('/journal/e1/shares', {
      recipientIds: ['u2'],
      message: 'Thought of you',
      includePhotos: false,
    });
    expect(sharedWith).toEqual([{ id: 'u2', name: 'Kabir' }]);
  });

  it('loves with PUT and takes it back with DELETE', async () => {
    put.mockResolvedValue({ loves: { count: 2, mine: true } });
    del.mockResolvedValue({ loves: { count: 1, mine: false } });
    await expect(setJournalLove('e1', true)).resolves.toEqual({ count: 2, mine: true });
    expect(put).toHaveBeenCalledWith('/journal/e1/love');
    await expect(setJournalLove('e1', false)).resolves.toEqual({ count: 1, mine: false });
    expect(del).toHaveBeenCalledWith('/journal/e1/love');
  });

  it('adds and deletes a reply', async () => {
    post.mockResolvedValue({ reply: detail.replies[0] });
    del.mockResolvedValue({ message: 'Reply deleted' });
    await expect(addJournalReply('e1', '  Best day in ages. ')).resolves.toMatchObject({
      id: 'r1',
    });
    expect(post).toHaveBeenCalledWith('/journal/e1/replies', { body: 'Best day in ages.' });
    await expect(deleteJournalReply('e1', 'r1')).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith('/journal/e1/replies/r1');
  });

  it('fails loudly when the server sends something that is not the contract', async () => {
    get.mockResolvedValue({ entries: [{ ...entry, emotion: 'happy' }], nextBefore: null });
    await expect(listJournal({})).rejects.toMatchObject({ kind: 'invalid-response' });
  });
});
