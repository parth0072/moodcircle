import { useLocalSearchParams, useRouter } from 'expo-router';

import { ENTRY_TYPES, type EntryType } from '@/constants/journal';
import { WriteEntryScreen } from '@/screens/write-entry';

export default function WriteEntryRoute() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();
  const initialType = ENTRY_TYPES.find((t): t is EntryType => t === type) ?? 'note';
  return (
    <WriteEntryScreen
      entryId={id}
      initialType={initialType}
      onClose={() => router.back()}
      onSaved={() => router.back()}
      // The writing screen is replaced, so closing the share screen lands on the entry, not the form.
      onShare={(entryId) =>
        router.replace({ pathname: '/share-entry/[id]', params: { id: entryId, then: 'entry' } })
      }
      onChangeSharing={(entryId) =>
        router.push({ pathname: '/share-entry/[id]', params: { id: entryId } })
      }
      onDeleted={() => router.dismissTo('/journal')}
    />
  );
}
