import React, { useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeColors } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';

interface OnboardingBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Warm cream-beige background shared by the onboarding-chain screens (slides, family group, verify phone, child setup). */
export default function OnboardingBackground({ children, style }: OnboardingBackgroundProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.creamBeige,
    },
  });
}
