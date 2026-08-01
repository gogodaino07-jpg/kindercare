import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useThemeColors } from '../context/ThemeContext';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  hidePattern?: boolean;
}

/** Pale sky-blue background with a couple of faint cloud shapes near the top, used app-wide for a unified tone. */
export default function ScreenBackground({ children, style, hidePattern = false }: ScreenBackgroundProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]}>
      {!hidePattern && (
        <View pointerEvents="none" style={styles.cloudLayer}>
          <View style={[styles.cloud, styles.cloudLarge]} />
          <View style={[styles.cloud, styles.cloudMedium]} />
          <View style={[styles.cloud, styles.cloudSmall]} />
        </View>
      )}
      {children}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.skyBackground,
    },
    cloudLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 180,
      overflow: 'hidden',
    },
    cloud: {
      position: 'absolute',
      backgroundColor: colors.cloud,
      opacity: 0.35,
      borderRadius: 999,
    },
    cloudLarge: {
      width: 260,
      height: 90,
      top: -40,
      left: -60,
    },
    cloudMedium: {
      width: 180,
      height: 70,
      top: -10,
      right: -50,
    },
    cloudSmall: {
      width: 140,
      height: 50,
      top: 60,
      left: 100,
      opacity: 0.25,
    },
  });
}
