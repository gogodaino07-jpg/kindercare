import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/theme';

interface OnboardingBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Warm cream-beige background shared by the onboarding-chain screens (slides, family group, verify phone, child setup). */
export default function OnboardingBackground({ children, style }: OnboardingBackgroundProps) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.creamBeige,
  },
});
