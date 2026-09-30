import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createEntry, deleteEntry, listEntries, updateEntry } from '@/api/entries';
import { createQueryWrapper, createTestQueryClient } from '@/test-utils/query-wrapper';

import { useCreateEntry, useDeleteEntry, useEntries, useUpdateEntry } from './use-entries';

jest.mock('@/api/entries', () => ({
  createEntry: jest.fn(),
  listEntries: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  getEntryStats: jest.fn(),
}));

const entry = {
  id: 'e1',
  emotion: 'joy' as const,
  intensity: 3,
  tags: [],
  note: '',
  date: '2026-09-30',
  createdAt: '2026-09-30T15:00:00.000Z',
  updatedAt: '2026-09-30T15:00:00.000Z',
};

function setup() {
  const client = createTestQueryClient();
  return { client, wrapper: createQueryWrapper(client) };
}

beforeEach(() => {
  for (const fn of [createEntry, listEntries, updateEntry, deleteEntry])
    jest.mocked(fn).mockReset();
});

describe('entry hooks', () => {
  it('loads a range', async () => {
    jest.mocked(listEntries).mockResolvedValue([entry]);
    const { wrapper } = setup();
    const view = await renderHook(() => useEntries('2026-09-30', '2026-09-30'), { wrapper });
    await waitFor(() => expect(view.result.current.data).toEqual([entry]));
    expect(listEntries).toHaveBeenCalledWith('2026-09-30', '2026-09-30');
  });

  it('refreshes every entries query and every group screen after a create, an update and a delete', async () => {
    jest.mocked(createEntry).mockResolvedValue(entry);
    jest.mocked(updateEntry).mockResolvedValue(entry);
    jest.mocked(deleteEntry).mockResolvedValue(undefined);
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    const create = await renderHook(() => useCreateEntry(), { wrapper });
    await act(async () => {
      await create.result.current.mutateAsync({ emotion: 'joy', intensity: 3, date: '2026-09-30' });
    });
    const update = await renderHook(() => useUpdateEntry(), { wrapper });
    await act(async () => {
      await update.result.current.mutateAsync({ id: 'e1', patch: { intensity: 4 } });
    });
    const remove = await renderHook(() => useDeleteEntry(), { wrapper });
    await act(async () => {
      await remove.result.current.mutateAsync('e1');
    });

    // Each change refreshes the entries, and the groups too: the server can share the day's mood with them.
    expect(invalidate).toHaveBeenCalledTimes(6);
    expect(
      invalidate.mock.calls.filter(([filters]) => filters?.queryKey?.[0] === 'entries'),
    ).toHaveLength(3);
    expect(
      invalidate.mock.calls.filter(([filters]) => filters?.queryKey?.[0] === 'groups'),
    ).toHaveLength(3);
  });

  it('does not refresh anything when a save fails', async () => {
    jest.mocked(createEntry).mockRejectedValue(new Error('offline'));
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const create = await renderHook(() => useCreateEntry(), { wrapper });
    await act(async () => {
      await create.result.current
        .mutateAsync({ emotion: 'joy', intensity: 3, date: '2026-09-30' })
        .catch(() => undefined);
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
