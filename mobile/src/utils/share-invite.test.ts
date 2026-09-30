import { Share } from 'react-native';

import { shareInvite } from './share-invite';

afterEach(() => jest.restoreAllMocks());

describe('shareInvite', () => {
  it('offers the invitation, with the group and its code, to the share sheet', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    await shareInvite('Sunday Circle', 'A1B2C3');
    expect(share).toHaveBeenCalledTimes(1);
    const message = share.mock.calls[0][0].message ?? '';
    expect(message).toContain('Sunday Circle');
    expect(message).toContain('A1B2C3');
  });

  it('carries on when there is no share sheet to open', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('Share is not supported'));
    await expect(shareInvite('Sunday Circle', 'A1B2C3')).resolves.toBeUndefined();
  });
});
