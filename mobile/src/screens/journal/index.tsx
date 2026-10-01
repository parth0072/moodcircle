import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { RoundButton } from '@/components/round-button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { SEARCH_MAX, type EntryType } from '@/constants/journal';
import { useDebounced } from '@/hooks/use-debounced';
import { useJournalList } from '@/hooks/use-journal';
import { colors, radius } from '@/theme';
import { describeError } from '@/utils/error-message';

import { EntryCard } from './entry-card';

type Filter = 'all' | EntryType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'note', label: 'Notes' },
  { value: 'memory', label: 'Memories' },
];

const EMPTY_TEXT: Record<Filter, string> = {
  all: 'Write a note for a hard day, or keep a memory of a good one.',
  note: 'No notes yet. Write one for a hard day.',
  memory: 'No memories yet. Keep one of a good day, with its photos.',
};

interface JournalScreenProps {
  onBack: () => void;
  /** "Write it down": a new note or memory. */
  onWrite: () => void;
  onOpen: (entryId: string) => void;
}

/** "Journal": your notes and memories, and the ones friends shared with you, newest first. */
export function JournalScreen({ onBack, onWrite, onOpen }: JournalScreenProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [text, setText] = useState('');
  const words = useDebounced(text.trim(), 400);
  const list = useJournalList({
    type: filter === 'all' ? undefined : filter,
    q: words || undefined,
  });
  const entries = list.data?.pages.flatMap((page) => page.entries) ?? [];

  const toggleSearch = () => {
    setSearching((on) => !on);
    setText('');
  };

  return (
    <Screen
      background="background"
      align="start"
      footer={<Button title="Write it down" icon="edit" onPress={onWrite} style={styles.cta} />}
    >
      <View style={styles.header}>
        <RoundButton icon="chevron-left" label="Back" onPress={onBack} />
        <RoundButton
          icon={searching ? 'x' : 'search'}
          label={searching ? 'Close search' : 'Search entries'}
          onPress={toggleSearch}
        />
      </View>

      <AppText variant="headlineLg" accessibilityRole="header" style={styles.title}>
        Journal
      </AppText>
      {searching ? (
        <View style={styles.search}>
          <TextField
            label="Search your journal"
            hideLabel
            value={text}
            onChangeText={setText}
            placeholder="Search your journal"
            maxLength={SEARCH_MAX}
            returnKeyType="search"
            autoFocus
          />
        </View>
      ) : (
        <AppText color="textSecondary" style={styles.intro}>
          Notes for hard days, memories for good ones.
        </AppText>
      )}

      <View accessibilityRole="radiogroup" accessibilityLabel="Filter entries" style={styles.chips}>
        {FILTERS.map(({ value, label }) => (
          <Chip
            key={value}
            role="radio"
            label={label}
            selected={filter === value}
            onPress={() => setFilter(value)}
          />
        ))}
      </View>

      {list.isPending ? (
        <ActivityIndicator accessibilityLabel="Loading your journal" style={styles.status} />
      ) : list.isError && entries.length === 0 ? (
        <View style={styles.status}>
          <AppText color="textSecondary">
            {describeError(list.error, 'Could not load your journal.')}
          </AppText>
          <Button title="Try again" variant="outline" onPress={() => void list.refetch()} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="titleMd">{words ? 'Nothing found' : 'Nothing here yet'}</AppText>
          <AppText color="textSecondary">
            {words ? `No entry matches “${words}”.` : EMPTY_TEXT[filter]}
          </AppText>
        </View>
      ) : (
        // The cards sit 16 from the screen edge in the design, 8 wider than the text above them. They
        // fade while the list for a new filter or search is on its way.
        <View style={[styles.list, { opacity: list.isPlaceholderData ? 0.5 : 1 }]}>
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onPress={() => onOpen(entry.id)} />
          ))}
          {list.isFetchNextPageError ? (
            <AppText color="danger" accessibilityRole="alert" style={styles.more}>
              Could not load older entries.
            </AppText>
          ) : null}
          {list.hasNextPage ? (
            <Button
              title="Show older entries"
              variant="outline"
              loading={list.isFetchingNextPage}
              onPress={() => void list.fetchNextPage()}
              style={styles.more}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: 22 },
  intro: { marginTop: 8 },
  search: { marginTop: 8 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap' },
  status: { marginTop: 32, gap: 16, alignItems: 'stretch' },
  empty: {
    marginTop: 24,
    gap: 6,
    padding: 18,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.sand,
  },
  list: { marginTop: 20, marginHorizontal: -8, gap: 12 },
  more: { marginTop: 4, marginHorizontal: 8 },
  cta: { minHeight: 58 },
});
