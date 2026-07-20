import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS } from '../constants/theme';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Pale sky-blue background with a couple of faint cloud shapes near the top, used app-wide for a unified tone. */
export default function ScreenBackground({ children, style }: ScreenBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <View pointerEvents="none" style={styles.cloudLayer}>
        <View style={[styles.cloud, styles.cloudLarge]} />
        <View style={[styles.cloud, styles.cloudMedium]} />
        <View style={[styles.cloud, styles.cloudSmall]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.skyBackground,
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
    backgroundColor: COLORS.cloud,
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
