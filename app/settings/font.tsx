import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../../constants/fontOptions';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';

export default function FontSettingsScreen() {
  const { fontChoiceId, setFontChoiceId, fontSizeChoice } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const activeScale = FONT_SIZE_OPTIONS.find((o) => o.id === fontSizeChoice)?.scale ?? 1;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {FONT_OPTIONS.map((option) => {
            const isSelected = option.id === fontChoiceId;
            return (
              <Pressable
                key={option.id}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => setFontChoiceId(option.id)}
              >
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{option.label}</Text>
                  <Text
                    style={[
                      styles.preview,
                      { fontFamily: option.fontFamily, fontSize: 18 * activeScale },
                    ]}
                  >
                    7/20(월) 현장학습이 있어요
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      ...SHADOW,
    },
    rowSelected: {
      borderWidth: 2,
      borderColor: colors.accent,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    radioSelected: {
      borderColor: colors.accent,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    rowText: { flex: 1 },
    rowLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    preview: {
      fontSize: 18,
      color: colors.textPrimary,
    },
  });
}
