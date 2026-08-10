import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
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

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Floating movement (up and down)
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse effect (scale slightly)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel([float, pulse]).start();

    return () => {
      floatAnim.stopAnimation();
      pulseAnim.stopAnimation();
    };
  }, []);

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
      <Animated.Image
        source={require('../assets/logo_pure_chick.png')}
        style={[
          styles.logoImage,
          {
            transform: [
              { translateY: floatAnim },
              { scale: pulseAnim }
            ]
          }
        ]}
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
      backgroundColor: '#FFFFFF',
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
