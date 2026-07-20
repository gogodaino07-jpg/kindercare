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
      <Text style={styles.temp}>
        {day.tempMax}° <Text style={styles.tempMin}>{day.tempMin}°</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 60,
    alignItems: 'center',
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 16,
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
  temp: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tempMin: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
});
