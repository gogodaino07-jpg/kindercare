import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import OnboardingBackground from '../components/onboarding/OnboardingBackground';
import Text from '../components/common/AppText';
import { SHADOW, ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export default function GoogleSignInScreen() {
  const router = useRouter();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const { completeOnboarding, signInWithGoogle } = useAppData();
  const { showToast } = useToast();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);

    if (flow === 'join') {
      // Joining an existing family group ➔ treated as a returning user:
      // skip child-profile setup and sync straight into the shared data.
      completeOnboarding();
      showToast('☁️ 클라우드 데이터를 자동 동기화했어요');
      router.dismissAll();
      router.replace('/');
      return;
    }
    // New family group ➔ new user: register the first child profile.
    router.push('/onboarding-child-setup');
  };

  return (
    <OnboardingBackground>
      <Pressable style={styles.backButton} hitSlop={8} onPress={() => router.back()}>
        <Text style={styles.backIcon}>‹</Text>
      </Pressable>

      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🐥</Text>
        </View>
        <Text style={styles.title}>Kindercare 시작하기</Text>
        <Text style={styles.subtitle}>Google 계정으로 1초 만에 시작하세요</Text>

        <Pressable
          style={[styles.googleButton, loading && styles.googleButtonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Google 계정으로 1초 만에 시작하기</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </Text>
      </View>
    </OnboardingBackground>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
      marginTop: 4,
    },
    backIcon: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    logoCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.creamBeigeCard,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      ...SHADOW,
    },
    logoIcon: {
      fontSize: 42,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 36,
      textAlign: 'center',
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      ...SHADOW,
    },
    googleButtonDisabled: {
      opacity: 0.7,
    },
    googleBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#4285F4',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    googleBadgeText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    googleButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1F1F1F',
    },
    disclaimer: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 18,
      lineHeight: 16,
    },
  });
}
