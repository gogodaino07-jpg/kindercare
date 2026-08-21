import { MaterialIcons } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, TextInputProps, TextStyle, View } from 'react-native';

/**
 * Style keys that describe the widget's own box in its parent's layout (not its
 * visual look) — these move to the wrapping container so `flex`/`width`/margins
 * keep working exactly as before. Flex keys must NOT also stay on the inner
 * TextInput: giving a single-line input both `flex:1` (from a row layout like a
 * search box next to a button) and `width:'100%'` at once made RN/Yoga on
 * Android compute a bad height for the native EditText — the box, border and
 * clear button still rendered fine, but the typed text itself was invisible.
 * Sizing purely through the container avoids that conflict; a multiline field
 * that needs to fill its own flexed height still can via its own `minHeight`.
 */
const LAYOUT_ONLY_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'width',
  'minWidth',
  'maxWidth',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'alignSelf',
] as const;

function splitStyle(style: StyleProp<TextStyle>) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const containerStyle: Record<string, unknown> = {};
  const inputStyle: Record<string, unknown> = {};
  for (const key of Object.keys(flat)) {
    if ((LAYOUT_ONLY_KEYS as readonly string[]).includes(key)) {
      containerStyle[key] = flat[key];
    } else {
      inputStyle[key] = flat[key];
    }
  }
  return { containerStyle, inputStyle };
}

/**
 * Drop-in replacement for RN's `TextInput` that shows a small semi-transparent
 * X button at the right edge once the user has typed at least one character,
 * clearing the field on tap. Hidden whenever the field is empty.
 *
 * Import this AS `TextInput` (`import TextInput from '.../ClearableTextInput'`)
 * so call sites don't need other changes — only the import line does.
 */
const ClearableTextInput = forwardRef<TextInput, TextInputProps>(
  ({ style, value, onChangeText, multiline, ...rest }, ref) => {
    const showClear = !!value && value.length > 0 && !!onChangeText;
    const { containerStyle, inputStyle } = splitStyle(style);

    return (
      <View style={[styles.container, containerStyle]}>
        <TextInput
          ref={ref}
          style={[inputStyle, styles.input, showClear && (multiline ? styles.paddingForClearMultiline : styles.paddingForClear)]}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          {...rest}
        />
        {showClear && (
          <Pressable
            style={[styles.clearButton, multiline && styles.clearButtonMultiline]}
            onPress={() => onChangeText?.('')}
            hitSlop={8}
          >
            <MaterialIcons name="cancel" size={18} color="rgba(100, 116, 139, 0.55)" />
          </Pressable>
        )}
      </View>
    );
  }
);

ClearableTextInput.displayName = 'ClearableTextInput';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
  },
  paddingForClear: {
    paddingRight: 34,
  },
  paddingForClearMultiline: {
    paddingRight: 30,
  },
  clearButton: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonMultiline: {
    top: 8,
    bottom: undefined,
  },
});

export default ClearableTextInput;
