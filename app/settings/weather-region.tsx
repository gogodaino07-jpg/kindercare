import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calendarTheme as t } from '../../components/calendar/calendarTheme';
import Text from '../../components/common/AppText';
import TextInput from '../../components/common/ClearableTextInput';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { WEATHER_REGIONS } from '../../constants/weatherRegions';
import { useAlert } from '../../context/AlertContext';
import { useThemeColors } from '../../context/ThemeContext';
import { invalidateWeatherCache } from '../../hooks/useWeeklyWeather';
import { useWeatherRegion } from '../../hooks/useWeatherRegion';

export default function WeatherRegionSettingsScreen() {
  const router = useRouter();
  const { region, setRegion } = useWeatherRegion();
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const applyQuickRegion = (code: string | null) => {
    if (!code) {
      setRegion(null);
    } else {
      const found = WEATHER_REGIONS.find((r) => r.code === code);
      if (found) setRegion({ code: found.code, label: found.label, latitude: found.latitude, longitude: found.longitude });
    }
    invalidateWeatherCache();
  };

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: '위치 권한이 필요해요', message: '구/동 검색을 사용하려면 위치 권한을 허용해주세요.' });
        return;
      }
      const results = await Location.geocodeAsync(trimmed);
      if (results.length === 0) {
        showAlert({ title: '위치를 찾지 못했어요', message: '다른 동/구 이름으로 다시 검색해주세요.' });
        return;
      }
      setRegion({ label: trimmed, latitude: results[0].latitude, longitude: results[0].longitude });
      invalidateWeatherCache();
      setQuery('');
    } catch {
      showAlert({ title: '검색 중 문제가 발생했어요', message: '잠시 후 다시 시도해주세요.' });
    } finally {
      setSearching(false);
    }
  };

  const isCustomActive = !!region && !region.code;

  return (
    <View style={styles.screenBg}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={t.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.fixedHeader}>
          <Text style={styles.subtitle}>홈 화면 날씨를 조회할 지역을 골라주세요. 자동을 고르면 기기 위치(GPS)를 사용해요.</Text>

          <Text style={styles.sectionLabel}>구/동까지 검색하기</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="예: 강남구 역삼동"
              placeholderTextColor={colors.gray400}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <Pressable style={styles.searchButton} onPress={handleSearch} disabled={searching}>
              {searching ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.searchButtonText}>검색</Text>}
            </Pressable>
          </View>

          {isCustomActive && (
            <View style={[styles.row, styles.rowActive]}>
              <View style={[styles.radio, styles.radioActive]}>
                <View style={styles.radioDot} />
              </View>
              <Text style={styles.rowLabel}>{region!.label}</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>주요 도시에서 선택하기</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.chipWrap}>
            <Pressable style={styles.chipAuto} onPress={() => applyQuickRegion(null)}>
              <MaterialCommunityIcons name="crosshairs-gps" size={14} color="#FFFFFF" style={styles.chipIcon} />
              <Text style={styles.chipTextAuto}>자동 (기기 위치 사용)</Text>
            </Pressable>

            {WEATHER_REGIONS.map((r) => {
              const isSelected = region?.code === r.code;
              return (
                <Pressable
                  key={r.code}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => applyQuickRegion(r.code)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenBg: { flex: 1, backgroundColor: t.bg },
    headerBackButton: { paddingHorizontal: 4 },
    safeArea: { flex: 1 },
    fixedHeader: { paddingHorizontal: 20, paddingTop: 20 },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 18,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
      marginTop: 8,
      marginBottom: 8,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.cardWhite,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary,
      ...SHADOW,
    },
    searchButton: {
      minWidth: 64,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingHorizontal: 16,
    },
    searchButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
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
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.cardWhite,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipAuto: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    chipIcon: {
      marginRight: 4,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    chipTextAuto: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
