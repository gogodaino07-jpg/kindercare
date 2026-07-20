import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import { COLORS, SHADOW } from '../constants/theme';

export default function SaveCompleteScreen() {
  const router = useRouter();
  const { count } = useLocalSearchParams<{ count?: string }>();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.title}>{count ?? 0}건이 캘린더에 등록됐어요</Text>
          <Text style={styles.subtitle}>일정 전날 저녁에 준비물을 알려드릴게요</Text>
          <Pressable style={styles.homeButton} onPress={() => router.replace('/')}>
            <Text style={styles.homeButtonText}>홈으로 돌아가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  homeButton: {
    width: '100%',
    backgroundColor: COLORS.cardWhite,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOW,
  },
  homeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
