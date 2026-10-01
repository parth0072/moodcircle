import { act, renderHook, waitFor } from '@testing-library/react-native';

import { uploadJournalPhoto } from '@/api/journal';
import type { JournalPhoto } from '@/api/schemas/journal';
import type { PickedPhoto } from '@/utils/pick-photos';

import { usePhotoDraft } from './use-photo-draft';

jest.mock('@/api/journal', () => ({ uploadJournalPhoto: jest.fn() }));

const upload = jest.mocked(uploadJournalPhoto);

const picked = (n: number): PickedPhoto => ({
  uri: `file:///cache/${n}.jpg`,
  width: 100,
  height: 100,
  mimeType: 'image/jpeg',
});

const saved = (id: string): JournalPhoto => ({
  id,
  url: `https://api.test/api/journal/photos/${id}/file`,
  width: 100,
  height: 100,
});

beforeEach(() => upload.mockReset());

describe('usePhotoDraft', () => {
  it('starts with the photos an entry already has, ready to keep', async () => {
    const view = await renderHook(() => usePhotoDraft([saved('a'), saved('b')]));
    expect(view.result.current.photos.map((p) => [p.key, p.status])).toEqual([
      ['a', 'ready'],
      ['b', 'ready'],
    ]);
    expect(view.result.current.ids).toEqual(['a', 'b']);
    expect(upload).not.toHaveBeenCalled();
  });

  it('shows a chosen photo at once, uploads it, and then offers its id', async () => {
    let finish: (p: JournalPhoto) => void = () => undefined;
    upload.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const view = await renderHook(() => usePhotoDraft());

    await act(async () => view.result.current.add([picked(1)]));
    expect(view.result.current.photos[0]).toMatchObject({
      uri: 'file:///cache/1.jpg',
      status: 'uploading',
    });
    expect(view.result.current.uploading).toBe(true);
    expect(view.result.current.ids).toEqual([]); // not on the server yet: not saved with the entry

    await act(async () => finish(saved('p1')));
    expect(view.result.current.photos[0]).toMatchObject({
      uri: 'file:///cache/1.jpg', // the local file stays: no flicker when the upload ends
      status: 'ready',
      id: 'p1',
    });
    expect(view.result.current.uploading).toBe(false);
    expect(view.result.current.ids).toEqual(['p1']);
  });

  it('keeps the order the photos were chosen in, whichever upload ends first', async () => {
    const finish: Record<string, (p: JournalPhoto) => void> = {};
    upload.mockImplementation((p) => new Promise((resolve) => (finish[p.uri] = resolve)));
    const view = await renderHook(() => usePhotoDraft());
    await act(async () => view.result.current.add([picked(1), picked(2)]));
    await act(async () => finish['file:///cache/2.jpg'](saved('second')));
    await act(async () => finish['file:///cache/1.jpg'](saved('first')));
    expect(view.result.current.ids).toEqual(['first', 'second']);
  });

  it('marks a failed upload, and a retry sends the same photo again', async () => {
    upload.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(saved('p1'));
    const view = await renderHook(() => usePhotoDraft());
    await act(async () => view.result.current.add([picked(1)]));
    await waitFor(() => expect(view.result.current.photos[0].status).toBe('failed'));
    expect(view.result.current.failed).toBe(true);
    expect(view.result.current.ids).toEqual([]);

    await act(async () => view.result.current.retry(view.result.current.photos[0].key));
    await waitFor(() => expect(view.result.current.photos[0].status).toBe('ready'));
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenLastCalledWith(picked(1));
    expect(view.result.current.failed).toBe(false);
  });

  it('removes a photo, whether it was saved before or just chosen', async () => {
    upload.mockResolvedValue(saved('p1'));
    const view = await renderHook(() => usePhotoDraft([saved('a')]));
    await act(async () => view.result.current.add([picked(1)]));
    await waitFor(() => expect(view.result.current.ids).toEqual(['a', 'p1']));
    await act(async () => view.result.current.remove('a'));
    expect(view.result.current.ids).toEqual(['p1']);
    await act(async () => view.result.current.remove(view.result.current.photos[0].key));
    expect(view.result.current.photos).toEqual([]);
  });

  it('holds six photos at most and says when it is full', async () => {
    upload.mockResolvedValue(saved('x'));
    const view = await renderHook(() =>
      usePhotoDraft([saved('a'), saved('b'), saved('c'), saved('d')]),
    );
    expect(view.result.current.full).toBe(false);
    await act(async () => view.result.current.add([picked(1), picked(2), picked(3)]));
    expect(view.result.current.photos).toHaveLength(6); // only two of the three fit
    expect(upload).toHaveBeenCalledTimes(2);
    expect(view.result.current.full).toBe(true);
    await act(async () => view.result.current.add([picked(4)]));
    expect(view.result.current.photos).toHaveLength(6);
  });
});
