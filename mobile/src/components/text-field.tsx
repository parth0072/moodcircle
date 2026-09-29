import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { accents, colors, radius, type } from '@/theme';

import { AppText } from './app-text';

interface TextFieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'textContentType'
  | 'maxLength'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'editable'
  | 'autoFocus'
> {
  label: string;
  /** Keep the label for screen readers but do not draw it (a field whose purpose is obvious, like "Add your own"). */
  hideLabel?: boolean;
  /** Shown in a box on the left, like the web's "@" before a username. */
  prefix?: string;
  error?: string | null;
  testID?: string;
}

/** Labelled input from the web `.field` + `.input`: 15 px text, `borderStrong` border, brand border on focus. */
export function TextField({ label, hideLabel, prefix, error, testID, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {hideLabel ? null : (
        <AppText variant="label" color="textSecondary">
          {label}
        </AppText>
      )}
      <View style={styles.row}>
        {prefix ? (
          <View style={styles.prefix}>
            <AppText variant="bodyStrong" color="textSecondary">
              {prefix}
            </AppText>
          </View>
        ) : null}
        <TextInput
          {...input}
          testID={testID}
          accessibilityLabel={label}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            prefix ? styles.inputWithPrefix : null,
            focused ? styles.inputFocused : null,
            error ? styles.inputError : null,
          ]}
        />
      </View>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  prefix: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: colors.borderStrong,
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
  },
  input: {
    ...type.body,
    flex: 1,
    minHeight: 46,
    paddingVertical: 11,
    paddingHorizontal: 13,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    outlineWidth: 0, // the brand-coloured border already shows focus; no second browser ring
  },
  inputWithPrefix: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  inputFocused: { borderColor: colors.brand },
  inputError: { borderColor: accents.danger },
});
