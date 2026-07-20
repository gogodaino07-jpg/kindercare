import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import { COLORS, SHADOW } from '../../constants/theme';
import { FONT_OPTIONS, FONT_SIZE_OPTIONS } from '../../constants/fontOptions';
import { useAppData } from '../../context/AppDataContext';

export default function FontSettingsScreen() {
  const { fontChoiceId, setFontChoiceId, fontSizeChoice, setFontSizeChoice } = useAppData();
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

          <Text style={styles.sectionLabel}>글씨 크기</Text>
          <View style={styles.sizeRow}>
            {FONT_SIZE_OPTIONS.map((option) => {
              const isSelected = option.id === fontSizeChoice;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.sizeButton, isSelected && styles.sizeButtonSelected]}
                  onPress={() => setFontSizeChoice(option.id)}
                >
                  <Text
                    style={[
                      styles.sizeButtonText,
                      isSelected && styles.sizeButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
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
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...SHADOW,
  },
  rowSelected: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioSelected: {
    borderColor: COLORS.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  preview: {
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.cardWhite,
    ...SHADOW,
  },
  sizeButtonSelected: {
    backgroundColor: COLORS.accent,
  },
  sizeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sizeButtonTextSelected: {
    color: '#FFFFFF',
  },
});
