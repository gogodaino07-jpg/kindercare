import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/theme';
import { WeatherDay } from '../../hooks/useWeeklyWeather';

interface WeatherDayCardProps {
  day: WeatherDay;
}

export default function WeatherDayCard({ day }: WeatherDayCardProps) {
  const highlighted = day.isToday || day.isTomorrow;
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <Text style={[styles.weekday, highlighted && styles.weekdayHighlighted]}>
        {day.weekdayLabel}
      </Text>
      <Text style={styles.emoji}>{day.emoji}</Text>
      <Text style={styles.tempMax}>{day.tempMax}°</Text>
      <Text style={styles.tempMin}>{day.tempMin}°</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 46,
    alignItems: 'center',
    paddingVertical: 10,
    marginRight: 6,
    borderRadius: 14,
  },
  cardHighlighted: {
    backgroundColor: COLORS.cardWhite,
  },
  weekday: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  weekdayHighlighted: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  emoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  tempMax: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 15,
  },
  tempMin: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
});
