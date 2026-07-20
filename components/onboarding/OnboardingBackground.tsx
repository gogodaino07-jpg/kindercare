import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';

interface OnboardingBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Warm cream-beige background shared by the onboarding-chain screens (slides, family group, verify phone, child setup). */
export default function OnboardingBackground({ children, style }: OnboardingBackgroundProps) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.creamBeige,
  },
});
