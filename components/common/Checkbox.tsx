import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/theme';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Checkbox({ checked, onToggle, size = 22, style }: CheckboxProps) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size * 0.3 },
        checked && styles.boxChecked,
        style,
      ]}
    >
      {checked ? <Text style={[styles.mark, { fontSize: size * 0.6 }]}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: COLORS.coralPink,
    borderColor: COLORS.coralPink,
  },
  mark: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
