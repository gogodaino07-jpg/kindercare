import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import { FONT_SIZE_OPTIONS } from '../../constants/fontOptions';
import { COLORS, SHADOW } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';

export default function FontSizeSettingsScreen() {
  const { fontSizeChoice, setFontSizeChoice } = useAppData();
  const activeScale = FONT_SIZE_OPTIONS.find((o) => o.id === fontSizeChoice)?.scale ?? 1;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>글자 크기</Text>
          <Text style={styles.subtitle}>칠판 팝업에 표시되는 글씨 크기를 골라주세요</Text>

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
                    style={[styles.sizeButtonText, isSelected && styles.sizeButtonTextSelected]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>미리보기</Text>
            <Text style={[styles.previewText, { fontSize: 18 * activeScale }]}>
              7/20(월) 현장학습이 있어요
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20 },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 20,
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
  previewCard: {
    marginTop: 24,
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    padding: 16,
    ...SHADOW,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  previewText: {
    color: COLORS.textPrimary,
  },
});
