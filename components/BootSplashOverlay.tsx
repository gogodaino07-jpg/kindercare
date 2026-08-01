import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemeColors } from '../constants/theme';
import { useThemeColors } from '../context/ThemeContext';
import Text from './common/AppText';

/**
 * Full-screen overlay shown for 3 seconds on cold boot only.
 * Optimized with absolute positioning instead of Modal for better performance.
 */
export default function BootSplashOverlay() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/splash_logo.gif')}
        style={styles.logoImage}
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
      backgroundColor: '#FEF9F0', // Matched to the provided logo's background color
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
