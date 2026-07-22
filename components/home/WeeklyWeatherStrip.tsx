import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { useWeeklyWeather } from '../../hooks/useWeeklyWeather';
import WeatherDayCard from './WeatherDayCard';

export default function WeeklyWeatherStrip() {
  const { days, loading, error, retry, usingFallbackLocation } = useWeeklyWeather();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const refreshButton = (
    <Pressable
      style={styles.refreshButton}
      onPress={retry}
      disabled={loading}
      accessibilityLabel="날씨 새로고침"
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Text style={styles.refreshIcon}>↻</Text>
      )}
    </Pressable>
  );

  if (loading && !days) {
    return (
      <View>
        <View style={styles.headerRow}>{refreshButton}</View>
        <View style={styles.statusContainer}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    );
  }

  if (error || !days) {
    return (
      <View>
        <View style={styles.headerRow}>{refreshButton}</View>
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>{error ?? '날씨 정보를 가져오지 못했어요'}</Text>
          <Pressable onPress={retry}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.headerRow}>{refreshButton}</View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day) => (
          <WeatherDayCard key={day.date} day={day} />
        ))}
      </ScrollView>
      {usingFallbackLocation ? (
        <Text style={styles.fallbackNotice}>
          위치 권한이 없어 서울 기준으로 보여드리고 있어요
        </Text>
      ) : null}
    </View>
  );
}

const REFRESH_BUTTON_SIZE = 28;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
    },
    refreshButton: {
      width: REFRESH_BUTTON_SIZE,
      height: REFRESH_BUTTON_SIZE,
      borderRadius: REFRESH_BUTTON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    refreshIcon: {
      fontSize: 18,
      lineHeight: 20,
      color: colors.accent,
      fontWeight: '700',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    fallbackNotice: {
      fontSize: 11,
      color: colors.textSecondary,
      marginLeft: 20,
      marginBottom: 6,
    },
    statusContainer: {
      height: 88,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    errorText: {
      color: colors.textSecondary,
      fontSize: 13,
      marginRight: 8,
    },
    retryText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
