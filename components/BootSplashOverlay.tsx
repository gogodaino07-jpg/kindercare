import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemeColors } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import Text from './common/AppText';

/**
 * Full-screen overlay shown for a couple seconds on cold boot and again on
 * every background→active resume — distinct from the routed /splash screen,
 * which only appears once, on the way into onboarding.
 */
export default function BootSplashOverlay() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container} pointerEvents="auto">
      <View style={styles.logoCircle}>
        <Text style={styles.logoIcon}>🐥</Text>
      </View>
      <Text style={styles.logoText}>
        kinder<Text style={styles.logoTextAccent}>care</Text>
      </Text>
      <Text style={styles.tagline}>우리 아이 유치원 소식, 놓치지 마세요</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2000,
      backgroundColor: colors.peachOrange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.creamBeigeCard,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    logoIcon: {
      fontSize: 48,
    },
    logoText: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    logoTextAccent: {
      color: colors.coralPink,
    },
    tagline: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.9)',
    },
  });
}
