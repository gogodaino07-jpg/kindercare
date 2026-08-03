import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../components/common/AppText';
import { ThemeColors } from '../constants/theme';
import { useAppData } from '../context/AppDataContext';
import { useThemeColors } from '../context/ThemeContext';

export default function SplashPage() {
  const router = useRouter();
  const { hasOnboarded, googleAccount, onboardingLoaded } = useAppData();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!onboardingLoaded) return;

    // onboardingLoaded가 완료되면 즉시 분기 처리합니다.
    if (hasOnboarded && googleAccount) {
      router.replace('/');
    } else {
      router.replace('/onboarding');
    }
  }, [router, onboardingLoaded, hasOnboarded, googleAccount]);

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../assets/splash_logo.gif')}
        style={styles.logoImage}
        resizeMode="contain"
      />
      <Text style={styles.tagline}>우리 아이 유치원 소식, 놓치지 마세요</Text>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FEF9F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoImage: {
      width: 240,
      height: 240,
      marginBottom: 20,
    },
    tagline: {
      marginTop: -10,
      fontSize: 14,
      fontWeight: '700',
      color: '#71717A',
    },
  });
}
