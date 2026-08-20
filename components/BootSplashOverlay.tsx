import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { STAMP_BOARD_THEMES } from '../constants/stampBoardThemes';
import { ThemeColors } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import Text from './common/AppText';

const BG_GRADIENT = STAMP_BOARD_THEMES.blue.bgGradient;

/**
 * Full-screen overlay shown for 3 seconds on cold boot only.
 * Optimized with absolute positioning instead of Modal for better performance.
 */
export default function BootSplashOverlay() {
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={BG_GRADIENT} style={StyleSheet.absoluteFill} />
      <Animated.Image
        source={require('../assets/logo_pure_chick_transparent.png')}
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
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#E0F2FE',
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
      color: '#64748B',
    },
  });
}
