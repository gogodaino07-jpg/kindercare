import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { WeatherDay } from '../../hooks/useWeeklyWeather';
import { describeGuideTip } from '../../utils/weatherCode';
import WeatherDayCard from './WeatherDayCard';
import Text from '../common/AppText';

interface WeeklyWeatherStripProps {
  days: WeatherDay[] | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  usingFallbackLocation: boolean;
}

export default function WeeklyWeatherStrip({
  days,
  loading,
  error,
  retry,
  usingFallbackLocation,
}: WeeklyWeatherStripProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const todayDay = days?.find((d) => d.isToday);
  const todayLabel = todayDay?.label;

  if (loading && !days) {
    return (
      <View style={styles.wrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (error || !days) {
    return (
      <View style={styles.wrapper}>
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
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day) => (
          <WeatherDayCard key={day.date} day={day} />
        ))}
      </ScrollView>

      {todayLabel ? (
        <View style={styles.summaryBox}>
          <MaterialIcons name="cloud" size={20} color={colors.blue500} />
          <Text style={styles.summaryText}>{describeGuideTip(todayLabel)}</Text>
        </View>
      ) : null}

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
    wrapper: {
      paddingBottom: 4,
    },
    scrollContent: {
      paddingHorizontal: 16,
      gap: 12,
    },
    summaryBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.lightBlueBg,
      borderWidth: 1,
      borderColor: colors.blue100,
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 8, // Adjusted: slightly reduced from original 16
      padding: 12,
    },
    summaryText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.gray900,
      marginLeft: 8,
    },
    fallbackNotice: {
      fontSize: 11,
      color: colors.gray900,
      marginLeft: 16,
      marginTop: 6,
    },
    statusContainer: {
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    errorText: {
      color: colors.gray500,
      fontSize: 13,
      marginRight: 8,
    },
    retryText: {
      color: colors.blue500,
      fontSize: 13,
      fontWeight: '600',
    },
    skeletonCard: {
      width: 68, // Adjusted
      height: 98, // Adjusted
      backgroundColor: colors.gray100,
      borderRadius: 18,
    },
  });
}
