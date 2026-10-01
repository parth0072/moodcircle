import * as ImagePicker from 'expo-image-picker';

import { pickPhotos, toPickedPhoto } from './pick-photos';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));

const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;

const asset = (over: Record<string, unknown> = {}) => ({
  uri: 'file:///cache/IMG_1.jpg',
  width: 4032,
  height: 3024,
  mimeType: 'image/jpeg',
  fileName: 'IMG_1.jpg',
  ...over,
});

afterEach(() => jest.clearAllMocks());

describe('toPickedPhoto', () => {
  it('keeps the size and a type the server accepts', () => {
    expect(toPickedPhoto(asset() as never)).toMatchObject({
      uri: 'file:///cache/IMG_1.jpg',
      width: 4032,
      height: 3024,
      mimeType: 'image/jpeg',
    });
  });

  it.each([
    ['image/png', 'x.png', 'image/png'],
    ['image/webp', 'x.webp', 'image/webp'],
    ['image/jpg', 'x.jpg', 'image/jpeg'],
    ['IMAGE/JPEG', 'x.jpg', 'image/jpeg'],
    // a type the server would refuse: fall back to the file name, then to JPEG
    ['image/heic', 'x.png', 'image/png'],
    ['image/heic', 'x.heic', 'image/jpeg'],
    [undefined, 'x.webp', 'image/webp'],
    [undefined, undefined, 'image/jpeg'],
  ])('maps type %s of file %s to %s', (mimeType, fileName, expected) => {
    expect(toPickedPhoto(asset({ mimeType, fileName }) as never).mimeType).toBe(expected);
  });

  it('passes a browser File along', () => {
    const file = new Blob(['x']);
    expect(toPickedPhoto(asset({ file }) as never).file).toBe(file);
  });
});

describe('pickPhotos', () => {
  it('opens the library for images only, several at a time, in the order chosen', async () => {
    launch.mockResolvedValue({
      canceled: false,
      assets: [asset(), asset({ uri: 'file:///b.jpg' })],
    });
    const photos = await pickPhotos(4);
    expect(launch).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 4,
        orderedSelection: true,
        quality: 0.8,
        preferredAssetRepresentationMode: 'compatible',
      }),
    );
    expect(photos.map((p) => p.uri)).toEqual(['file:///cache/IMG_1.jpg', 'file:///b.jpg']);
  });

  it('is empty when the person backs out', async () => {
    launch.mockResolvedValue({ canceled: true, assets: null });
    await expect(pickPhotos(3)).resolves.toEqual([]);
  });

  it('never opens the library when there is no room', async () => {
    await expect(pickPhotos(0)).resolves.toEqual([]);
    expect(launch).not.toHaveBeenCalled();
  });

  it('keeps to the limit when a browser lets more be chosen', async () => {
    launch.mockResolvedValue({ canceled: false, assets: [asset(), asset(), asset()] });
    await expect(pickPhotos(2)).resolves.toHaveLength(2);
  });

  it('asks for one photo at a time when only one fits', async () => {
    launch.mockResolvedValue({ canceled: false, assets: [asset()] });
    await pickPhotos(1);
    expect(launch).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: false }),
    );
  });
});
