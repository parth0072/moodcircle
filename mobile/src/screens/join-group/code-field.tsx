import { StyleSheet, TextInput } from 'react-native';

import { colors, fontFamily } from '@/theme';
import { normalizeCode } from '@/utils/groups';

interface CodeFieldProps {
  value: string;
  onChangeText: (code: string) => void;
  onSubmitEditing?: () => void;
  editable?: boolean;
}

/** The invite code box: big, centred and spaced out like the design; typing is upper-cased and trimmed. */
export function CodeField({
  value,
  onChangeText,
  onSubmitEditing,
  editable = true,
}: CodeFieldProps) {
  return (
    <TextInput
      accessibilityLabel="Invite code"
      value={value}
      onChangeText={(text) => onChangeText(normalizeCode(text))}
      onSubmitEditing={onSubmitEditing}
      editable={editable}
      placeholder="ABC123"
      placeholderTextColor={colors.placeholder}
      autoCapitalize="characters"
      autoCorrect={false}
      autoComplete="off"
      spellCheck={false}
      maxLength={16}
      returnKeyType="go"
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 64,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    color: colors.ink,
    textAlign: 'center',
    fontFamily: fontFamily.display.bold,
    fontSize: 26,
    letterSpacing: 3,
    outlineWidth: 0,
  },
});
