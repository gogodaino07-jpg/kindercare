import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SHADOW, ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { WeatherDay } from '../../hooks/useWeeklyWeather';
import { Child } from '../../types/models';
import Text from '../common/AppText';
import HomeHeroHeader from './HomeHeroHeader';

interface HomeEmptyContentProps {
  selectedChild: Child | undefined;
  onPressChild: () => void;
  onPressMeal: () => void;
  weatherDays: WeatherDay[] | null;
  weatherLoading: boolean;
  onPressDate: (date: string) => void;
}

export default function HomeEmptyContent({
  selectedChild,
  onPressChild,
  onPressMeal,
  weatherDays,
  weatherLoading,
  onPressDate,
}: HomeEmptyContentProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.flexFill} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <HomeHeroHeader
        selectedChild={selectedChild}
        onPressChild={onPressChild}
        onPressMeal={onPressMeal}
        weatherDays={weatherDays}
        weatherLoading={weatherLoading}
        onPressDate={onPressDate}
      />

      <SectionHeader emoji="🎒" title="가방에 쏙쏙!" />
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.purpleBg }]}>
          <Text style={styles.iconCircleEmoji}>🪄</Text>
        </View>
        <Text style={styles.cardTitle}>앗, 아직 챙길 물건이 없네요!</Text>
        <Text style={styles.cardSubtitle}>
          알림장을 일일이 읽지 않아도 괜찮아요.{'\n'}AI가 똑똑하게 필요한 준비물을 찾아드릴게요!
        </Text>
        <Pressable onPress={() => router.push('/upload')}>
          <LinearGradient
            colors={[colors.purple500, colors.purpleDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scanButton}
          >
            <Text style={styles.scanButtonText}>✨ AI로 알림장 스캔하기</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <SectionHeader emoji="🗺️" title="앞으로의 모험" />
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.lightBlueBg }]}>
          <Text style={styles.iconCircleEmoji}>🏝️</Text>
        </View>
        <Text style={styles.cardTitle}>이번 주는 특별한 일정이 없어요</Text>
        <Text style={[styles.cardSubtitle, { marginBottom: 0 }]}>여유롭고 평화로운 한 주를 보내세요!</Text>
      </View>
    </ScrollView>
  );
}

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createSectionHeaderStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flexFill: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 150,
    },
    card: {
      marginHorizontal: 20,
      backgroundColor: colors.cardWhite,
      borderRadius: 24,
      paddingVertical: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
      ...SHADOW,
      shadowOpacity: 0.06,
      elevation: 2,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    iconCircleEmoji: {
      fontSize: 30,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.gray900,
      marginBottom: 8,
      textAlign: 'center',
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.gray500,
      textAlign: 'center',
      lineHeight: 19,
      fontWeight: '500',
      marginBottom: 20,
    },
    scanButton: {
      borderRadius: 999,
      paddingHorizontal: 24,
      paddingVertical: 14,
      ...SHADOW,
      shadowOpacity: 0.25,
      shadowColor: colors.purpleDeep,
      elevation: 4,
    },
    scanButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}

function createSectionHeaderStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      marginTop: 28,
      marginBottom: 12,
    },
    emoji: {
      fontSize: 18,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.gray900,
      letterSpacing: -0.3,
    },
  });
}
