import { StyleSheet } from 'react-native';

import { endSession } from '@/api';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { useSessionStore } from '@/stores/session-store';

// PLACEHOLDER. The next slice replaces this with the (tabs) group and the Home feed; sign-out
// then moves to the Me tab. It shows who is signed in and offers sign-out so sign-in can be
// tried again and again on a device.
export default function Home() {
  const user = useSessionStore((s) => s.user);
  return (
    <Screen background="background">
      <AppText variant="displayMd">Home (placeholder)</AppText>
      <AppText color="textSecondary" style={styles.sub} selectable>
        Signed in as {user?.name} ({user?.email})
      </AppText>
      <Button title="Sign out" variant="outline" onPress={() => void endSession()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: 6, marginBottom: 24 },
});
