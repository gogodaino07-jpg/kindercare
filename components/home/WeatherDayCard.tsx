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

  const badgeText = day.isToday ? '오늘' : day.weekdayLabel.split('(')[1].replace(')', '');
  const displayDate = day.weekdayLabel;

  return (
    <View style={styles.container}>
      <View style={[
        styles.card,
        day.isToday ? styles.todayCard : styles.futureCard
      ]}>
        <Text style={[
          styles.dateText,
          day.isToday ? styles.todayText : styles.futureDateText
        ]}>
          {displayDate}
        </Text>
        <Text style={styles.emoji}>{day.emoji}</Text>
        <Text style={[
          styles.tempText,
          day.isToday ? styles.todayText : styles.futureTempText
        ]}>
          {day.tempMax}°
        </Text>
      </View>

      <View style={[
        styles.badge,
        day.isToday ? styles.todayBadge : styles.futureBadge
      ]}>
        <Text style={[
          styles.badgeText,
          day.isToday ? styles.todayBadgeText : styles.futureBadgeText
        ]}>
          {badgeText}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      width: 68, // Adjusted: slightly smaller than original 72
      height: 114, // Adjusted: slightly smaller than original 120
      alignItems: 'center',
    },
    card: {
      width: 68, // Adjusted
      height: 98, // Adjusted: slightly smaller than original 104
      marginTop: 10,
      borderRadius: 18,
      borderWidth: 1,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
    },
    todayCard: {
      borderColor: colors.blue500,
    },
    futureCard: {
      borderColor: colors.gray100,
    },
    dateText: {
      fontSize: 11, // Reduced from 12
      marginBottom: 0,
    },
    todayText: {
      color: colors.blue500,
      fontWeight: '600',
    },
    futureDateText: {
      color: colors.gray600,
    },
    emoji: {
      fontSize: 24, // Reduced from 28
      marginVertical: 0,
    },
    tempText: {
      fontSize: 13, // Reduced from 14
      fontWeight: '700',
    },
    futureTempText: {
      color: colors.gray500,
      fontWeight: '500',
    },
    badge: {
      position: 'absolute',
      top: 0,
      zIndex: 10,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    todayBadge: {
      backgroundColor: colors.blue500,
    },
    futureBadge: {
      backgroundColor: colors.gray100,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    todayBadgeText: {
      color: '#FFFFFF',
    },
    futureBadgeText: {
      color: colors.gray500,
    },
  });
}
