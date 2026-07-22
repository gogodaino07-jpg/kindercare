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

  if (loading && !days) {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !days) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.errorText}>{error ?? '날씨 정보를 가져오지 못했어요'}</Text>
        <Pressable onPress={retry}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
