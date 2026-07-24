import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../common/AppText';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { WeatherDay } from '../../hooks/useWeeklyWeather';

interface WeatherDayCardProps {
  day: WeatherDay;
}

export default function WeatherDayCard({ day }: WeatherDayCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrapper}>
      {day.isToday ? (
        <View style={styles.todayBadge}>
          <Text style={styles.todayBadgeText}>오늘</Text>
        </View>
      ) : (
        <View style={styles.todayBadgeSpacer} />
      )}
      <View style={[styles.card, day.isToday && styles.cardToday]}>
        <Text style={[styles.weekday, day.isTomorrow && styles.weekdayTomorrow]}>
          {day.weekdayLabel}
        </Text>
        <Text style={styles.emoji}>{day.emoji}</Text>
        <Text style={[styles.tempMax, day.isToday && styles.tempMaxToday]}>{day.tempMax}°</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      width: 56,
      alignItems: 'center',
      marginRight: 6,
    },
    todayBadge: {
      backgroundColor: '#DCEBFB',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginBottom: 4,
    },
    todayBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.accent,
    },
    todayBadgeSpacer: {
      height: 17,
    },
    card: {
      width: '100%',
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 14,
    },
    cardToday: {
      backgroundColor: colors.cardWhite,
      ...SHADOW,
    },
    weekday: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    weekdayTomorrow: {
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
    tempMaxToday: {
      color: colors.accent,
    },
  });
}
