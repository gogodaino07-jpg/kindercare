import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import { SHADOW } from '../../constants/theme';
import { THEME_MODE_LABELS, ThemeMode, useTheme } from '../../context/ThemeContext';

const OPTIONS: ThemeMode[] = ['system', 'light', 'dark'];

export default function ThemeSettingsScreen() {
  const { mode, setMode, colors } = useTheme();

  return (
    <ScreenBackground style={{ backgroundColor: colors.skyBackground }}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          {OPTIONS.map((option) => {
            const isSelected = option === mode;
            return (
              <Pressable
                key={option}
                style={[
                  styles.row,
                  { backgroundColor: colors.cardWhite },
                  isSelected && { borderColor: colors.accent, borderWidth: 2 },
                ]}
                onPress={() => setMode(option)}
              >
                <View style={[styles.radio, { borderColor: isSelected ? colors.accent : colors.border }]}>
                  {isSelected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
                </View>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  {THEME_MODE_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    ...SHADOW,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
