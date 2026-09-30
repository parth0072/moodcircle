import { Share } from 'react-native';

import { inviteMessage } from './groups';

/**
 * Opens the phone's share sheet with an invitation to a group. Resolves when the sheet closes, whether
 * or not anything was sent; never throws, because sharing is a convenience (the code is always shown
 * in the group) and a browser without a share sheet must not stop the flow.
 */
export async function shareInvite(groupName: string, code: string): Promise<void> {
  try {
    await Share.share({ message: inviteMessage(groupName, code) });
  } catch {
    // No share sheet here, or it failed to open.
  }
}
