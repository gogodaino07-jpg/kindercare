import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';

const CELEBRATE_GRADIENT: [string, string] = ['#6366F1', '#9333EA'];

export default function SaveCompleteScreen() {
  const router = useRouter();
  const { count } = useLocalSearchParams<{ count?: string }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScreenBackground showDots={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.card}>
            <LinearGradient
              colors={CELEBRATE_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.checkCircle}
            >
              <Text style={styles.checkIcon}>✓</Text>
            </LinearGradient>
            <Text style={styles.title}>{count ?? 0}건이 캘린더에 등록됐어요</Text>
            <Text style={styles.subtitle}>일정 전날 저녁에 준비물을 알려드릴게요</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.homeButtonWrap} onPress={() => router.replace('/')}>
            <LinearGradient
              colors={CELEBRATE_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.homeButton}
            >
              <Text style={styles.homeButtonText}>홈으로 돌아가기</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    footer: {
      paddingHorizontal: 28,
      paddingBottom: 32,
    },
    card: {
      width: '100%',
      backgroundColor: colors.cardWhite,
      borderRadius: 32,
      paddingVertical: 40,
      paddingHorizontal: 28,
      alignItems: 'center',
      overflow: 'hidden',
      ...SHADOW,
      shadowOpacity: 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    checkCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      shadowColor: '#7C3AED',
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    checkIcon: {
      color: '#FFFFFF',
      fontSize: 30,
      fontWeight: '800',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    homeButtonWrap: {
      width: '100%',
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: '#7C3AED',
      shadowOpacity: 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    homeButton: {
      width: '100%',
      paddingVertical: 17,
      alignItems: 'center',
    },
    homeButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
