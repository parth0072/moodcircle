import { File } from 'expo-file-system';

import { readPhotoBytes } from './photo-bytes';

const mockArrayBuffer = jest.fn();

jest.mock('expo-file-system', () => ({
  File: jest
    .fn()
    .mockImplementation(() => ({ arrayBuffer: (...args: unknown[]) => mockArrayBuffer(...args) })),
}));

const photo = { uri: 'file:///cache/a.jpg', width: 10, height: 10, mimeType: 'image/jpeg' };

afterEach(() => jest.clearAllMocks());

describe('readPhotoBytes', () => {
  it("reads a phone's file through the file system", async () => {
    mockArrayBuffer.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const bytes = await readPhotoBytes(photo);
    expect(File).toHaveBeenCalledWith('file:///cache/a.jpg');
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("reads a browser's own File without touching the file system", async () => {
    const file = { arrayBuffer: async () => new Uint8Array([9, 8]).buffer } as unknown as Blob;
    const bytes = await readPhotoBytes({ ...photo, file });
    expect(File).not.toHaveBeenCalled();
    expect(Array.from(bytes)).toEqual([9, 8]);
  });
});
