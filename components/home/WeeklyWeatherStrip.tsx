import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useWeeklyWeather } from '../../hooks/useWeeklyWeather';
import WeatherDayCard from './WeatherDayCard';

export default function WeeklyWeatherStrip() {
  const { days, loading, error, retry } = useWeeklyWeather();

  if (loading) {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator color={COLORS.accent} />
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {days.map((day) => (
        <WeatherDayCard key={day.date} day={day} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  statusContainer: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginRight: 8,
  },
  retryText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
