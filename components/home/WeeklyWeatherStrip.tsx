import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useWeeklyWeather } from '../../hooks/useWeeklyWeather';
import WeatherDayCard from './WeatherDayCard';

export default function WeeklyWeatherStrip() {
  const { days, loading, error, retry } = useWeeklyWeather();
  const [refreshingLocation, setRefreshingLocation] = useState(false);

  const handleRefreshLocation = () => {
    setRefreshingLocation(true);
    retry();
    // Brief fake "위치 업데이트 중" beat so the refresh feels intentional even
    // though the underlying retry() call usually resolves almost instantly.
    setTimeout(() => setRefreshingLocation(false), 800);
  };

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
        disabled={refreshingLocation}
      >
        {refreshingLocation ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : (
          <Text style={styles.locationIcon}>📍</Text>
        )}
      </Pressable>
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
