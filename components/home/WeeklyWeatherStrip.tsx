import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useWeeklyWeather } from '../../hooks/useWeeklyWeather';
import WeatherDayCard from './WeatherDayCard';

export default function WeeklyWeatherStrip() {
  const { days, loading, error, retry, usingFallbackLocation } = useWeeklyWeather();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshLocation = async () => {
    setRefreshing(true);
    try {
      // Real GPS re-read + Open-Meteo refetch (see hooks/useWeeklyWeather.ts) —
      // awaited so the button's spinner tracks the actual network/location call.
      await retry();
    } finally {
      setRefreshing(false);
    }
  };

  // Only block the whole strip on the very first load. Once we already have a
  // week of data, a manual refresh should update in place instead of hiding it.
  if (loading && !days) {
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
    <View>
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}
        >
          {days.map((day) => (
            <WeatherDayCard key={day.date} day={day} />
          ))}
        </ScrollView>
        <Pressable
          style={styles.locationButton}
          onPress={handleRefreshLocation}
          accessibilityLabel="현재 위치로 새로고침"
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Text style={styles.locationIcon}>📍</Text>
          )}
        </Pressable>
      </View>
      {usingFallbackLocation ? (
        <Text style={styles.fallbackNotice}>
          위치 권한이 없어 서울 기준으로 보여드리고 있어요
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingLeft: 20,
    paddingVertical: 8,
  },
  locationButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    marginLeft: 4,
  },
  locationIcon: {
    fontSize: 15,
  },
  fallbackNotice: {
    fontSize: 11,
    color: COLORS.textSecondary,
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
