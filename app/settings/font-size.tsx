import Slider from '@react-native-community/slider';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import Text from '../../components/common/AppText';
import { FONT_SIZE_OPTIONS } from '../../constants/fontOptions';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { useThemeColors } from '../../context/ThemeContext';

export default function FontSizeSettingsScreen() {
  const { fontSizeChoice, setFontSizeChoice } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sliderIndex = FONT_SIZE_OPTIONS.findIndex((o) => o.id === fontSizeChoice);
  const activeOption = FONT_SIZE_OPTIONS[sliderIndex] ?? FONT_SIZE_OPTIONS[1];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>글자 크기</Text>
          <Text style={styles.subtitle}>앱 전체에 표시되는 글씨 크기를 골라주세요.</Text>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>미리보기</Text>
            <Text style={[styles.previewText, { fontSize: 18 * activeOption.scale }]}>
              7/20(월) 현장학습이 있어요
            </Text>
          </View>

          <View style={styles.sliderCard}>
            <Text style={styles.currentLabel}>{activeOption.label}</Text>
            <View style={styles.sliderRow}>
              <Text style={styles.endLabelSmall}>가</Text>
              <View style={styles.sliderTrackArea}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={FONT_SIZE_OPTIONS.length - 1}
                  step={1}
                  value={sliderIndex < 0 ? 2 : sliderIndex}
                  onValueChange={(value) => setFontSizeChoice(FONT_SIZE_OPTIONS[value].id)}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.accent}
                />
                <View style={styles.tickRow} pointerEvents="none">
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <View key={option.id} style={styles.tick} />
                  ))}
                </View>
              </View>
              <Text style={styles.endLabelLarge}>가</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: 20 },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    previewCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
      ...SHADOW,
    },
    previewLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    previewText: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    sliderCard: {
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 12,
      ...SHADOW,
    },
    currentLabel: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '800',
      color: colors.accent,
      marginBottom: 8,
    },
    sliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    endLabelSmall: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginRight: 6,
    },
    endLabelLarge: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textSecondary,
      marginLeft: 6,
    },
    sliderTrackArea: {
      flex: 1,
    },
    slider: {
      width: '100%',
      height: 40,
    },
    tickRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: -6,
      paddingHorizontal: 8,
    },
    tick: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
  });
}
