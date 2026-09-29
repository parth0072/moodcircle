import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { AVATARS } from '@/constants/avatars';
import { useUpdateProfile } from '@/hooks/use-profile';
import { useSessionStore } from '@/stores/session-store';
import { describeError } from '@/utils/error-message';

import { AvatarPicker } from './avatar-picker';

const MIN_USERNAME = 3;

interface ProfileSetupScreenProps {
  /** True on the onboarding step: a first save also queues the one-time "what makes you feel good" prompt. */
  firstSetup?: boolean;
  onSaved?: () => void;
}

/** Name, username and emoji avatar (web `#s-profile-setup`). Usernames are lower-case letters, digits, underscore. */
export function ProfileSetupScreen({ firstSetup = false, onSaved }: ProfileSetupScreenProps) {
  const user = useSessionStore((s) => s.user);
  const [avatar, setAvatar] = useState<string>(user?.avatar ?? AVATARS[0]);
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateProfile({ firstSetup });

  const submit = async () => {
    if (update.isPending) return;
    const displayName = name.trim();
    setNameError(null);
    setUsernameError(null);
    setError(null);
    if (!displayName) return setNameError('Enter your display name');
    if (username && username.length < MIN_USERNAME) {
      return setUsernameError(`Username must be at least ${MIN_USERNAME} characters`);
    }
    try {
      await update.mutateAsync({ name: displayName, username: username || undefined, avatar });
      onSaved?.();
    } catch (e) {
      if (isApiError(e) && e.code === 'USERNAME_TAKEN') setUsernameError('That username is taken');
      else setError(describeError(e, 'Failed to save profile'));
    }
  };

  return (
    <Screen align="start">
      <AppText variant="displayTitle">Set up your profile</AppText>
      <AppText color="textSecondary" style={styles.sub}>
        Your friends will see this in the mood feed.
      </AppText>

      <AvatarPicker value={avatar} onChange={setAvatar} />

      <View style={styles.form}>
        <TextField
          label="Display name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alex"
          maxLength={40}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          error={nameError}
        />
        <TextField
          label="Username"
          prefix="@"
          value={username}
          onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="yourname"
          maxLength={20}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={usernameError}
        />
        {error ? (
          <AppText variant="label" color="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        <Button title="Continue" onPress={submit} loading={update.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: 6, marginBottom: 32 },
  form: { gap: 14 },
});
