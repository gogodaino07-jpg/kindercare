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

// 배경/테두리(둥근 모서리 포함)를 안드로이드 네이티브 EditText에 직접 그리면, 오른쪽
// 모서리만 둥근 정도가 왼쪽보다 덜 둥글게(각지게) 그려지는 렌더링 버그가 있었다
// (실기기 스크린샷으로 확인). 그래서 이 "박스처럼 보이는" 스타일은 감싸는 View로
// 옮기고, TextInput 자신은 배경 없이 그 안에 얹히기만 하게 한다.
const BOX_APPEARANCE_KEYS = [
  'backgroundColor',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderWidth',
  'borderColor',
  'borderStyle',
  'borderTopWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRightWidth',
  // 그림자(SHADOW 상수)도 같은 이유로 옮겨야 한다 — 안드로이드 elevation이 TextInput에
  // 남아있으면, 둥근 컨테이너 안쪽에서 각진 사각형 그림자가 따로 떠 보이는 이중 테두리
  // 현상이 그대로 재현된다(실기기로 재확인함).
  'elevation',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
] as const;

function splitStyle(style: StyleProp<TextStyle>) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const containerStyle: Record<string, unknown> = {};
  const inputStyle: Record<string, unknown> = {};
  for (const key of Object.keys(flat)) {
    if (
      (LAYOUT_ONLY_KEYS as readonly string[]).includes(key) ||
      (BOX_APPEARANCE_KEYS as readonly string[]).includes(key)
    ) {
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
          underlineColorAndroid="transparent"
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
    overflow: 'hidden',
  },
  input: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  paddingForClear: {
    paddingRight: 34,
  },
  paddingForClearMultiline: {
    paddingRight: 32,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonMultiline: {
    top: 12,
    bottom: undefined,
  },
});

export default ClearableTextInput;
