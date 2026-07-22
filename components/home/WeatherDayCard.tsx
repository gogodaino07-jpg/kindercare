import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { WeatherDay } from '../../hooks/useWeeklyWeather';

interface WeatherDayCardProps {
  day: WeatherDay;
}

export default function WeatherDayCard({ day }: WeatherDayCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: 46,
      alignItems: 'center',
      paddingVertical: 10,
      marginRight: 6,
      borderRadius: 14,
    },
    cardHighlighted: {
      backgroundColor: colors.cardWhite,
    },
    weekday: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    weekdayHighlighted: {
      color: colors.accent,
      fontWeight: '700',
    },
    emoji: {
      fontSize: 20,
      marginBottom: 4,
    },
    tempMax: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 15,
    },
    tempMin: {
      fontSize: 11,
      fontWeight: '400',
      color: colors.textSecondary,
      lineHeight: 14,
    },
  });
}
