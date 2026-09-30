import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { accents, colors, radius, type } from '@/theme';

import { AppText } from './app-text';

interface TextFieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
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
  | 'multiline'
> {
  label: string;
  /** A password field: the text is hidden, with a Show/Hide button inside the field. */
  secure?: boolean;
  error?: string | null;
  testID?: string;
}

/** Labelled input from the design: 52 high, 16 radius, 1.5 tan border, brand border on focus. */
export function TextField({ label, secure, error, testID, multiline, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <View>
        <TextInput
          {...input}
          multiline={multiline}
          testID={testID}
          accessibilityLabel={label}
          secureTextEntry={secure && !shown}
          placeholderTextColor={colors.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            multiline ? styles.multiline : null,
            secure ? styles.inputSecure : null,
            focused ? styles.inputFocused : null,
            error ? styles.inputError : null,
          ]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Hide password' : 'Show password'}
            hitSlop={6}
            onPress={() => setShown((s) => !s)}
            style={styles.toggle}
          >
            <AppText variant="linkBold" color="brand">
              {shown ? 'Hide' : 'Show'}
            </AppText>
          </Pressable>
        ) : null}
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
  input: {
    ...type.input,
    minHeight: 52,
    paddingHorizontal: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.field,
    borderCurve: 'continuous',
    outlineWidth: 0, // the brand-coloured border already shows focus; no second browser ring
  },
  multiline: { minHeight: 76, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top' },
  inputSecure: { paddingRight: 72 },
  inputFocused: { borderColor: colors.brand },
  inputError: { borderColor: accents.danger },
  toggle: {
    position: 'absolute',
    top: 4,
    right: 4,
    height: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
});
