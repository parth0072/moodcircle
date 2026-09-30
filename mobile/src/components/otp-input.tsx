import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, radius } from '@/theme';

import { AppText } from './app-text';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  editable?: boolean;
}

/**
 * Six digit boxes (the web's `.otp-d`) driven by ONE real text input laid over them. A single
 * input is what makes paste and iOS one-time-code autofill work; six separate inputs cannot
 * receive a pasted code. Boxes are decorative; the input carries the accessibility label.
 * Digits only: everything else is dropped as it is typed or pasted.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  editable = true,
}: OtpInputProps) {
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);

  return (
    <View style={styles.wrap}>
      <View
        style={styles.row}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={[
              styles.box,
              value[i] ? styles.boxFilled : null,
              focused && i === active ? styles.boxActive : null,
            ]}
          >
            <AppText variant="titleLg">{value[i] ?? ''}</AppText>
          </View>
        ))}
      </View>
      <TextInput
        testID="otp-input"
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        editable={editable}
        caretHidden
        selectionColor="transparent"
        accessibilityLabel={`Verification code, ${length} digits`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 54 },
  row: { flexDirection: 'row', gap: 8, height: 54 },
  box: {
    flex: 1,
    minWidth: 0,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.field,
    borderCurve: 'continuous',
  },
  boxFilled: { borderColor: colors.ink },
  boxActive: { borderColor: colors.brand },
  // Sits over the boxes, invisible but real: it keeps focus, paste and autofill behaviour.
  input: {
    ...StyleSheet.absoluteFill,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 22,
    outlineWidth: 0,
  },
});
