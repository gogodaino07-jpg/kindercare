import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../../components/ScreenBackground';
import Text from '../../components/common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { WEATHER_REGIONS } from '../../constants/weatherRegions';
import { useThemeColors } from '../../context/ThemeContext';
import { invalidateWeatherCache } from '../../hooks/useWeeklyWeather';
import { useWeatherRegion } from '../../hooks/useWeatherRegion';

export default function WeatherRegionSettingsScreen() {
  const { regionCode, setRegionCode } = useWeatherRegion();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSelect = (code: string | null) => {
    setRegionCode(code);
    invalidateWeatherCache();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>홈 화면 날씨를 조회할 지역을 골라주세요. 자동을 고르면 기기 위치(GPS)를 사용해요.</Text>

          <Pressable
            style={[styles.row, regionCode === null && styles.rowActive]}
            onPress={() => handleSelect(null)}
          >
            <View style={[styles.radio, regionCode === null && styles.radioActive]}>
              {regionCode === null ? <View style={styles.radioDot} /> : null}
            </View>
            <Text style={styles.rowLabel}>자동 (기기 위치 사용)</Text>
          </Pressable>

          {WEATHER_REGIONS.map((region) => {
            const isSelected = regionCode === region.code;
            return (
              <Pressable
                key={region.code}
                style={[styles.row, isSelected && styles.rowActive]}
                onPress={() => handleSelect(region.code)}
              >
                <View style={[styles.radio, isSelected && styles.radioActive]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.rowLabel}>{region.label}</Text>
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
    content: { padding: 20, paddingBottom: 40 },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 18,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      backgroundColor: colors.cardWhite,
      ...SHADOW,
    },
    rowActive: {
      borderColor: colors.accent,
      borderWidth: 2,
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
    radioActive: {
      borderColor: colors.accent,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
  });
}
