import { act, renderHook, waitFor } from '@testing-library/react-native';

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
} from '@/api/journal';
import { createQueryWrapper, createTestQueryClient } from '@/test-utils/query-wrapper';

import {
  useAddJournalReply,
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useDeleteJournalReply,
  useJournalEntry,
  useJournalList,
  useSetJournalLove,
  useSetJournalShares,
  useSharePeople,
  useUpdateJournalEntry,
} from './use-journal';

jest.mock('@/api/journal', () => ({
  addJournalReply: jest.fn(),
  createJournalEntry: jest.fn(),
  deleteJournalEntry: jest.fn(),
  deleteJournalReply: jest.fn(),
  getJournalEntry: jest.fn(),
  listJournal: jest.fn(),
  listSharePeople: jest.fn(),
  setJournalLove: jest.fn(),
  setJournalShares: jest.fn(),
  updateJournalEntry: jest.fn(),
}));

const entry = (id: string) => ({ id, title: `Entry ${id}` }) as never;

function setup() {
  const client = createTestQueryClient();
  return { client, wrapper: createQueryWrapper(client) };
}

beforeEach(() => jest.resetAllMocks());

describe('journal queries', () => {
  it('loads the first page, then the next one from where the last one ended', async () => {
    jest
      .mocked(listJournal)
      .mockResolvedValueOnce({
        entries: [entry('a'), entry('b')],
        nextBefore: '2026-09-27T00:00:00.000Z',
      })
      .mockResolvedValueOnce({ entries: [entry('c')], nextBefore: null });
    const { wrapper } = setup();
    const view = await renderHook(() => useJournalList({ type: 'note', q: 'sleep' }), { wrapper });

    await waitFor(() => expect(view.result.current.data?.pages).toHaveLength(1));
    expect(listJournal).toHaveBeenCalledWith({ type: 'note', q: 'sleep' }, undefined);
    expect(view.result.current.hasNextPage).toBe(true);

    await act(async () => {
      await view.result.current.fetchNextPage();
    });
    await waitFor(() => expect(view.result.current.data?.pages).toHaveLength(2));
    expect(listJournal).toHaveBeenLastCalledWith(
      { type: 'note', q: 'sleep' },
      '2026-09-27T00:00:00.000Z',
    );
    expect(view.result.current.data?.pages.flatMap((p) => p.entries.map((e) => e.id))).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(view.result.current.hasNextPage).toBe(false);
  });

  it('keeps a separate list for each filter', async () => {
    jest.mocked(listJournal).mockResolvedValue({ entries: [], nextBefore: null });
    const { client, wrapper } = setup();
    await renderHook(() => useJournalList({}), { wrapper });
    await renderHook(() => useJournalList({ type: 'memory' }), { wrapper });
    await waitFor(() => expect(listJournal).toHaveBeenCalledTimes(2));
    expect(client.getQueryCache().findAll({ queryKey: ['journal', 'list'] })).toHaveLength(2);
  });

  it('loads one entry, and waits for an id', async () => {
    jest.mocked(getJournalEntry).mockResolvedValue(entry('e1'));
    const { wrapper } = setup();
    const view = await renderHook(() => useJournalEntry('e1'), { wrapper });
    await waitFor(() => expect(view.result.current.data).toEqual(entry('e1')));
    expect(getJournalEntry).toHaveBeenCalledWith('e1');

    await renderHook(() => useJournalEntry(undefined), { wrapper });
    expect(getJournalEntry).toHaveBeenCalledTimes(1);
  });

  it('loads the people to share with', async () => {
    jest.mocked(listSharePeople).mockResolvedValue([]);
    const { wrapper } = setup();
    const view = await renderHook(() => useSharePeople(), { wrapper });
    await waitFor(() => expect(view.result.current.data).toEqual([]));
  });
});

describe('journal mutations', () => {
  it('refresh everything about the journal after each change', async () => {
    jest.mocked(createJournalEntry).mockResolvedValue(entry('e1'));
    jest.mocked(updateJournalEntry).mockResolvedValue(entry('e1'));
    jest.mocked(deleteJournalEntry).mockResolvedValue(undefined);
    jest.mocked(setJournalShares).mockResolvedValue([]);
    jest.mocked(setJournalLove).mockResolvedValue({ count: 1, mine: true });
    jest.mocked(addJournalReply).mockResolvedValue({} as never);
    jest.mocked(deleteJournalReply).mockResolvedValue(undefined);
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    const run = async <T,>(
      hook: () => { mutateAsync: (v: T) => Promise<unknown>; isSuccess: boolean },
      vars: T,
    ) => {
      const view = await renderHook(hook, { wrapper });
      await act(async () => {
        await view.result.current.mutateAsync(vars);
      });
      await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    };
    await run(useCreateJournalEntry, {
      type: 'note' as const,
      emotion: 'sad' as const,
      title: 'T',
      body: '',
      photoIds: [],
    });
    await run(useUpdateJournalEntry, { id: 'e1', changes: { title: 'New' } });
    await run(useDeleteJournalEntry, 'e1');
    await run(useSetJournalShares, {
      id: 'e1',
      recipientIds: ['u2'],
      message: '',
      includePhotos: true,
    });
    await run(useSetJournalLove, { id: 'e1', on: true });
    await run(useAddJournalReply, { id: 'e1', body: 'Hi' });
    await run(useDeleteJournalReply, { id: 'e1', replyId: 'r1' });

    expect(invalidate).toHaveBeenCalledTimes(7);
    for (const [filters] of invalidate.mock.calls) expect(filters?.queryKey).toEqual(['journal']);
  });

  it('passes the right arguments to the API', async () => {
    jest.mocked(setJournalShares).mockResolvedValue([]);
    jest.mocked(setJournalLove).mockResolvedValue({ count: 0, mine: false });
    const { wrapper } = setup();
    const shares = await renderHook(() => useSetJournalShares(), { wrapper });
    await act(async () => {
      await shares.result.current.mutateAsync({
        id: 'e1',
        recipientIds: ['u2'],
        message: 'Hi',
        includePhotos: false,
      });
    });
    expect(setJournalShares).toHaveBeenCalledWith('e1', {
      recipientIds: ['u2'],
      message: 'Hi',
      includePhotos: false,
    });
    const love = await renderHook(() => useSetJournalLove(), { wrapper });
    await act(async () => {
      await love.result.current.mutateAsync({ id: 'e1', on: false });
    });
    expect(setJournalLove).toHaveBeenCalledWith('e1', false);
  });

  it('refreshes everything but the entry that was just deleted (it would only answer "not found")', async () => {
    jest.mocked(deleteJournalEntry).mockResolvedValue(undefined);
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const view = await renderHook(() => useDeleteJournalEntry(), { wrapper });
    await act(async () => {
      await view.result.current.mutateAsync('e1');
    });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));

    const { predicate } = invalidate.mock.calls[0][0] as unknown as {
      predicate: (query: { queryKey: unknown[] }) => boolean;
    };
    expect(predicate({ queryKey: ['journal', 'entry', 'e1'] })).toBe(false);
    expect(predicate({ queryKey: ['journal', 'entry', 'e2'] })).toBe(true);
    expect(predicate({ queryKey: ['journal', 'list', {}] })).toBe(true);
    expect(predicate({ queryKey: ['journal', 'people'] })).toBe(true);
  });

  it('does not refresh when the change failed', async () => {
    jest.mocked(deleteJournalEntry).mockRejectedValue(new Error('nope'));
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const view = await renderHook(() => useDeleteJournalEntry(), { wrapper });
    await act(async () => {
      await view.result.current.mutateAsync('e1').catch(() => undefined);
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
