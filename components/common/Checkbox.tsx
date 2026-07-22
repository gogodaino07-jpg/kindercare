import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import Text from './AppText';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Checkbox({ checked, onToggle, size = 22, style }: CheckboxProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxChecked: {
      backgroundColor: colors.coralPink,
      borderColor: colors.coralPink,
    },
    mark: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
  });
}
