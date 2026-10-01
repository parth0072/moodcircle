import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import type { EntryType } from '@/constants/journal';
import { useJournalEntry } from '@/hooks/use-journal';
import { describeError } from '@/utils/error-message';

import { EntryForm } from './entry-form';

interface WriteEntryScreenProps {
  /** Changing this entry; omitted for a new one. */
  entryId?: string;
  /** What a new entry starts as. */
  initialType?: EntryType;
  onClose: () => void;
  onSaved: (entryId: string) => void;
  onShare: (entryId: string) => void;
  onChangeSharing: (entryId: string) => void;
  onDeleted: () => void;
}

/**
 * "Write a note or memory". A new entry opens at once; an old one is loaded first, and the form
 * starts from what was loaded (so a refetch while typing never overwrites the draft).
 */
export function WriteEntryScreen({
  entryId,
  initialType = 'note',
  onClose,
  onSaved,
  onShare,
  onChangeSharing,
  onDeleted,
}: WriteEntryScreenProps) {
  const existing = useJournalEntry(entryId);

  if (entryId && !existing.data) {
    return (
      <Screen background="background" align="start">
        <View style={styles.header}>
          <RoundButton icon="x" label="Close" onPress={onClose} />
        </View>
        {existing.isError ? (
          <View style={styles.status}>
            <AppText color="textSecondary">
              {describeError(existing.error, 'Could not load that entry.')}
            </AppText>
            <Button title="Try again" variant="outline" onPress={() => void existing.refetch()} />
          </View>
        ) : (
          <ActivityIndicator accessibilityLabel="Loading the entry" style={styles.status} />
        )}
      </Screen>
    );
  }

  return (
    <EntryForm
      key={existing.data?.id ?? 'new'}
      entry={existing.data}
      initialType={initialType}
      onClose={onClose}
      onSaved={onSaved}
      onShare={onShare}
      onChangeSharing={onChangeSharing}
      onDeleted={onDeleted}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  status: { marginTop: 32, gap: 16, alignItems: 'stretch' },
});
